"""Plan root anchor structural uniqueness and self-healing."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.platform.runtime.plan_tree.anchor_registry import (
    acquire_plan_root_anchor_lock,
    reconcile_duplicate_plan_root_anchors,
)


def _anchor(entity_id, *, created_at=None) -> RuntimeEntity:
    return RuntimeEntity(
        id=entity_id,
        tenant_id=1,
        object_type_key="idei",
        object_type_id=uuid4(),
        catalog_version=1,
        status="active",
        record_version=1,
        record_number=1,
        is_system=True,
        plan_root_relation_key="ierarhiya_idey",
        created_at=created_at or datetime.now(timezone.utc),
    )


def test_reconcile_duplicate_plan_root_anchors_keeps_oldest() -> None:
    first_id = uuid4()
    second_id = uuid4()
    db = MagicMock()
    anchors = [
        _anchor(first_id, created_at=datetime(2026, 1, 1, tzinfo=timezone.utc)),
        _anchor(second_id, created_at=datetime(2026, 2, 1, tzinfo=timezone.utc)),
    ]

    with (
        patch(
            "app.modules.platform.runtime.plan_tree.anchor_registry.list_active_plan_root_anchors",
            return_value=anchors,
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.anchor_registry.deactivate_anchor_to_anchor_relations",
            return_value=0,
        ) as deactivate,
    ):
        canonical = reconcile_duplicate_plan_root_anchors(
            db,
            1,
            "idei",
            "ierarhiya_idey",
        )

    assert canonical.id == first_id
    assert anchors[1].deleted_at is not None
    deactivate.assert_called_once()


def test_get_or_create_returns_existing_without_create() -> None:
    from app.modules.platform.runtime.plan_tree.root_anchor import (
        get_or_create_plan_tree_root_anchor,
    )

    metadata = MagicMock()
    metadata.object_type_key = "idei"
    metadata.object_type_id = uuid4()
    metadata.catalog_version = 1
    metadata.fields = [{"key": "nazvanie_idei", "field_type": "text"}]

    existing = _anchor(uuid4())
    db = MagicMock()

    with (
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.acquire_plan_root_anchor_lock",
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.reconcile_duplicate_plan_root_anchors",
            return_value=existing,
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.deactivate_anchor_to_anchor_relations",
            return_value=0,
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.ent_repo.commit",
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.ent_repo.refresh_entity",
            side_effect=lambda _db, entity: entity,
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.ent_repo.create_entity",
        ) as create_entity,
    ):
        result = get_or_create_plan_tree_root_anchor(db, 1, metadata, "ierarhiya_idey")

    assert result is existing
    create_entity.assert_not_called()


def test_acquire_plan_root_anchor_lock_uses_pg_advisory_lock() -> None:
    db = MagicMock()
    acquire_plan_root_anchor_lock(db, 1, "idei", "ierarhiya_idey")
    db.execute.assert_called_once()
    assert "pg_advisory_xact_lock" in str(db.execute.call_args[0][0])
