"""Action Definition CRUD schemas and service validation."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.modules.platform.action_engine.action_definitions.schemas import (
    ActionDefinitionCreate,
    ActionDefinitionUpdate,
)
from app.modules.platform.action_engine.action_definitions.service import (
    create_action_definition,
    delete_action_definition,
    update_action_definition,
)
from app.modules.platform.action_engine.action_types.registry import (
    ensure_builtin_action_types_registered,
)


@pytest.fixture(autouse=True)
def _register_builtin_action_types() -> None:
    ensure_builtin_action_types_registered()


def test_action_definition_create_schema_validates_key() -> None:
    with pytest.raises(ValueError):
        ActionDefinitionCreate(
            key="Bad Key",
            name="Test",
            action_type_key="create_record",
        )

    payload = ActionDefinitionCreate(
        key="create_subtask",
        name="Создать подзадачу",
        action_type_key="create_record",
    )
    assert payload.key == "create_subtask"


def test_action_definition_update_schema_allows_partial() -> None:
    payload = ActionDefinitionUpdate(name="Новое имя")
    assert payload.name == "Новое имя"
    assert payload.key is None


def test_create_action_definition_rejects_unknown_action_type() -> None:
    db = MagicMock()
    tenant_id = 1
    object_type_id = uuid4()

    with patch(
        "app.modules.platform.action_engine.action_definitions.service._ensure_object_type",
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            create_action_definition(
                db,
                tenant_id,
                object_type_id,
                ActionDefinitionCreate(
                    key="create_subtask",
                    name="Создать подзадачу",
                    action_type_key="unknown_type",
                ),
            )

    assert exc.value.status_code == 422


def test_update_action_definition_forbids_system_entity() -> None:
    db = MagicMock()
    entity = SimpleNamespace(
        id=uuid4(),
        tenant_id=1,
        object_type_id=uuid4(),
        key="system_action",
        name="System",
        description=None,
        action_type_key="create_record",
        is_active=True,
        is_system=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch(
        "app.modules.platform.action_engine.action_definitions.service.repository.get_action_definition",
        return_value=entity,
    ), patch(
        "app.modules.platform.action_engine.action_definitions.service._ensure_object_type",
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            update_action_definition(
                db,
                1,
                entity.object_type_id,
                entity.id,
                ActionDefinitionUpdate(name="Changed"),
            )

    assert exc.value.status_code == 403


def test_delete_action_definition_forbids_system_entity() -> None:
    db = MagicMock()
    entity = SimpleNamespace(
        id=uuid4(),
        tenant_id=1,
        object_type_id=uuid4(),
        key="system_action",
        is_system=True,
    )

    with patch(
        "app.modules.platform.action_engine.action_definitions.service.repository.get_action_definition",
        return_value=entity,
    ), patch(
        "app.modules.platform.action_engine.action_definitions.service._ensure_object_type",
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            delete_action_definition(db, 1, entity.object_type_id, entity.id)

    assert exc.value.status_code == 403


def test_create_action_definition_requires_target_for_create_record() -> None:
    db = MagicMock()
    tenant_id = 1
    object_type_id = uuid4()

    with patch(
        "app.modules.platform.action_engine.action_definitions.service._ensure_object_type",
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            create_action_definition(
                db,
                tenant_id,
                object_type_id,
                ActionDefinitionCreate(
                    key="create_task",
                    name="Создать задачу",
                    action_type_key="create_record",
                ),
            )

    assert exc.value.status_code == 422
    assert "target_object_type_id" in str(exc.value.detail)


def test_create_action_definition_accepts_target_for_create_record() -> None:
    db = MagicMock()
    tenant_id = 1
    object_type_id = uuid4()
    target_object_type_id = uuid4()
    created_entity = SimpleNamespace(
        id=uuid4(),
        tenant_id=tenant_id,
        object_type_id=object_type_id,
        key="create_task",
        name="Создать задачу",
        description=None,
        action_type_key="create_record",
        target_object_type_id=target_object_type_id,
        is_active=True,
        is_system=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    with patch(
        "app.modules.platform.action_engine.action_definitions.service._ensure_object_type",
        return_value=None,
    ), patch(
        "app.modules.platform.action_engine.action_definitions.service._touch_parent_object_type",
        return_value=None,
    ), patch(
        "app.modules.platform.action_engine.action_definitions.service.repository.get_by_key",
        return_value=None,
    ), patch(
        "app.modules.platform.action_engine.action_definitions.service.repository.create_action_definition",
        return_value=created_entity,
    ) as create_mock:
        result = create_action_definition(
            db,
            tenant_id,
            object_type_id,
            ActionDefinitionCreate(
                key="create_task",
                name="Создать задачу",
                action_type_key="create_record",
                target_object_type_id=target_object_type_id,
            ),
        )

    assert result.target_object_type_id == target_object_type_id
    create_mock.assert_called_once()
    assert create_mock.call_args.args[1].target_object_type_id == target_object_type_id


def test_create_action_definition_rejects_auto_link_without_relation() -> None:
    db = MagicMock()
    tenant_id = 1
    object_type_id = uuid4()
    target_object_type_id = uuid4()

    with patch(
        "app.modules.platform.action_engine.action_definitions.service._ensure_object_type",
        return_value=None,
    ):
        with pytest.raises(HTTPException) as exc:
            create_action_definition(
                db,
                tenant_id,
                object_type_id,
                ActionDefinitionCreate(
                    key="create_task",
                    name="Создать задачу",
                    action_type_key="create_record",
                    target_object_type_id=target_object_type_id,
                    auto_link_enabled=True,
                ),
            )

    assert exc.value.status_code == 422
    assert "auto_link_relation_id" in str(exc.value.detail)


def test_create_action_definition_rejects_mismatched_auto_link_relation() -> None:
    db = MagicMock()
    tenant_id = 1
    source_object_type_id = uuid4()
    target_object_type_id = uuid4()
    relation_id = uuid4()
    wrong_target_id = uuid4()

    relation = SimpleNamespace(
        id=relation_id,
        source_object_type_id=source_object_type_id,
        target_object_type_id=wrong_target_id,
        is_active=True,
        deleted_at=None,
    )

    with patch(
        "app.modules.platform.action_engine.action_definitions.service._ensure_object_type",
        return_value=None,
    ), patch(
        "app.modules.platform.action_engine.action_definitions.service.relation_repository.get_relation",
        return_value=relation,
    ):
        with pytest.raises(HTTPException) as exc:
            create_action_definition(
                db,
                tenant_id,
                source_object_type_id,
                ActionDefinitionCreate(
                    key="create_task",
                    name="Создать задачу",
                    action_type_key="create_record",
                    target_object_type_id=target_object_type_id,
                    auto_link_enabled=True,
                    auto_link_relation_id=relation_id,
                ),
            )

    assert exc.value.status_code == 422
    assert "Связь должна соединять" in str(exc.value.detail)
