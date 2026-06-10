"""Runtime System Records — is_system flag and user-surface filtering."""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.platform.runtime.system_records import (
    assert_user_facing_entity,
    is_runtime_system_entity,
)


def _entity(**kwargs) -> RuntimeEntity:
    defaults = {
        "id": uuid4(),
        "tenant_id": 1,
        "object_type_key": "task",
        "catalog_version": 1,
        "status": "active",
        "record_number": 1,
        "is_system": False,
    }
    defaults.update(kwargs)
    return RuntimeEntity(**defaults)


def test_is_runtime_system_entity_uses_column_flag() -> None:
    assert is_runtime_system_entity(_entity(is_system=True)) is True
    assert is_runtime_system_entity(_entity(is_system=False)) is False


def test_assert_user_facing_entity_hides_system_records() -> None:
    with pytest.raises(HTTPException) as exc_info:
        assert_user_facing_entity(_entity(is_system=True))

    assert exc_info.value.status_code == 404


def test_query_base_query_excludes_system_records() -> None:
    from app.modules.platform.runtime.query.repository import _base_query

    db = MagicMock()
    query = MagicMock()
    filtered = MagicMock()
    db.query.return_value = query
    query.filter.return_value = filtered
    filtered.filter.return_value = filtered

    _base_query(db, 1, "task")

    assert filtered.filter.called


def test_plan_root_anchor_created_with_is_system_true() -> None:
    from app.modules.platform.runtime.plan_tree.root_anchor import get_or_create_plan_tree_root_anchor

    metadata = MagicMock()
    metadata.object_type_key = "task"
    metadata.object_type_id = uuid4()
    metadata.catalog_version = 1
    metadata.fields = [{"key": "title", "field_type": "text"}]

    db = MagicMock()

    with (
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.acquire_plan_root_anchor_lock",
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.reconcile_duplicate_plan_root_anchors",
            return_value=None,
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.find_plan_tree_root_anchor_by_title",
            return_value=None,
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.deactivate_anchor_to_anchor_relations",
            return_value=0,
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.ent_repo.get_next_record_number",
            return_value=42,
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.ent_repo.create_entity",
        ) as create_entity,
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.ent_repo.insert_entity_value",
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.ent_repo.commit",
        ),
        patch(
            "app.modules.platform.runtime.plan_tree.root_anchor.ent_repo.refresh_entity",
            side_effect=lambda _db, entity: entity,
        ),
    ):
        entity = get_or_create_plan_tree_root_anchor(db, 1, metadata, "task_subtask")

    assert entity.is_system is True
    assert entity.plan_root_relation_key == "task_subtask"
    create_entity.assert_called_once()
