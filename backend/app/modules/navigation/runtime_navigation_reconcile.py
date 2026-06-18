"""Reconcile duplicate / broken runtime navigation items for a tenant."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_protected_pages import (
    RUNTIME_PROTECTED_SYSTEM_KEYS,
    RUNTIME_PROTECTED_TITLE_TO_SYSTEM_KEY,
    _pick_backfill_winner,
    apply_runtime_protected_nav_flags,
    backfill_runtime_protected_navigation,
    is_runtime_menu_scope,
    is_runtime_protected_nav_item,
    resolve_system_key_for_runtime_protected_title,
)
from app.modules.pages.models import Page

NAV_TRASH_ARTIFACT_TITLE_RE = re.compile(r"^Nav [0-9a-f]{8}$", re.IGNORECASE)
TRASH_PURGE_PAGE_TITLE_PREFIX = "Trash purge page "


@dataclass
class NavigationRepairAction:
    nav_id: int
    title: str
    system_key: str | None
    page_id: int | None
    action: str
    reason: str
    canonical_nav_id: int | None = None


@dataclass
class NavigationRepairPlan:
    portal_id: int
    actions: list[NavigationRepairAction] = field(default_factory=list)

    @property
    def hide_count(self) -> int:
        return sum(1 for action in self.actions if action.action == "hide")

    @property
    def flag_count(self) -> int:
        return sum(1 for action in self.actions if action.action == "apply_flags")


def _runtime_nav_query(db: Session, portal_id: int):
    return (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.menu_scope == "runtime",
        )
    )


def resolve_runtime_protected_system_key(nav: NavigationItem) -> str | None:
    explicit = str(nav.system_key or "").strip()
    if explicit in RUNTIME_PROTECTED_SYSTEM_KEYS:
        return explicit
    if not is_runtime_protected_nav_item(nav):
        return None
    return resolve_system_key_for_runtime_protected_title(nav.title)


def find_canonical_runtime_protected_nav(
    db: Session,
    *,
    portal_id: int,
    system_key: str,
) -> NavigationItem | None:
    keyed = (
        _runtime_nav_query(db, portal_id)
        .filter(
            NavigationItem.system_key == system_key,
            NavigationItem.page_id.isnot(None),
        )
        .all()
    )
    if keyed:
        return _pick_backfill_winner(keyed)

    title_candidates = [
        title
        for title, mapped_key in RUNTIME_PROTECTED_TITLE_TO_SYSTEM_KEY.items()
        if mapped_key == system_key
    ]
    if not title_candidates:
        return None

    matched = (
        _runtime_nav_query(db, portal_id)
        .filter(
            NavigationItem.page_id.isnot(None),
            NavigationItem.title.in_(title_candidates),
        )
        .all()
    )
    if not matched:
        return None

    return _pick_backfill_winner(matched)


def is_broken_runtime_nav_artifact(nav: NavigationItem, page: Page | None) -> bool:
    if nav.deleted_at is not None or not is_runtime_menu_scope(nav.menu_scope):
        return False
    if nav.is_protected and nav.system_key in RUNTIME_PROTECTED_SYSTEM_KEYS:
        return False

    title = str(nav.title or "").strip()
    if NAV_TRASH_ARTIFACT_TITLE_RE.match(title):
        return True

    if page is not None and str(page.title or "").startswith(TRASH_PURGE_PAGE_TITLE_PREFIX):
        return True

    return False


def build_runtime_navigation_repair_plan(
    db: Session,
    *,
    portal_id: int,
) -> NavigationRepairPlan:
    plan = NavigationRepairPlan(portal_id=portal_id)

    for system_key in sorted(RUNTIME_PROTECTED_SYSTEM_KEYS):
        canonical = find_canonical_runtime_protected_nav(
            db,
            portal_id=portal_id,
            system_key=system_key,
        )
        if canonical is None:
            continue

        if apply_runtime_protected_nav_flags(canonical):
            plan.actions.append(
                NavigationRepairAction(
                    nav_id=int(canonical.id),
                    title=str(canonical.title or ""),
                    system_key=canonical.system_key,
                    page_id=canonical.page_id,
                    action="apply_flags",
                    reason=f"canonical owner for {system_key}",
                    canonical_nav_id=int(canonical.id),
                ),
            )

        candidates = (
            _runtime_nav_query(db, portal_id)
            .filter(NavigationItem.page_id.isnot(None))
            .all()
        )
        for nav in candidates:
            mapped_key = resolve_runtime_protected_system_key(nav)
            if mapped_key != system_key:
                continue
            if int(nav.id) == int(canonical.id):
                continue
            if nav.is_visible is not True:
                continue

            plan.actions.append(
                NavigationRepairAction(
                    nav_id=int(nav.id),
                    title=str(nav.title or ""),
                    system_key=nav.system_key,
                    page_id=nav.page_id,
                    action="hide",
                    reason=f"duplicate of canonical {canonical.id} ({system_key})",
                    canonical_nav_id=int(canonical.id),
                ),
            )

    pages_by_id = {
        int(page.id): page
        for page in db.query(Page).filter(Page.portal_id == portal_id).all()
    }

    for nav in _runtime_nav_query(db, portal_id).all():
        page = pages_by_id.get(int(nav.page_id)) if nav.page_id is not None else None
        if not is_broken_runtime_nav_artifact(nav, page):
            continue
        if nav.is_visible is not True:
            continue

        plan.actions.append(
            NavigationRepairAction(
                nav_id=int(nav.id),
                title=str(nav.title or ""),
                system_key=nav.system_key,
                page_id=nav.page_id,
                action="hide",
                reason="broken runtime nav artifact (trash purge test residue)",
            ),
        )

    return plan


def apply_runtime_navigation_repair_plan(
    db: Session,
    plan: NavigationRepairPlan,
) -> int:
    changed = 0
    nav_ids = {action.nav_id for action in plan.actions}

    nav_by_id = {
        int(nav.id): nav
        for nav in db.query(NavigationItem).filter(NavigationItem.id.in_(nav_ids)).all()
    }

    for action in plan.actions:
        nav = nav_by_id.get(action.nav_id)
        if nav is None:
            continue

        if action.action == "apply_flags":
            if apply_runtime_protected_nav_flags(nav):
                changed += 1
            continue

        if action.action == "hide" and nav.is_visible is True:
            nav.is_visible = False
            changed += 1

    if changed:
        db.flush()

    return changed


def reconcile_runtime_navigation(
    db: Session,
    *,
    portal_id: int,
    apply: bool = False,
) -> NavigationRepairPlan:
    backfill_runtime_protected_navigation(db, portal_id=portal_id)
    plan = build_runtime_navigation_repair_plan(db, portal_id=portal_id)

    if apply:
        apply_runtime_navigation_repair_plan(db, plan)

    return plan
