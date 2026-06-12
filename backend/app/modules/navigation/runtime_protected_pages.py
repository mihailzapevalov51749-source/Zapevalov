"""Runtime office navigation items that must not be deleted (Главная, Чат, Уведомления)."""

from __future__ import annotations

from collections import defaultdict

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem

RUNTIME_MENU_SCOPE = "runtime"

RUNTIME_PROTECTED_TITLE_TO_SYSTEM_KEY: dict[str, str] = {
    "Главная офиса": "runtime.office_home",
    "Главная": "runtime.office_home",
    "Чат": "runtime.chat",
    "Уведомления": "runtime.notifications",
}

RUNTIME_PROTECTED_SYSTEM_KEYS: frozenset[str] = frozenset(
    RUNTIME_PROTECTED_TITLE_TO_SYSTEM_KEY.values(),
)


def normalize_menu_scope(value: str | None) -> str:
    return str(value or "").strip().lower()


def is_runtime_menu_scope(menu_scope: str | None) -> bool:
    return normalize_menu_scope(menu_scope) == RUNTIME_MENU_SCOPE


def resolve_system_key_for_runtime_protected_title(title: str | None) -> str | None:
    return RUNTIME_PROTECTED_TITLE_TO_SYSTEM_KEY.get(str(title or "").strip())


def is_runtime_protected_nav_item(nav: NavigationItem) -> bool:
    if nav.deleted_at is not None:
        return False
    if not is_runtime_menu_scope(nav.menu_scope):
        return False
    if nav.page_id is None:
        return False
    return resolve_system_key_for_runtime_protected_title(nav.title) is not None


def apply_runtime_protected_nav_flags(nav: NavigationItem) -> bool:
    """Set system_key / is_system / is_protected on a runtime protected nav item."""
    if not is_runtime_protected_nav_item(nav):
        return False

    system_key = resolve_system_key_for_runtime_protected_title(nav.title)
    if not system_key:
        return False

    changed = False
    if nav.system_key != system_key:
        nav.system_key = system_key
        changed = True
    if nav.is_system is not True:
        nav.is_system = True
        changed = True
    if nav.is_protected is not True:
        nav.is_protected = True
        changed = True
    return changed


def _pick_backfill_winner(candidates: list[NavigationItem]) -> NavigationItem:
    keyed = [
        nav
        for nav in candidates
        if nav.system_key
        in RUNTIME_PROTECTED_SYSTEM_KEYS
    ]
    if keyed:
        return min(keyed, key=lambda nav: (nav.sort_order or 0, nav.id))
    return min(candidates, key=lambda nav: (nav.sort_order or 0, nav.id))


def _system_key_taken(
    db: Session,
    *,
    portal_id: int,
    system_key: str,
    except_nav_id: int | None,
) -> bool:
    query = (
        db.query(NavigationItem.id)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.system_key == system_key,
            NavigationItem.deleted_at.is_(None),
        )
    )
    if except_nav_id is not None:
        query = query.filter(NavigationItem.id != except_nav_id)
    return query.first() is not None


def backfill_runtime_protected_navigation(
    db: Session,
    *,
    portal_id: int | None = None,
) -> int:
    """
    Backfill system_key / is_system / is_protected for existing runtime office nav.

    For each portal and protected system_key, updates at most one navigation item:
    runtime scope, page_id set, title matches a protected runtime title.
    Skips when the system_key is already owned by another active nav item.
    """
    query = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.deleted_at.is_(None),
            NavigationItem.page_id.isnot(None),
        )
    )
    if portal_id is not None:
        query = query.filter(NavigationItem.portal_id == portal_id)

    grouped: dict[tuple[int, str], list[NavigationItem]] = defaultdict(list)
    for nav in query.all():
        if not is_runtime_protected_nav_item(nav):
            continue
        system_key = resolve_system_key_for_runtime_protected_title(nav.title)
        if not system_key:
            continue
        grouped[(int(nav.portal_id), system_key)].append(nav)

    updated = 0
    for (tenant_id, system_key), candidates in grouped.items():
        winner = _pick_backfill_winner(candidates)
        if _system_key_taken(
            db,
            portal_id=tenant_id,
            system_key=system_key,
            except_nav_id=int(winner.id),
        ):
            continue
        if apply_runtime_protected_nav_flags(winner):
            updated += 1

    if updated:
        db.flush()

    return updated
