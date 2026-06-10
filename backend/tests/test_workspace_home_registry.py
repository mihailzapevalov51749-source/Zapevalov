"""Workspace Home Tab / Page / Root Section registry."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from app.modules.platform.designer.workspaces.workspace_home.registry import (
    acquire_workspace_home_lock,
    reconcile_duplicate_home_tabs,
    reconcile_workspace_home_root_sections,
)


def test_acquire_workspace_home_lock_uses_pg_advisory_lock() -> None:
    db = MagicMock()
    acquire_workspace_home_lock(db, 42)
    db.execute.assert_called_once()
    assert "pg_advisory_xact_lock" in str(db.execute.call_args[0][0])


def _home_tab_stub(*, tab_id: int, created_at: datetime) -> SimpleNamespace:
    return SimpleNamespace(
        id=tab_id,
        slug="home",
        is_system=True,
        deleted_at=None,
        created_at=created_at,
        title="Главная",
        sort_order=0,
        is_visible=True,
        object_type_id=None,
        tab_type="page",
        target_type="page",
        target_id="100",
        url=None,
        updated_at=created_at,
    )


def test_reconcile_duplicate_home_tabs_keeps_oldest() -> None:
    workspace = SimpleNamespace(id=7, home_page_id=100, tenant_id=1)
    first = _home_tab_stub(tab_id=1, created_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
    second = _home_tab_stub(tab_id=2, created_at=datetime(2026, 2, 1, tzinfo=timezone.utc))
    db = MagicMock()

    with patch(
        "app.modules.platform.designer.workspaces.workspace_home.registry.list_active_home_tabs",
        return_value=[first, second],
    ):
        canonical = reconcile_duplicate_home_tabs(db, workspace)

    assert canonical is first
    assert second.deleted_at is not None


def test_reconcile_root_sections_creates_when_missing() -> None:
    page = SimpleNamespace(id=11, title="Разработка")
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

    changed = reconcile_workspace_home_root_sections(db, page=page, section_title="Разработка")

    assert changed is True
    db.add.assert_called_once()
    db.flush.assert_called_once()


def test_reconcile_root_sections_deactivates_duplicate_roots() -> None:
    page = SimpleNamespace(id=11, title="Разработка")
    first = SimpleNamespace(id=1, sort_order=0, is_visible=True)
    second = SimpleNamespace(id=2, sort_order=0, is_visible=True)
    db = MagicMock()
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [
        first,
        second,
    ]

    changed = reconcile_workspace_home_root_sections(db, page=page, section_title="Разработка")

    assert changed is True
    assert first.is_visible is True
    assert second.is_visible is False
