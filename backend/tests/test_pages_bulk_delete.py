"""Bulk soft-delete for designer pages registry."""

from __future__ import annotations

import uuid

import app.modules.portals.models  # noqa: F401

import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.pages.service import bulk_delete_page_registry


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


def _create_runtime_page(
    db: Session,
    *,
    tenant_id: int,
    title: str,
    protected: bool,
) -> Page:
    page = Page(portal_id=tenant_id, title=title)
    db.add(page)
    db.flush()

    if protected:
        db.add(
            NavigationItem(
                portal_id=tenant_id,
                type="page",
                title=title,
                page_id=page.id,
                menu_scope="runtime",
                system_key="runtime.chat" if title == "Чат" else None,
                is_system=title == "Чат",
                is_protected=title == "Чат",
            ),
        )
        db.flush()

    return page


def test_bulk_delete_skips_protected_and_deletes_regular(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()

    protected = _create_runtime_page(
        db,
        tenant_id=tenant_id,
        title="Чат",
        protected=True,
    )
    regular = Page(portal_id=tenant_id, title=f"Обычная {suffix}")
    db.add(regular)
    db.flush()

    response = bulk_delete_page_registry(
        db,
        tenant_id,
        [protected.id, regular.id],
        deleted_by=None,
    )

    assert response.deleted_count == 1
    assert response.deleted_ids == [regular.id]
    assert len(response.skipped) == 1
    assert response.skipped[0].id == protected.id
    assert "Пропущены системные страницы" in response.message

    db.refresh(protected)
    db.refresh(regular)
    assert protected.deleted_at is None
    assert regular.deleted_at is not None


def test_bulk_delete_only_protected_returns_message(db: Session) -> None:
    tenant_id = 1
    page = _create_runtime_page(db, tenant_id=tenant_id, title="Уведомления", protected=True)
    nav = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title="Уведомления",
        page_id=page.id,
        menu_scope="runtime",
    )
    db.add(nav)
    db.flush()

    response = bulk_delete_page_registry(db, tenant_id, [page.id], deleted_by=None)

    assert response.deleted_count == 0
    assert response.skipped
    assert response.message == "Выбраны только системные страницы. Их нельзя удалить."
