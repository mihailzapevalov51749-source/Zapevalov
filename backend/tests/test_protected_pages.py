"""Tests for protected platform pages that cannot be deleted."""

from __future__ import annotations

import uuid

import app.modules.portals.models  # noqa: F401 — register portals table for ORM metadata

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_protected_pages import (
    backfill_runtime_protected_navigation,
)
from app.modules.pages.models import Page
from app.modules.portals.models import Portal
from app.modules.pages.protected_pages import (
    PROTECTED_PAGE_DELETE_MESSAGE,
    PROTECTED_PAGE_HARD_DELETE_MESSAGE,
    is_protected_page,
    resolve_protected_page_key,
)
from app.modules.pages import repository as pages_repository
from app.modules.platform.designer.shared.soft_delete import apply_soft_delete
from app.modules.platform.designer.trash.bulk_purge import execute_planned_bulk_purge
from app.modules.platform.designer.trash.schemas import TrashItemRef
from app.modules.platform.designer.trash.service import (
    check_purge_allowed,
    purge_trash_bulk,
    purge_trash_item,
    restore_trash_item,
)


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _create_runtime_nav_page(
    db: Session,
    *,
    tenant_id: int,
    title: str,
    system_key: str | None = None,
    is_system: bool = False,
    is_protected: bool = False,
    menu_scope: str = "runtime",
) -> Page:
    page = Page(portal_id=tenant_id, title=title)
    db.add(page)
    db.flush()

    db.add(
        NavigationItem(
            portal_id=tenant_id,
            type="page",
            title=title,
            page_id=page.id,
            menu_scope=menu_scope,
            system_key=system_key,
            is_system=is_system,
            is_protected=is_protected,
        ),
    )
    db.flush()
    return page


def _create_legacy_runtime_protected_page(db: Session, *, tenant_id: int, title: str) -> Page:
    return _create_runtime_nav_page(
        db,
        tenant_id=tenant_id,
        title=title,
        system_key=None,
        is_system=False,
        is_protected=False,
        menu_scope="runtime",
    )


def _assert_soft_delete_blocked(db: Session, page: Page, *, tenant_id: int = 1) -> None:
    assert is_protected_page(db, tenant_id=tenant_id, page=page)

    with pytest.raises(HTTPException) as exc_info:
        pages_repository.delete_page(db, page.id, deleted_by=None)

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["reason"] == "protected_page"
    assert exc_info.value.detail["detail"] == PROTECTED_PAGE_DELETE_MESSAGE
    db.refresh(page)
    assert page.deleted_at is None


def test_runtime_home_page_without_flags_is_protected_by_fallback(db: Session) -> None:
    tenant_id = 1
    page = _create_legacy_runtime_protected_page(db, tenant_id=tenant_id, title="Главная")
    assert resolve_protected_page_key(db, tenant_id=tenant_id, page=page) == "office_home"
    _assert_soft_delete_blocked(db, page, tenant_id=tenant_id)


def test_runtime_chat_page_without_flags_is_protected_by_fallback(db: Session) -> None:
    tenant_id = 1
    page = _create_legacy_runtime_protected_page(db, tenant_id=tenant_id, title="Чат")
    assert resolve_protected_page_key(db, tenant_id=tenant_id, page=page) == "chat"
    _assert_soft_delete_blocked(db, page, tenant_id=tenant_id)


def test_runtime_notifications_page_without_flags_is_protected_by_fallback(db: Session) -> None:
    tenant_id = 1
    page = _create_legacy_runtime_protected_page(db, tenant_id=tenant_id, title="Уведомления")
    assert resolve_protected_page_key(db, tenant_id=tenant_id, page=page) == "notifications"
    _assert_soft_delete_blocked(db, page, tenant_id=tenant_id)


