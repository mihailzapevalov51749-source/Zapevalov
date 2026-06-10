"""Navigation System Items registry — ensure, reconcile, lock."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.modules.navigation.system_registry.registry import (
    acquire_navigation_system_lock,
    reconcile_duplicate_navigation_items,
)


def test_acquire_navigation_system_lock_uses_pg_advisory_lock() -> None:
    db = MagicMock()
    acquire_navigation_system_lock(db, 1, "designer.objects")
    db.execute.assert_called_once()
    assert "pg_advisory_xact_lock" in str(db.execute.call_args[0][0])


def test_reconcile_duplicate_navigation_items_keeps_oldest() -> None:
    first = SimpleNamespace(id=1, system_key="designer.objects", deleted_at=None)
    second = SimpleNamespace(id=2, system_key="designer.objects", deleted_at=None)
    db = MagicMock()

    with patch(
        "app.modules.navigation.system_registry.registry.list_active_navigation_items_by_system_key",
        return_value=[first, second],
    ):
        canonical = reconcile_duplicate_navigation_items(db, 1, "designer.objects")

    assert canonical is first
    assert second.deleted_at is not None


def test_ensure_designer_system_items_uses_registry() -> None:
    from app.modules.navigation.service import ensure_designer_system_items

    db = MagicMock()
    with (
        patch(
            "app.modules.navigation.system_registry.registry.ensure_designer_system_navigation_items",
            return_value=False,
        ) as ensure_items,
        patch(
            "app.modules.navigation.system_registry.registry.deactivate_orphan_workspace_placements",
            return_value=0,
        ),
    ):
        ensure_designer_system_items(db, 1)

    ensure_items.assert_called_once_with(db, 1)
    db.commit.assert_not_called()
