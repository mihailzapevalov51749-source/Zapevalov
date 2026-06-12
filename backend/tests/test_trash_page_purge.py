"""Integration tests for Page hard-delete cascade and external dependencies."""

from __future__ import annotations

import uuid

import app.modules.portals.models  # noqa: F401 — register portals table for ORM metadata

import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.blocks.models import Block
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.shared.soft_delete import apply_soft_delete
from app.modules.platform.designer.trash.bulk_purge import execute_planned_bulk_purge
from app.modules.platform.designer.trash.dependency_resolution_service import (
    DependencyResolutionService,
    dependency_resolution_service,
)
from app.modules.platform.designer.trash.schemas import TrashItemRef
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab
from app.modules.sections.models import Section


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


def _create_page_tree(
    db: Session,
    *,
    tenant_id: int,
    title_suffix: str,
) -> tuple[Page, Section, Block]:
    page = Page(portal_id=tenant_id, title=f"Trash purge page {title_suffix}")
    db.add(page)
    db.flush()

    section = Section(page_id=page.id, title="Секция 1")
    db.add(section)
    db.flush()

    block = Block(section_id=section.id, type="universal_table", title="Таблица")
    db.add(block)
    db.flush()

    return page, section, block


def test_clear_page_sections_deletes_blocks(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page, section, block = _create_page_tree(db, tenant_id=tenant_id, title_suffix=suffix)

    assert DependencyResolutionService._clear_page_sections(db, page.id) is True
    db.flush()

    assert db.query(Page).filter(Page.id == page.id).first() is not None
    assert db.query(Section).filter(Section.id == section.id).first() is None
    assert db.query(Block).filter(Block.id == block.id).first() is None


def test_clear_page_sections_does_not_delete_unrelated_page_blocks(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page_a, _, block_a = _create_page_tree(db, tenant_id=tenant_id, title_suffix=f"a-{suffix}")
    page_b, _, block_b = _create_page_tree(db, tenant_id=tenant_id, title_suffix=f"b-{suffix}")

    DependencyResolutionService._clear_page_sections(db, page_a.id)
    db.flush()

    assert db.query(Block).filter(Block.id == block_a.id).first() is None
    assert db.query(Block).filter(Block.id == block_b.id).first() is not None
    assert db.query(Page).filter(Page.id == page_b.id).first() is not None


def test_bulk_purge_page_hard_deletes_sections_and_blocks(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page, section, block = _create_page_tree(db, tenant_id=tenant_id, title_suffix=suffix)
    page_id = page.id
    section_id = section.id
    block_id = block.id

    apply_soft_delete(page, deleted_by=None)
    db.commit()

    response = execute_planned_bulk_purge(
        db,
        tenant_id=tenant_id,
        items=[TrashItemRef(kind="page", id=str(page_id))],
    )
    assert response.success is True

    assert db.query(Page).filter(Page.id == page_id).first() is None
    assert db.query(Section).filter(Section.id == section_id).first() is None
    assert db.query(Block).filter(Block.id == block_id).first() is None


def test_workspace_home_page_blocks_bulk_purge(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page, _, _ = _create_page_tree(db, tenant_id=tenant_id, title_suffix=suffix)
    workspace = DesignerWorkspace(
        tenant_id=tenant_id,
        title=f"WS {suffix}",
        slug=f"ws-{suffix}",
        home_page_id=page.id,
    )
    db.add(workspace)
    apply_soft_delete(page, deleted_by=None)
    db.commit()

    response = execute_planned_bulk_purge(
        db,
        tenant_id=tenant_id,
        items=[TrashItemRef(kind="page", id=str(page.id))],
    )
    assert response.success is False
    assert response.blocked
    assert any("домашняя страница" in item.reason for item in response.blocked)
    assert db.query(Page).filter(Page.id == page.id).first() is not None


def test_navigation_blocks_bulk_purge_page(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page, _, _ = _create_page_tree(db, tenant_id=tenant_id, title_suffix=suffix)
    nav = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title=f"Nav {suffix}",
        page_id=page.id,
    )
    db.add(nav)
    apply_soft_delete(page, deleted_by=None)
    db.commit()

    response = execute_planned_bulk_purge(
        db,
        tenant_id=tenant_id,
        items=[TrashItemRef(kind="page", id=str(page.id))],
    )
    assert response.success is False
    assert any("Навигация" in item.reason for item in response.blocked)
    assert db.query(Page).filter(Page.id == page.id).first() is not None


def test_bulk_purge_page_and_navigation_together(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page, _, _ = _create_page_tree(db, tenant_id=tenant_id, title_suffix=suffix)
    nav = NavigationItem(
        portal_id=tenant_id,
        type="page",
        title=f"Nav {suffix}",
        page_id=page.id,
    )
    db.add(nav)
    db.flush()
    apply_soft_delete(page, deleted_by=None)
    apply_soft_delete(nav, deleted_by=None)
    db.commit()

    response = execute_planned_bulk_purge(
        db,
        tenant_id=tenant_id,
        items=[
            TrashItemRef(kind="page", id=str(page.id)),
            TrashItemRef(kind="navigation", id=str(nav.id)),
        ],
    )
    assert response.success is True
    assert db.query(Page).filter(Page.id == page.id).first() is None
    assert db.query(NavigationItem).filter(NavigationItem.id == nav.id).first() is None


def test_bulk_purge_page_and_workspace_tab_together(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page, _, _ = _create_page_tree(db, tenant_id=tenant_id, title_suffix=suffix)
    workspace = DesignerWorkspace(
        tenant_id=tenant_id,
        title=f"WS tab {suffix}",
        slug=f"ws-tab-{suffix}",
    )
    db.add(workspace)
    db.flush()
    tab = DesignerWorkspaceTab(
        tenant_id=tenant_id,
        workspace_id=workspace.id,
        title="Вкладка",
        slug=f"tab-{suffix}",
        tab_type="page",
        target_type="page",
        target_id=str(page.id),
    )
    db.add(tab)
    db.flush()
    apply_soft_delete(page, deleted_by=None)
    apply_soft_delete(tab, deleted_by=None)
    db.commit()

    response = execute_planned_bulk_purge(
        db,
        tenant_id=tenant_id,
        items=[
            TrashItemRef(kind="page", id=str(page.id)),
            TrashItemRef(kind="workspace_tab", id=str(tab.id)),
        ],
    )
    assert response.success is True
    assert db.query(Page).filter(Page.id == page.id).first() is None
    assert db.query(DesignerWorkspaceTab).filter(DesignerWorkspaceTab.id == tab.id).first() is None


def test_resolve_page_dependencies_includes_workspace_home(db: Session) -> None:
    tenant_id = 1
    suffix = _suffix()
    page = Page(portal_id=tenant_id, title=f"Home dep {suffix}")
    db.add(page)
    db.flush()
    workspace = DesignerWorkspace(
        tenant_id=tenant_id,
        title=f"WS home {suffix}",
        slug=f"ws-home-{suffix}",
        home_page_id=page.id,
    )
    db.add(workspace)
    db.flush()

    deps = dependency_resolution_service.get_dependencies(
        db,
        tenant_id=tenant_id,
        kind="page",
        entity_id=str(page.id),
    )
    assert any("домашняя страница" in dep.label for dep in deps)
