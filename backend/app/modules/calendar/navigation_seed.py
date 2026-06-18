"""Ensure runtime calendar navigation exists for a tenant."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_protected_pages import (
    RUNTIME_MENU_SCOPE,
    apply_runtime_protected_nav_flags,
)
from app.modules.pages.models import Page

CALENDAR_NAV_TITLE = "Календарь"
CALENDAR_SYSTEM_KEY = "runtime.calendar"


def _hide_other_runtime_calendar_navs(
    db: Session,
    *,
    portal_id: int,
    canonical_id: int,
) -> int:
    hidden = 0
    others = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.menu_scope == RUNTIME_MENU_SCOPE,
            NavigationItem.id != canonical_id,
            NavigationItem.title == CALENDAR_NAV_TITLE,
            NavigationItem.page_id.isnot(None),
        )
        .all()
    )
    for nav in others:
        if nav.is_visible is True:
            nav.is_visible = False
            hidden += 1
    if hidden:
        db.flush()
    return hidden


def _find_chat_nav(db: Session, portal_id: int) -> NavigationItem | None:
    return (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.system_key == "runtime.chat",
        )
        .first()
    )


def ensure_runtime_calendar_navigation(db: Session, *, portal_id: int) -> bool:
    """Create calendar page + nav when missing. Returns True if created."""
    existing = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.system_key == CALENDAR_SYSTEM_KEY,
        )
        .first()
    )
    if existing is not None:
        apply_runtime_protected_nav_flags(existing)
        _hide_other_runtime_calendar_navs(db, portal_id=portal_id, canonical_id=int(existing.id))
        return False

    title_match = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.title == CALENDAR_NAV_TITLE,
            NavigationItem.page_id.isnot(None),
        )
        .first()
    )
    if title_match is not None:
        apply_runtime_protected_nav_flags(title_match)
        _hide_other_runtime_calendar_navs(db, portal_id=portal_id, canonical_id=int(title_match.id))
        return False

    chat_nav = _find_chat_nav(db, portal_id)
    parent_id = chat_nav.parent_id if chat_nav else None
    sort_order = (chat_nav.sort_order or 0) + 1 if chat_nav else 0

    page = Page(
        portal_id=portal_id,
        title=CALENDAR_NAV_TITLE,
        status="published",
        is_visible=True,
        sort_order=sort_order,
    )
    db.add(page)
    db.flush()

    nav = NavigationItem(
        portal_id=portal_id,
        parent_id=parent_id,
        type="page",
        title=CALENDAR_NAV_TITLE,
        page_id=page.id,
        sort_order=sort_order,
        is_visible=True,
        menu_scope=RUNTIME_MENU_SCOPE,
        system_key=CALENDAR_SYSTEM_KEY,
        is_system=True,
        is_protected=True,
    )
    db.add(nav)
    db.flush()
    _hide_other_runtime_calendar_navs(db, portal_id=portal_id, canonical_id=int(nav.id))
    return True


def backfill_runtime_calendar_navigation(db: Session, *, portal_id: int | None = None) -> int:
    query = db.query(NavigationItem.portal_id).filter(NavigationItem.deleted_at.is_(None))
    if portal_id is not None:
        query = query.filter(NavigationItem.portal_id == portal_id)

    portal_ids = sorted({row[0] for row in query.distinct().all()})
    created = 0
    for tenant_id in portal_ids:
        if ensure_runtime_calendar_navigation(db, portal_id=int(tenant_id)):
            created += 1
    if created:
        db.flush()
    return created
