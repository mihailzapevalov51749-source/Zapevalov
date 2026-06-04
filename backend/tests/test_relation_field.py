"""Unit tests for relation field runtime API over relation instances."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from app.modules.platform.runtime.catalog.service import (
    PublishedObjectTypeMetadata,
    PublishedRelationMetadata,
)
from app.modules.platform.runtime.relation_field import service
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceRead
from app.modules.platform.shared.enums import FieldType, RelationType
from app.modules.platform.shared.exceptions import CatalogNotFound


def _relation_metadata(**overrides):
    defaults = {
        "tenant_id": 1,
        "catalog_version": 3,
        "relation_id": uuid4(),
        "relation_key": "task_project",
        "relation_type": RelationType.MANY_TO_MANY.value,
        "source_object_type_key": "task",
        "target_object_type_key": "project",
        "is_active": True,
        "settings_json": {},
    }
    defaults.update(overrides)
    return PublishedRelationMetadata(**defaults)


def _object_type_metadata(**overrides):
    defaults = {
        "tenant_id": 1,
        "catalog_version": 3,
        "schema_version": 1,
        "object_type_id": uuid4(),
        "object_type_key": "task",
        "fields": [
            {
                "key": "project",
                "field_type": FieldType.RELATION.value,
                "settings_json": {
                    "relation_key": "task_project",
                    "role": "source",
                    "cardinality": "one",
                },
            },
            {"key": "title", "field_type": "text"},
        ],
    }
    defaults.update(overrides)
    return PublishedObjectTypeMetadata(**defaults)


def _entity(entity_id: UUID, object_type_key: str):
    entity = MagicMock()
    entity.id = entity_id
    entity.object_type_key = object_type_key
    return entity


def _instance(**overrides):
    defaults = {
        "id": uuid4(),
        "tenant_id": 1,
        "relation_key": "task_project",
        "source_entity_id": uuid4(),
        "target_entity_id": uuid4(),
        "created_at": datetime.now(timezone.utc),
    }
    defaults.update(overrides)
    inst = MagicMock()
    for key, value in defaults.items():
        setattr(inst, key, value)
    return inst


def _relation_read(**overrides):
    defaults = {
        "id": uuid4(),
        "tenant_id": 1,
        "relation_key": "task_project",
        "relation_id": uuid4(),
        "catalog_version": 3,
        "source_entity_id": uuid4(),
        "target_entity_id": uuid4(),
        "source_object_type_key": "task",
        "target_object_type_key": "project",
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "deleted_at": None,
    }
    defaults.update(overrides)
    return RelationInstanceRead(**defaults)


@patch("app.modules.platform.runtime.relation_field.service.catalog_service.get_published_object_type_metadata")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_get_relation_field_metadata(
    mock_get_entity,
    mock_get_object_type,
) -> None:
    entity_id = uuid4()
    object_meta = _object_type_metadata()
    mock_get_entity.return_value = _entity(entity_id, "task")
    mock_get_object_type.return_value = object_meta

    with (
        patch(
            "app.modules.platform.runtime.relation_field.service.catalog_service.get_published_relation_metadata",
            return_value=_relation_metadata(),
        ),
        patch(
            "app.modules.platform.runtime.relation_field.service._relation_binding_adapter",
            return_value=SimpleNamespace(
                key="task_project",
                is_active=True,
                deleted_at=None,
                source_object_type_id=object_meta.object_type_id,
                target_object_type_id=uuid4(),
            ),
        ),
    ):
        result = service.get_relation_field_metadata(MagicMock(), 1, entity_id, "project")

    assert result.field_type == "relation"
    assert result.relation_key == "task_project"
    assert result.role == "source"
    assert result.cardinality == "one"


@patch("app.modules.platform.runtime.relation_field.service.relation_instances_service.create_relation_instance")
@patch("app.modules.platform.runtime.relation_field.service.relation_repository.list_active_for_entity_relation_key")
@patch("app.modules.platform.runtime.relation_field.service.relation_repository.get_relation_instance")
@patch("app.modules.platform.runtime.relation_field.service._serialize_linked_entity")
@patch("app.modules.platform.runtime.relation_field.service._resolve_relation_field")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_create_relation_field_link_delegates_to_relation_engine(
    mock_get_entity,
    mock_resolve,
    mock_serialize,
    mock_get_instance,
    mock_list_active,
    mock_create_instance,
) -> None:
    anchor_id = uuid4()
    target_id = uuid4()
    resolved = service.ResolvedRelationField(
        field_key="project",
        relation_key="task_project",
        role="source",
        cardinality="many",
        object_type_key="task",
    )
    mock_get_entity.return_value = _entity(anchor_id, "task")
    mock_resolve.return_value = resolved
    mock_list_active.return_value = []
    created = _relation_read(
        source_entity_id=anchor_id,
        target_entity_id=target_id,
    )
    mock_create_instance.return_value = created
    mock_get_instance.return_value = _instance(
        id=created.id,
        source_entity_id=anchor_id,
        target_entity_id=target_id,
    )
    mock_serialize.return_value = service.RelationFieldLinkedEntity(
        entity_id=target_id,
        title="Проект А",
        relation_instance_id=created.id,
    )

    result = service.create_relation_field_link(
        MagicMock(),
        1,
        anchor_id,
        "project",
        target_id,
    )

    mock_create_instance.assert_called_once()
    call_kwargs = mock_create_instance.call_args
    assert call_kwargs[0][2] == "task_project"
    payload = call_kwargs[0][3]
    assert payload.source_entity_id == anchor_id
    assert payload.target_entity_id == target_id
    assert result.linked_entity.title == "Проект А"


@patch("app.modules.platform.runtime.relation_field.service.relation_instances_service.create_relation_instance")
@patch("app.modules.platform.runtime.relation_field.service.relation_repository.list_active_for_entity_relation_key")
@patch("app.modules.platform.runtime.relation_field.service.relation_repository.get_relation_instance")
@patch("app.modules.platform.runtime.relation_field.service._serialize_linked_entity")
@patch("app.modules.platform.runtime.relation_field.service._resolve_relation_field")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_create_relation_field_link_allows_self_link(
    mock_get_entity,
    mock_resolve,
    mock_serialize,
    mock_get_instance,
    mock_list_active,
    mock_create_instance,
) -> None:
    entity_id = uuid4()
    resolved = service.ResolvedRelationField(
        field_key="mentor",
        relation_key="employee_mentor",
        role="source",
        cardinality="many",
        object_type_key="employee",
    )
    mock_get_entity.return_value = _entity(entity_id, "employee")
    mock_resolve.return_value = resolved
    mock_list_active.return_value = []
    created = _relation_read(
        source_entity_id=entity_id,
        target_entity_id=entity_id,
    )
    mock_create_instance.return_value = created
    mock_get_instance.return_value = _instance(
        id=created.id,
        source_entity_id=entity_id,
        target_entity_id=entity_id,
    )
    mock_serialize.return_value = service.RelationFieldLinkedEntity(
        entity_id=entity_id,
        title="Иван Иванов",
        relation_instance_id=created.id,
    )

    result = service.create_relation_field_link(
        MagicMock(),
        1,
        entity_id,
        "mentor",
        entity_id,
    )

    mock_create_instance.assert_called_once()
    payload = mock_create_instance.call_args[0][3]
    assert payload.source_entity_id == entity_id
    assert payload.target_entity_id == entity_id
    assert result.linked_entity.entity_id == entity_id


@patch("app.modules.platform.runtime.relation_field.service.relation_instances_service.delete_relation_instance")
@patch("app.modules.platform.runtime.relation_field.service.relation_repository.list_active_for_entity_relation_key")
@patch("app.modules.platform.runtime.relation_field.service._resolve_relation_field")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_delete_relation_field_link(
    mock_get_entity,
    mock_resolve,
    mock_list_active,
    mock_delete_instance,
) -> None:
    anchor_id = uuid4()
    target_id = uuid4()
    instance_id = uuid4()
    mock_get_entity.return_value = _entity(anchor_id, "task")
    mock_resolve.return_value = service.ResolvedRelationField(
        field_key="project",
        relation_key="task_project",
        role="source",
        cardinality="one",
        object_type_key="task",
    )
    mock_list_active.return_value = [
        _instance(
            id=instance_id,
            source_entity_id=anchor_id,
            target_entity_id=target_id,
        ),
    ]
    mock_delete_instance.return_value = _relation_read(id=instance_id)

    result = service.delete_relation_field_link(
        MagicMock(),
        1,
        anchor_id,
        "project",
        target_id,
    )

    mock_delete_instance.assert_called_once()
    assert mock_delete_instance.call_args[0][2] == instance_id
    assert result.relation_instance.id == instance_id


@patch("app.modules.platform.runtime.relation_field.service._serialize_linked_entity")
@patch("app.modules.platform.runtime.relation_field.service.relation_repository.list_active_for_entity_relation_key")
@patch("app.modules.platform.runtime.relation_field.service._resolve_relation_field")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_get_relation_field_state_returns_linked_items(
    mock_get_entity,
    mock_resolve,
    mock_list_active,
    mock_serialize,
) -> None:
    anchor_id = uuid4()
    peer_id = uuid4()
    instance_id = uuid4()
    mock_get_entity.return_value = _entity(anchor_id, "task")
    mock_resolve.return_value = service.ResolvedRelationField(
        field_key="project",
        relation_key="task_project",
        role="source",
        cardinality="one",
        object_type_key="task",
    )
    mock_list_active.return_value = [
        _instance(
            id=instance_id,
            source_entity_id=anchor_id,
            target_entity_id=peer_id,
        ),
    ]
    mock_serialize.return_value = service.RelationFieldLinkedEntity(
        entity_id=peer_id,
        title="Проект А",
        relation_instance_id=instance_id,
    )

    state = service.get_relation_field_state(MagicMock(), 1, anchor_id, "project")

    assert state.field_key == "project"
    assert state.cardinality == "one"
    assert len(state.items) == 1
    assert state.items[0].entity_id == peer_id
    assert state.items[0].title == "Проект А"


@patch("app.modules.platform.runtime.relation_field.service.relation_instances_service.create_relation_instance")
@patch("app.modules.platform.runtime.relation_field.service.relation_instances_service.delete_relation_instance")
@patch("app.modules.platform.runtime.relation_field.service.relation_repository.list_active_for_entity_relation_key")
@patch("app.modules.platform.runtime.relation_field.service.relation_repository.get_relation_instance")
@patch("app.modules.platform.runtime.relation_field.service._serialize_linked_entity")
@patch("app.modules.platform.runtime.relation_field.service._resolve_relation_field")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_cardinality_one_replaces_existing_link(
    mock_get_entity,
    mock_resolve,
    mock_serialize,
    mock_get_instance,
    mock_list_active,
    mock_delete_instance,
    mock_create_instance,
) -> None:
    anchor_id = uuid4()
    old_target = uuid4()
    new_target = uuid4()
    old_instance_id = uuid4()

    mock_get_entity.return_value = _entity(anchor_id, "task")
    mock_resolve.return_value = service.ResolvedRelationField(
        field_key="project",
        relation_key="task_project",
        role="source",
        cardinality="one",
        object_type_key="task",
    )
    mock_list_active.return_value = [
        _instance(
            id=old_instance_id,
            source_entity_id=anchor_id,
            target_entity_id=old_target,
        ),
    ]
    mock_delete_instance.return_value = _relation_read(id=old_instance_id)
    created = _relation_read(
        source_entity_id=anchor_id,
        target_entity_id=new_target,
    )
    mock_create_instance.return_value = created
    mock_get_instance.return_value = _instance(
        id=created.id,
        source_entity_id=anchor_id,
        target_entity_id=new_target,
    )
    mock_serialize.return_value = service.RelationFieldLinkedEntity(
        entity_id=new_target,
        title="Новый проект",
        relation_instance_id=created.id,
    )

    service.create_relation_field_link(
        MagicMock(),
        1,
        anchor_id,
        "project",
        new_target,
    )

    assert mock_delete_instance.call_args[0][2] == old_instance_id
    mock_create_instance.assert_called_once()


@patch("app.modules.platform.runtime.relation_field.service.catalog_service.get_published_relation_metadata")
@patch("app.modules.platform.runtime.relation_field.service.catalog_service.get_published_object_type_metadata")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_create_rejects_wrong_role_binding(
    mock_get_entity,
    mock_get_object_type,
    mock_get_relation_metadata,
) -> None:
    entity_id = uuid4()
    object_meta = _object_type_metadata(
        fields=[
            {
                "key": "project",
                "field_type": FieldType.RELATION.value,
                "settings_json": {
                    "relation_key": "task_project",
                    "role": "target",
                    "cardinality": "one",
                },
            },
        ],
    )
    mock_get_entity.return_value = _entity(entity_id, "task")
    mock_get_object_type.return_value = object_meta
    mock_get_relation_metadata.return_value = _relation_metadata()

    with patch(
        "app.modules.platform.runtime.relation_field.service._relation_binding_adapter",
        return_value=SimpleNamespace(
            key="task_project",
            is_active=True,
            deleted_at=None,
            source_object_type_id=uuid4(),
            target_object_type_id=uuid4(),
        ),
    ):
        with pytest.raises(HTTPException) as exc_info:
            service.create_relation_field_link(
                MagicMock(),
                1,
                entity_id,
                "project",
                uuid4(),
            )

    assert exc_info.value.status_code == 422
    assert "role=target" in str(exc_info.value.detail)


@patch("app.modules.platform.runtime.relation_field.service.catalog_service.get_published_object_type_metadata")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_get_state_rejects_non_relation_field(
    mock_get_entity,
    mock_get_object_type,
) -> None:
    entity_id = uuid4()
    mock_get_entity.return_value = _entity(entity_id, "task")
    mock_get_object_type.return_value = _object_type_metadata(
        fields=[{"key": "title", "field_type": "text"}],
    )

    with pytest.raises(HTTPException) as exc_info:
        service.get_relation_field_state(MagicMock(), 1, entity_id, "title")

    assert exc_info.value.status_code == 422


@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity_value_row")
@patch("app.modules.platform.runtime.relation_field.service.catalog_service.get_published_view_projection_metadata")
@patch("app.modules.platform.runtime.relation_field.service.catalog_service.get_published_object_type_metadata")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_resolve_entity_display_title_from_projection(
    mock_get_entity,
    mock_get_object_type,
    mock_get_projection,
    mock_get_value_row,
) -> None:
    entity_id = uuid4()
    entity = _entity(entity_id, "project")
    mock_get_entity.return_value = entity
    projection = MagicMock()
    projection.title_field = "name"
    mock_get_projection.return_value = projection
    value_row = MagicMock()
    value_row.value_json = "Проект А"
    mock_get_value_row.return_value = value_row

    title = service._resolve_entity_display_title(MagicMock(), 1, entity)

    assert title == "Проект А"
    mock_get_object_type.assert_not_called()


@patch("app.modules.platform.runtime.relation_field.service.catalog_service.get_published_object_type_metadata")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_entity_not_found(mock_get_entity, mock_get_object_type) -> None:
    mock_get_entity.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        service.get_relation_field_state(MagicMock(), 1, uuid4(), "project")

    assert exc_info.value.status_code == 404
    mock_get_object_type.assert_not_called()


@patch("app.modules.platform.runtime.relation_field.service.catalog_service.get_published_object_type_metadata")
@patch("app.modules.platform.runtime.relation_field.service.entities_repository.get_entity")
def test_catalog_not_found(mock_get_entity, mock_get_object_type) -> None:
    mock_get_entity.return_value = _entity(uuid4(), "task")
    mock_get_object_type.side_effect = CatalogNotFound("no catalog")

    with pytest.raises(HTTPException) as exc_info:
        service.get_relation_field_state(MagicMock(), 1, uuid4(), "project")

    assert exc_info.value.status_code == 404
