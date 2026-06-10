"""Runtime entity system fields — present on every object instance."""

from __future__ import annotations

from typing import Any

from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.platform.shared.enums import FieldType

SYSTEM_FIELD_KEY_PREFIX = "__system_"

SYSTEM_FIELD_KEYS = {
    "id": f"{SYSTEM_FIELD_KEY_PREFIX}id",
    "is_system": f"{SYSTEM_FIELD_KEY_PREFIX}is_system",
    "record_number": f"{SYSTEM_FIELD_KEY_PREFIX}record_number",
    "created_by": f"{SYSTEM_FIELD_KEY_PREFIX}created_by",
    "created_at": f"{SYSTEM_FIELD_KEY_PREFIX}created_at",
    "updated_by": f"{SYSTEM_FIELD_KEY_PREFIX}updated_by",
    "updated_at": f"{SYSTEM_FIELD_KEY_PREFIX}updated_at",
    "record_version": f"{SYSTEM_FIELD_KEY_PREFIX}record_version",
}

RUNTIME_ENTITY_SORT_FIELDS = frozenset(
    {
        "id",
        "record_number",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "record_version",
    },
)

SYSTEM_FIELD_ORDER_FOR_ALL_VIEW = (
    SYSTEM_FIELD_KEYS["is_system"],
    SYSTEM_FIELD_KEYS["record_number"],
    SYSTEM_FIELD_KEYS["record_version"],
    SYSTEM_FIELD_KEYS["created_by"],
    SYSTEM_FIELD_KEYS["created_at"],
    SYSTEM_FIELD_KEYS["updated_by"],
    SYSTEM_FIELD_KEYS["updated_at"],
    SYSTEM_FIELD_KEYS["id"],
)

SYSTEM_FIELD_CATALOG_DEFINITIONS: tuple[dict[str, Any], ...] = (
    {
        "key": SYSTEM_FIELD_KEYS["is_system"],
        "name": "Системная запись",
        "field_type": FieldType.BOOLEAN.value,
        "is_system": True,
        "is_required": True,
        "is_readonly": True,
        "sort_order": 999,
    },
    {
        "key": SYSTEM_FIELD_KEYS["record_number"],
        "name": "№ записи",
        "field_type": FieldType.NUMBER.value,
        "is_system": True,
        "is_required": True,
        "is_readonly": True,
        "sort_order": 1000,
    },
    {
        "key": SYSTEM_FIELD_KEYS["created_by"],
        "name": "Создал",
        "field_type": FieldType.USER.value,
        "is_system": True,
        "is_required": False,
        "sort_order": 1001,
    },
    {
        "key": SYSTEM_FIELD_KEYS["created_at"],
        "name": "Дата создания",
        "field_type": FieldType.DATETIME.value,
        "is_system": True,
        "is_required": False,
        "sort_order": 1002,
    },
    {
        "key": SYSTEM_FIELD_KEYS["updated_by"],
        "name": "Изменил",
        "field_type": FieldType.USER.value,
        "is_system": True,
        "is_required": False,
        "sort_order": 1003,
    },
    {
        "key": SYSTEM_FIELD_KEYS["updated_at"],
        "name": "Дата изменения",
        "field_type": FieldType.DATETIME.value,
        "is_system": True,
        "is_required": False,
        "sort_order": 1004,
    },
    {
        "key": SYSTEM_FIELD_KEYS["record_version"],
        "name": "Версия записи",
        "field_type": FieldType.NUMBER.value,
        "is_system": True,
        "is_required": False,
        "sort_order": 1005,
    },
    {
        "key": SYSTEM_FIELD_KEYS["id"],
        "name": "ID",
        "field_type": FieldType.UUID.value,
        "is_system": True,
        "is_required": False,
        "sort_order": 1006,
    },
)

_LEGACY_SYSTEM_VALUE_KEYS = frozenset(
    {
        "id",
        "created_by",
        "created_at",
        "updated_by",
        "updated_at",
        "version",
        "record_version",
        "record_number",
        "system_number",
        "systemNumber",
        "row_number",
        "rowNumber",
        *SYSTEM_FIELD_KEYS.values(),
    },
)


def is_runtime_system_field_key(key: str | None) -> bool:
    normalized = str(key or "").strip()
    return normalized.startswith(SYSTEM_FIELD_KEY_PREFIX) or normalized in _LEGACY_SYSTEM_VALUE_KEYS


def strip_client_system_values(values: dict[str, Any] | None) -> dict[str, Any]:
    if not values:
        return {}

    return {
        key: value
        for key, value in values.items()
        if not is_runtime_system_field_key(key)
    }


def merge_catalog_fields_with_system(fields: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """User fields first, then canonical system field definitions at the end."""
    user_fields: list[dict[str, Any]] = []
    seen_user_keys: set[str] = set()

    for field in fields or []:
        if not isinstance(field, dict):
            continue

        key = str(field.get("key") or "").strip()

        if not key or is_runtime_system_field_key(key):
            continue

        if key in seen_user_keys:
            continue

        seen_user_keys.add(key)
        user_fields.append(field)

    system_fields = [dict(item) for item in SYSTEM_FIELD_CATALOG_DEFINITIONS]
    return [*user_fields, *system_fields]


def system_values_from_entity(entity: RuntimeEntity) -> dict[str, Any]:
    return {
        SYSTEM_FIELD_KEYS["id"]: str(entity.id),
        SYSTEM_FIELD_KEYS["is_system"]: bool(getattr(entity, "is_system", False)),
        SYSTEM_FIELD_KEYS["record_number"]: entity.record_number,
        SYSTEM_FIELD_KEYS["created_by"]: entity.created_by,
        SYSTEM_FIELD_KEYS["created_at"]: entity.created_at.isoformat()
        if entity.created_at
        else None,
        SYSTEM_FIELD_KEYS["updated_by"]: entity.updated_by,
        SYSTEM_FIELD_KEYS["updated_at"]: entity.updated_at.isoformat()
        if entity.updated_at
        else None,
        SYSTEM_FIELD_KEYS["record_version"]: entity.record_version,
    }


def runtime_sort_field_for_column_key(column_key: str | None) -> str:
    normalized = str(column_key or "").strip()

    mapping = {
        SYSTEM_FIELD_KEYS["id"]: "id",
        SYSTEM_FIELD_KEYS["record_number"]: "record_number",
        SYSTEM_FIELD_KEYS["created_at"]: "created_at",
        SYSTEM_FIELD_KEYS["updated_at"]: "updated_at",
        SYSTEM_FIELD_KEYS["created_by"]: "created_by",
        SYSTEM_FIELD_KEYS["updated_by"]: "updated_by",
        SYSTEM_FIELD_KEYS["record_version"]: "record_version",
    }

    return mapping.get(normalized, normalized)
