"""Protected platform pages that must not be deleted from Studio or trash."""

from __future__ import annotations

from typing import Literal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_protected_pages import (
    RUNTIME_MENU_SCOPE,
    is_runtime_menu_scope,
    is_runtime_protected_nav_item,
    resolve_system_key_for_runtime_protected_title,
)
from app.modules.pages.models import Page

ProtectedPageKey = Literal["office_home", "chat", "notifications", "calendar"]

PROTECTED_PAGE_DELETE_MESSAGE = "Системную страницу нельзя удалить."
PROTECTED_PAGE_HARD_DELETE_MESSAGE = "Системную страницу нельзя удалить окончательно"

# Preferred stable keys on runtime navigation items (when present in DB).
PROTECTED_NAV_SYSTEM_KEYS: dict[str, ProtectedPageKey] = {
    "runtime.office_home": "office_home",
    "office.home": "office_home",
    "runtime.chat": "chat",
    "runtime.notifications": "notifications",
    "runtime.calendar": "calendar",
}


def _normalize_key(value: str | None) -> str:
    return str(value or "").strip().lower()


def _protected_key_from_system_key(system_key: str | None) -> ProtectedPageKey | None:
    return PROTECTED_NAV_SYSTEM_KEYS.get(_normalize_key(system_key))


def _protected_key_from_runtime_nav(nav: NavigationItem) -> ProtectedPageKey | None:
    """Recognize protected page via runtime nav, including legacy rows without flags."""
    if not is_runtime_protected_nav_item(nav):
        return None

    explicit = _protected_key_from_system_key(nav.system_key)
    if explicit is not None:
        return explicit

    derived_key = resolve_system_key_for_runtime_protected_title(nav.title)
    if derived_key is None:
        return None
    return _protected_key_from_system_key(derived_key)


def _navigation_items_for_page(db: Session, *, tenant_id: int, page_id: int) -> list[NavigationItem]:
    return (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.page_id == page_id,
        )
        .all()
    )


def resolve_protected_page_key(
    db: Session,
    *,
    tenant_id: int,
    page: Page,
) -> ProtectedPageKey | None:
    """Return protected page key when page is infrastructure, else None."""
    nav_items = _navigation_items_for_page(db, tenant_id=tenant_id, page_id=int(page.id))

    for nav in nav_items:
        if nav.deleted_at is not None:
            continue

        protected_key = _protected_key_from_runtime_nav(nav)
        if protected_key is not None:
            return protected_key

        if not is_runtime_menu_scope(nav.menu_scope):
            continue
        if not (nav.is_protected or nav.is_system):
            continue

        explicit = _protected_key_from_system_key(nav.system_key)
        if explicit is not None:
            return explicit

    return None


def is_protected_page(db: Session, *, tenant_id: int, page: Page) -> bool:
    return resolve_protected_page_key(db, tenant_id=tenant_id, page=page) is not None


def assert_page_deletion_allowed(
    db: Session,
    *,
    tenant_id: int,
    page: Page,
    hard_delete: bool = False,
) -> None:
    if not is_protected_page(db, tenant_id=tenant_id, page=page):
        return

    message = PROTECTED_PAGE_HARD_DELETE_MESSAGE if hard_delete else PROTECTED_PAGE_DELETE_MESSAGE
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "message": "Удаление запрещено",
            "reason": "protected_page",
            "detail": message,
        },
    )