def test_regular_page_named_chat_without_runtime_nav_can_be_deleted(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page = Page(portal_id=tenant_id, title=f"Чат {suffix}")
    db.add(page)
    db.flush()

    assert not is_protected_page(db, tenant_id=tenant_id, page=page)

    deleted = pages_repository.delete_page(db, page.id, deleted_by=None)
    assert deleted is not None
    assert deleted.deleted_at is not None


def test_designer_nav_named_chat_does_not_protect_page(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page = Page(portal_id=tenant_id, title=f"Чат designer {suffix}")
    db.add(page)
    db.flush()

    db.add(
        NavigationItem(
            portal_id=tenant_id,
            type="page",
            title="Чат",
            page_id=page.id,
            menu_scope="designer",
            system_key=None,
            is_system=False,
            is_protected=False,
        ),
    )
    db.flush()

    assert not is_protected_page(db, tenant_id=tenant_id, page=page)

    deleted = pages_repository.delete_page(db, page.id, deleted_by=None)
    assert deleted is not None
    assert deleted.deleted_at is not None


def test_backfill_sets_system_key_and_flags_for_runtime_nav(db: Session) -> None:
    suffix = _suffix()
    portal = Portal(name=f"Protected backfill {suffix}", code=f"prot-{suffix}")
    db.add(portal)
    db.flush()
    tenant_id = int(portal.id)

    page = _create_legacy_runtime_protected_page(db, tenant_id=tenant_id, title="Чат")
    nav = (
        db.query(NavigationItem)
        .filter(NavigationItem.page_id == page.id, NavigationItem.portal_id == tenant_id)
        .one()
    )
    assert nav.system_key is None
    assert nav.is_system is False
    assert nav.is_protected is False

    updated = backfill_runtime_protected_navigation(db, portal_id=tenant_id)
    assert updated >= 1
    db.refresh(nav)

    assert nav.system_key == "runtime.chat"
    assert nav.is_system is True
    assert nav.is_protected is True


def test_protected_office_home_page_cannot_be_soft_deleted(db: Session) -> None:
    page = _create_runtime_nav_page(
        db,
        tenant_id=1,
        title="Главная офиса",
        system_key="runtime.office_home",
        is_system=True,
        is_protected=True,
    )
    _assert_soft_delete_blocked(db, page)


def test_protected_chat_page_cannot_be_soft_deleted(db: Session) -> None:
    page = _create_runtime_nav_page(
        db,
        tenant_id=1,
        title="Чат",
        system_key="runtime.chat",
        is_system=True,
        is_protected=True,
    )
    _assert_soft_delete_blocked(db, page)


def test_protected_notifications_page_cannot_be_soft_deleted(db: Session) -> None:
    page = _create_runtime_nav_page(
        db,
        tenant_id=1,
        title="Уведомления",
        system_key="runtime.notifications",
        is_system=True,
        is_protected=True,
    )
    _assert_soft_delete_blocked(db, page)


def test_protected_page_cannot_be_bulk_purged(db: Session) -> None:
    tenant_id = 1
    page = _create_legacy_runtime_protected_page(db, tenant_id=tenant_id, title="Чат")
    apply_soft_delete(page, deleted_by=None)
    db.flush()

    response = purge_trash_bulk(
        db,
        tenant_id=tenant_id,
        items=[TrashItemRef(kind="page", id=str(page.id))],
    )

    assert response.success is False
    assert response.message == "Удаление запрещено"
    assert len(response.blocked) == 1
    assert response.blocked[0].kind == "page"
    assert response.blocked[0].id == str(page.id)
    assert response.blocked[0].reason == PROTECTED_PAGE_HARD_DELETE_MESSAGE
    db.refresh(page)
    assert page.deleted_at is not None


def test_protected_page_cannot_be_hard_purged(db: Session) -> None:
    tenant_id = 1
    page = _create_legacy_runtime_protected_page(db, tenant_id=tenant_id, title="Уведомления")
    apply_soft_delete(page, deleted_by=None)
    db.flush()

    blocked = check_purge_allowed(
        db,
        tenant_id=tenant_id,
        kind="page",
        entity_id=str(page.id),
    )
    assert blocked is not None
    assert blocked.blocked is True
    assert blocked.protected is True
    assert blocked.message == "Удаление запрещено"

    with pytest.raises(HTTPException) as exc_info:
        purge_trash_item(db, tenant_id=tenant_id, kind="page", entity_id=str(page.id))

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail["reason"] == "protected_page"
    db.refresh(page)
    assert page.deleted_at is not None


def test_protected_page_in_trash_can_be_restored(db: Session) -> None:
    tenant_id = 1
    page = _create_legacy_runtime_protected_page(db, tenant_id=tenant_id, title="Главная")
    apply_soft_delete(page, deleted_by=None)
    db.flush()

    restore_trash_item(db, tenant_id=tenant_id, kind="page", entity_id=str(page.id))
    db.refresh(page)
    assert page.deleted_at is None

    _assert_soft_delete_blocked(db, page, tenant_id=tenant_id)


def test_regular_page_can_still_be_deleted(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page = Page(portal_id=tenant_id, title=f"Обычная страница {suffix}")
    db.add(page)
    db.flush()

    assert not is_protected_page(db, tenant_id=tenant_id, page=page)

    deleted = pages_repository.delete_page(db, page.id, deleted_by=None)
    assert deleted is not None
    assert deleted.deleted_at is not None
    db.flush()

    response = execute_planned_bulk_purge(
        db,
        tenant_id=tenant_id,
        items=[TrashItemRef(kind="page", id=str(page.id))],
    )
    assert response.success is True
