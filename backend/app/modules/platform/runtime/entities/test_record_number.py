from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.modules.platform.runtime.entities.repository import get_next_record_number
from app.modules.platform.runtime.entities.system_fields import (
    SYSTEM_FIELD_KEYS,
    strip_client_system_values,
    system_values_from_entity,
)
from app.modules.platform.runtime.entities.models import RuntimeEntity


def test_get_next_record_number_starts_at_one():
    db = MagicMock()
    db.query.return_value.filter.return_value.scalar.return_value = None

    assert get_next_record_number(db, 1, "tasks") == 1


def test_get_next_record_number_increments_max():
    db = MagicMock()
    db.query.return_value.filter.return_value.scalar.return_value = 7

    assert get_next_record_number(db, 1, "tasks") == 8


def test_strip_client_system_values_removes_record_number():
    payload = {
        "title": "Задача",
        SYSTEM_FIELD_KEYS["record_number"]: 999,
    }

    assert strip_client_system_values(payload) == {"title": "Задача"}


def test_system_values_from_entity_includes_record_number():
    entity = RuntimeEntity(
        id=uuid4(),
        tenant_id=1,
        object_type_key="tasks",
        catalog_version=1,
        record_number=42,
        record_version=1,
    )

    values = system_values_from_entity(entity)

    assert values[SYSTEM_FIELD_KEYS["record_number"]] == 42


@patch("app.modules.platform.runtime.entities.service.repository.get_next_record_number", return_value=4)
@patch("app.modules.platform.runtime.entities.service.repository.create_entity")
@patch("app.modules.platform.runtime.entities.service.repository.create_entity_values")
@patch("app.modules.platform.runtime.entities.service.repository.commit")
@patch("app.modules.platform.runtime.entities.service.repository.refresh_entity")
@patch("app.modules.platform.runtime.entities.service.repository.get_entity_values", return_value=[])
@patch("app.modules.platform.runtime.entities.service.catalog_service.get_published_object_type_metadata")
def test_create_entity_assigns_record_number(
    mock_metadata,
    _get_values,
    _refresh,
    _commit,
    _create_values,
    mock_create_entity,
    _next_number,
):
    from app.modules.platform.runtime.entities.schemas import EntityCreate
    from app.modules.platform.runtime.entities.service import create_entity

    metadata = MagicMock()
    metadata.fields = [{"key": "title", "field_type": "text", "is_required": False}]
    metadata.object_type_id = uuid4()
    metadata.catalog_version = 1
    metadata.object_type_key = "tasks"
    metadata.title_field_key = "title"
    mock_metadata.return_value = metadata

    captured = {}

    def capture_create(_db, entity):
        captured["record_number"] = entity.record_number
        return entity

    mock_create_entity.side_effect = capture_create

    db = MagicMock()
    create_entity(
        db,
        tenant_id=1,
        object_type_key="tasks",
        payload=EntityCreate(values={"title": "A"}),
        current_user=None,
    )

    assert captured["record_number"] == 4


def test_migration_adds_record_number_column():
    from sqlalchemy import inspect

    from app.db.session import engine

    columns = {column["name"] for column in inspect(engine).get_columns("runtime_entities")}
    assert "record_number" in columns


def test_serialize_entity_exposes_record_number_aliases():
    from app.modules.platform.runtime.entities.serializer import serialize_entity

    entity = RuntimeEntity(
        id=uuid4(),
        tenant_id=1,
        object_type_key="tasks",
        catalog_version=1,
        record_number=9,
        record_version=1,
    )

    payload = serialize_entity(entity, [])

    assert payload.record_number == 9
    assert payload.recordNumber == 9
    assert payload.system_number == 9
