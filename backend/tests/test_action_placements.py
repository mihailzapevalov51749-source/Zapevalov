"""Action Placement schemas and service validation."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.platform.action_engine.action_placements.registry import (
    ensure_builtin_action_placements_registered,
)
from app.modules.platform.action_engine.action_placements.schemas import (
    ActionPlacementCreate,
    ActionPlacementUpdate,
)
from app.modules.platform.action_engine.action_placements.service import (
    create_action_placement,
    delete_action_placement,
    update_action_placement,
)


@pytest.fixture(autouse=True)
def _register_builtin_placements() -> None:
    ensure_builtin_action_placements_registered()


def test_action_placement_create_schema_validates_json_objects() -> None:
    with pytest.raises(ValueError):
        ActionPlacementCreate(
            placement_key="table",
            config_json=[],
        )

    payload = ActionPlacementCreate(
        placement_key="row_menu",
        config_json={},
    )
    assert payload.placement_key == "row_menu"


def test_create_action_placement_rejects_unknown_placement_key() -> None:
    db = MagicMock()
    action_definition = SimpleNamespace(
        id=uuid4(),
        object_type_id=uuid4(),
        is_system=False,
    )

    with patch(
        "app.modules.platform.action_engine.action_placements.service._get_scoped_action_definition",
        return_value=action_definition,
    ):
        with pytest.raises(HTTPException) as exc:
            create_action_placement(
                db,
                1,
                action_definition.object_type_id,
                action_definition.id,
                ActionPlacementCreate(placement_key="unknown_placement"),
            )

    assert exc.value.status_code == 422


def test_create_action_placement_rejects_system_action_definition() -> None:
    db = MagicMock()
    action_definition = SimpleNamespace(
        id=uuid4(),
        object_type_id=uuid4(),
        is_system=True,
    )

    with patch(
        "app.modules.platform.action_engine.action_placements.service._get_scoped_action_definition",
        return_value=action_definition,
    ):
        with pytest.raises(HTTPException) as exc:
            create_action_placement(
                db,
                1,
                action_definition.object_type_id,
                action_definition.id,
                ActionPlacementCreate(placement_key="table"),
            )

    assert exc.value.status_code == 403


def test_create_action_placement_rejects_duplicate_placement_key() -> None:
    db = MagicMock()
    action_definition = SimpleNamespace(
        id=uuid4(),
        object_type_id=uuid4(),
        is_system=False,
    )
    existing = SimpleNamespace(placement_key="table")

    with patch(
        "app.modules.platform.action_engine.action_placements.service._get_scoped_action_definition",
        return_value=action_definition,
    ), patch(
        "app.modules.platform.action_engine.action_placements.service.repository.get_by_placement_key",
        return_value=existing,
    ):
        with pytest.raises(HTTPException) as exc:
            create_action_placement(
                db,
                1,
                action_definition.object_type_id,
                action_definition.id,
                ActionPlacementCreate(placement_key="table"),
            )

    assert exc.value.status_code == 409


def test_update_action_placement_forbids_system_action_definition() -> None:
    db = MagicMock()
    action_definition = SimpleNamespace(
        id=uuid4(),
        object_type_id=uuid4(),
        is_system=True,
    )

    with patch(
        "app.modules.platform.action_engine.action_placements.service._get_scoped_action_definition",
        return_value=action_definition,
    ):
        with pytest.raises(HTTPException) as exc:
            update_action_placement(
                db,
                1,
                action_definition.object_type_id,
                action_definition.id,
                uuid4(),
                ActionPlacementUpdate(is_active=False),
            )

    assert exc.value.status_code == 403


def test_delete_action_placement_requires_existing_entity() -> None:
    db = MagicMock()
    action_definition_id = uuid4()
    object_type_id = uuid4()
    action_definition = SimpleNamespace(
        id=action_definition_id,
        object_type_id=object_type_id,
        is_system=False,
    )

    with patch(
        "app.modules.platform.action_engine.action_placements.service._get_scoped_action_definition",
        return_value=action_definition,
    ), patch(
        "app.modules.platform.action_engine.action_placements.service.repository.get_action_placement",
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            delete_action_placement(
                db,
                1,
                object_type_id,
                action_definition_id,
                uuid4(),
            )

    assert exc.value.status_code == 404


def test_update_action_placement_applies_partial_patch() -> None:
    db = MagicMock()
    action_definition_id = uuid4()
    object_type_id = uuid4()
    placement_id = uuid4()
    action_definition = SimpleNamespace(
        id=action_definition_id,
        object_type_id=object_type_id,
        is_system=False,
    )
    entity = SimpleNamespace(
        id=placement_id,
        tenant_id=1,
        object_type_id=object_type_id,
        action_definition_id=action_definition_id,
        placement_key="table",
        is_active=True,
        sort_order=100,
        label_override=None,
        icon_key=None,
        config_json=None,
        visibility_condition_json=None,
        enabled_condition_json=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch(
        "app.modules.platform.action_engine.action_placements.service._get_scoped_action_definition",
        return_value=action_definition,
    ), patch(
        "app.modules.platform.action_engine.action_placements.service.repository.get_action_placement",
        return_value=entity,
    ), patch(
        "app.modules.platform.action_engine.action_placements.service.repository.save_action_placement",
        return_value=entity,
    ) as save_mock, patch(
        "app.modules.platform.action_engine.action_placements.service._touch_parent_object_type",
    ):
        result = update_action_placement(
            db,
            1,
            object_type_id,
            action_definition_id,
            placement_id,
            ActionPlacementUpdate(sort_order=20, is_active=False),
        )

    save_mock.assert_called_once()
    assert entity.sort_order == 20
    assert entity.is_active is False
    assert result.placement_key == "table"
