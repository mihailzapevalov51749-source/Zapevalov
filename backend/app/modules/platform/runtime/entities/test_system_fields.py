from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.modules.platform.runtime.entities.system_fields import (
    SYSTEM_FIELD_KEYS,
    merge_catalog_fields_with_system,
    strip_client_system_values,
    system_values_from_entity,
)
from app.modules.platform.runtime.entities.models import RuntimeEntity


def test_strip_client_system_values_removes_reserved_keys():
    payload = {
        "title": "Задача",
        SYSTEM_FIELD_KEYS["created_by"]: 99,
        "created_at": "2020-01-01T00:00:00Z",
        "version": 100,
    }

    assert strip_client_system_values(payload) == {"title": "Задача"}


def test_merge_catalog_fields_places_system_fields_at_end():
    merged = merge_catalog_fields_with_system(
        [
            {"key": "title", "name": "Название", "field_type": "text"},
            {"key": "priority", "name": "Приоритет", "field_type": "choice"},
        ],
    )

    keys = [field["key"] for field in merged]

    assert keys[:2] == ["title", "priority"]
    assert keys[-6:] == [
        SYSTEM_FIELD_KEYS["created_by"],
        SYSTEM_FIELD_KEYS["created_at"],
        SYSTEM_FIELD_KEYS["updated_by"],
        SYSTEM_FIELD_KEYS["updated_at"],
        SYSTEM_FIELD_KEYS["record_version"],
        SYSTEM_FIELD_KEYS["id"],
    ]


def test_system_values_from_entity_maps_entity_columns():
    entity_id = uuid4()
    now = datetime(2026, 6, 3, 12, 0, tzinfo=timezone.utc)

    entity = RuntimeEntity(
        id=entity_id,
        tenant_id=1,
        object_type_key="tasks",
        catalog_version=1,
        created_by=10,
        updated_by=11,
        created_at=now,
        updated_at=now,
        record_version=3,
    )

    values = system_values_from_entity(entity)

    assert values[SYSTEM_FIELD_KEYS["id"]] == str(entity_id)
    assert values[SYSTEM_FIELD_KEYS["created_by"]] == 10
    assert values[SYSTEM_FIELD_KEYS["updated_by"]] == 11
    assert values[SYSTEM_FIELD_KEYS["record_version"]] == 3
