"""Unit tests for runtime relation instance create/delete and validation."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from app.modules.platform.runtime.catalog.service import PublishedRelationMetadata
from app.modules.platform.runtime.relation_instances import service, validators
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceCreate
from app.modules.platform.shared.enums import RelationType
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
    }
    defaults.update(overrides)
    return PublishedRelationMetadata(**defaults)


def _entity(entity_id: UUID, object_type_key: str):
    entity = MagicMock()
    entity.id = entity_id
    entity.object_type_key = object_type_key
    return entity


def test_validate_relation_instance_create_success() -> None:
    source_id = uuid4()
    target_id = uuid4()

    validators.validate_relation_instance_create(
        relation_metadata=_relation_metadata(),
        source_entity=_entity(source_id, "task"),
        target_entity=_entity(target_id, "project"),
        source_entity_id=source_id,
        target_entity_id=target_id,
    )


@pytest.mark.parametrize(
    ("kwargs", "expected_fragment"),
    [
        (
            {"is_active": False},
            "не активна",
        ),
        (
            {},
            "source_entity_id и target_entity_id не могут совпадать",
        ),
        (
            {"source_object_type_key": "task", "target_object_type_key": "project"},
            "source_entity object_type_key",
        ),
        (
            {"source_object_type_key": "task", "target_object_type_key": "project"},
            "target_entity object_type_key",
        ),
        (
            {"relation_type": "unsupported"},
            "Неподдерживаемый relation_type",
        ),
    ],
)
def test_validate_relation_instance_create_rejects_invalid_payload(
    kwargs: dict,
    expected_fragment: str,
) -> None:
    source_id = uuid4()
    target_id = source_id if "совпадать" in expected_fragment else uuid4()
    metadata = _relation_metadata(**kwargs)

    source_type = "wrong" if "source_entity object_type_key" in expected_fragment else metadata.source_object_type_key
    target_type = "wrong" if "target_entity object_type_key" in expected_fragment else metadata.target_object_type_key

    with pytest.raises(ValueError) as exc_info:
        validators.validate_relation_instance_create(
            relation_metadata=metadata,
            source_entity=_entity(source_id, source_type),
            target_entity=_entity(target_id, target_type),
            source_entity_id=source_id,
            target_entity_id=target_id,
        )

    assert expected_fragment in str(exc_info.value)


@patch("app.modules.platform.runtime.relation_instances.service.repository.refresh")
@patch("app.modules.platform.runtime.relation_instances.service.repository.commit")
@patch("app.modules.platform.runtime.relation_instances.service.repository.create_relation_instance")
@patch("app.modules.platform.runtime.relation_instances.service.repository.check_one_to_one_constraints")
@patch("app.modules.platform.runtime.relation_instances.service.repository.find_duplicate_active")
@patch("app.modules.platform.runtime.relation_instances.service.entities_repository.get_entity")
@patch("app.modules.platform.runtime.relation_instances.service.catalog_service.get_published_relation_metadata")
def test_create_relation_instance_success(
    mock_get_metadata,
    mock_get_entity,
    mock_find_duplicate,
    mock_check_one_to_one,
    mock_create,
    mock_commit,
    mock_refresh,
) -> None:
    source_id = uuid4()
    target_id = uuid4()
    metadata = _relation_metadata()

    mock_get_metadata.return_value = metadata
    mock_get_entity.side_effect = [
        _entity(source_id, metadata.source_object_type_key),
        _entity(target_id, metadata.target_object_type_key),
    ]
    mock_find_duplicate.return_value = None
    mock_check_one_to_one.return_value = None

    created = MagicMock()
    created.id = uuid4()
    created.tenant_id = 1
    created.relation_key = metadata.relation_key
    created.relation_id = metadata.relation_id
    created.catalog_version = metadata.catalog_version
    created.source_entity_id = source_id
    created.target_entity_id = target_id
    created.source_object_type_key = metadata.source_object_type_key
    created.target_object_type_key = metadata.target_object_type_key
    created.status = "active"
    created.created_at = datetime.now(timezone.utc)
    created.updated_at = datetime.now(timezone.utc)
    created.deleted_at = None
    mock_create.return_value = created

    db = MagicMock()
    payload = RelationInstanceCreate(
        source_entity_id=source_id,
        target_entity_id=target_id,
    )

    result = service.create_relation_instance(db, 1, metadata.relation_key, payload)

    assert result.relation_key == metadata.relation_key
    assert result.source_entity_id == source_id
    assert result.target_entity_id == target_id
    assert mock_create.call_args[0][0] is db
    mock_create.assert_called_once()
    mock_commit.assert_called_once_with(db)


@patch("app.modules.platform.runtime.relation_instances.service.catalog_service.get_published_relation_metadata")
def test_create_relation_instance_catalog_not_found(mock_get_metadata) -> None:
    mock_get_metadata.side_effect = CatalogNotFound("missing")

    with pytest.raises(HTTPException) as exc_info:
        service.create_relation_instance(
            MagicMock(),
            1,
            "missing",
            RelationInstanceCreate(source_entity_id=uuid4(), target_entity_id=uuid4()),
        )

    assert exc_info.value.status_code == 404


@patch("app.modules.platform.runtime.relation_instances.service.entities_repository.get_entity")
@patch("app.modules.platform.runtime.relation_instances.service.catalog_service.get_published_relation_metadata")
def test_create_relation_instance_entity_not_found(
    mock_get_metadata,
    mock_get_entity,
) -> None:
    mock_get_metadata.return_value = _relation_metadata()
    mock_get_entity.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        service.create_relation_instance(
            MagicMock(),
            1,
            "task_project",
            RelationInstanceCreate(source_entity_id=uuid4(), target_entity_id=uuid4()),
        )

    assert exc_info.value.status_code == 404
    assert "Source entity" in exc_info.value.detail


@patch("app.modules.platform.runtime.relation_instances.service.repository.find_duplicate_active")
@patch("app.modules.platform.runtime.relation_instances.service.entities_repository.get_entity")
@patch("app.modules.platform.runtime.relation_instances.service.catalog_service.get_published_relation_metadata")
def test_create_relation_instance_validation_error(
    mock_get_metadata,
    mock_get_entity,
    mock_find_duplicate,
) -> None:
    source_id = uuid4()
    target_id = uuid4()
    metadata = _relation_metadata()

    mock_get_metadata.return_value = metadata
    mock_get_entity.side_effect = [
        _entity(source_id, metadata.source_object_type_key),
        _entity(target_id, "wrong_type"),
    ]

    with pytest.raises(HTTPException) as exc_info:
        service.create_relation_instance(
            MagicMock(),
            1,
            metadata.relation_key,
            RelationInstanceCreate(source_entity_id=source_id, target_entity_id=target_id),
        )

    assert exc_info.value.status_code == 422
    mock_find_duplicate.assert_not_called()


@patch("app.modules.platform.runtime.relation_instances.service.repository.find_duplicate_active")
@patch("app.modules.platform.runtime.relation_instances.service.entities_repository.get_entity")
@patch("app.modules.platform.runtime.relation_instances.service.catalog_service.get_published_relation_metadata")
def test_create_relation_instance_duplicate_conflict(
    mock_get_metadata,
    mock_get_entity,
    mock_find_duplicate,
) -> None:
    source_id = uuid4()
    target_id = uuid4()
    metadata = _relation_metadata()

    mock_get_metadata.return_value = metadata
    mock_get_entity.side_effect = [
        _entity(source_id, metadata.source_object_type_key),
        _entity(target_id, metadata.target_object_type_key),
    ]
    mock_find_duplicate.return_value = MagicMock()

    with pytest.raises(HTTPException) as exc_info:
        service.create_relation_instance(
            MagicMock(),
            1,
            metadata.relation_key,
            RelationInstanceCreate(source_entity_id=source_id, target_entity_id=target_id),
        )

    assert exc_info.value.status_code == 409


@patch("app.modules.platform.runtime.relation_instances.service.repository.refresh")
@patch("app.modules.platform.runtime.relation_instances.service.repository.commit")
@patch("app.modules.platform.runtime.relation_instances.service.repository.soft_delete_relation_instance")
@patch("app.modules.platform.runtime.relation_instances.service.repository.get_relation_instance")
def test_delete_relation_instance_success(
    mock_get_instance,
    mock_soft_delete,
    mock_commit,
    mock_refresh,
) -> None:
    instance = MagicMock()
    instance.id = uuid4()
    instance.tenant_id = 1
    instance.relation_key = "task_project"
    instance.relation_id = uuid4()
    instance.catalog_version = 1
    instance.source_entity_id = uuid4()
    instance.target_entity_id = uuid4()
    instance.source_object_type_key = "task"
    instance.target_object_type_key = "project"
    instance.status = "deleted"
    instance.created_at = datetime.now(timezone.utc)
    instance.updated_at = datetime.now(timezone.utc)
    instance.deleted_at = datetime.now(timezone.utc)

    mock_get_instance.return_value = instance

    db = MagicMock()
    result = service.delete_relation_instance(db, 1, instance.id)

    assert result.id == instance.id
    mock_soft_delete.assert_called_once_with(db, instance)
    mock_commit.assert_called_once_with(db)


@patch("app.modules.platform.runtime.relation_instances.service.repository.get_relation_instance")
def test_delete_relation_instance_not_found(mock_get_instance) -> None:
    mock_get_instance.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        service.delete_relation_instance(MagicMock(), 1, uuid4())

    assert exc_info.value.status_code == 404
