from typing import Any
from uuid import UUID

from app.modules.platform.shared.enums import FieldType


def _choice_option_keys(settings_json: dict[str, Any] | None) -> set[str]:
    options = (settings_json or {}).get("options") or []
    return {str(option["key"]) for option in options if option.get("key") is not None}


def validate_field_value(field_metadata: dict[str, Any], value: Any) -> None:
    field_key = field_metadata.get("key", "?")
    field_type = field_metadata.get("field_type", "")

    if value is None:
        return

    if field_type in {FieldType.TEXT, FieldType.TEXTAREA}:
        if not isinstance(value, str):
            raise ValueError(f"Поле '{field_key}' ожидает string или null")
        return

    if field_type == FieldType.NUMBER:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"Поле '{field_key}' ожидает number или null")
        return

    if field_type == FieldType.BOOLEAN:
        if not isinstance(value, bool):
            raise ValueError(f"Поле '{field_key}' ожидает boolean или null")
        return

    if field_type == FieldType.CHOICE:
        allowed = _choice_option_keys(field_metadata.get("settings_json"))
        if str(value) not in allowed:
            raise ValueError(
                f"Поле '{field_key}': значение '{value}' не входит в допустимые options",
            )
        return

    if field_type == FieldType.MULTI_CHOICE:
        if not isinstance(value, list):
            raise ValueError(f"Поле '{field_key}' ожидает array of option keys или null")
        allowed = _choice_option_keys(field_metadata.get("settings_json"))
        for item in value:
            if str(item) not in allowed:
                raise ValueError(
                    f"Поле '{field_key}': значение '{item}' не входит в допустимые options",
                )
        return

    if field_type in {FieldType.DATE, FieldType.DATETIME}:
        if not isinstance(value, str):
            raise ValueError(f"Поле '{field_key}' ожидает string (ISO date) или null")
        return

    if field_type == FieldType.UUID:
        try:
            UUID(str(value))
        except (ValueError, TypeError) as exc:
            raise ValueError(f"Поле '{field_key}' ожидает valid UUID string или null") from exc
        return

    raise ValueError(f"Поле '{field_key}': неподдерживаемый field_type '{field_type}'")


def _fields_by_key(fields: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {field["key"]: field for field in fields if field.get("key")}


def validate_entity_create(
    values: dict[str, Any],
    object_type_metadata: dict[str, Any],
) -> None:
    fields = object_type_metadata.get("fields") or []
    field_map = _fields_by_key(fields)
    errors: list[str] = []

    for key in values:
        if key not in field_map:
            errors.append(f"Неизвестное поле: {key}")

    for field in fields:
        field_key = field["key"]
        if field.get("is_required") and field_key not in values:
            errors.append(f"Обязательное поле отсутствует: {field_key}")

    if errors:
        raise ValueError("; ".join(errors))

    for key, value in values.items():
        field_meta = field_map.get(key)
        if not field_meta:
            continue
        try:
            validate_field_value(field_meta, value)
        except ValueError as exc:
            errors.append(str(exc))

    if errors:
        raise ValueError("; ".join(errors))


def validate_entity_update(
    values: dict[str, Any],
    object_type_metadata: dict[str, Any],
) -> None:
    fields = object_type_metadata.get("fields") or []
    field_map = _fields_by_key(fields)
    errors: list[str] = []

    for key in values:
        if key not in field_map:
            errors.append(f"Неизвестное поле: {key}")

    if errors:
        raise ValueError("; ".join(errors))

    for key, value in values.items():
        field_meta = field_map[key]
        try:
            validate_field_value(field_meta, value)
        except ValueError as exc:
            errors.append(str(exc))

    if errors:
        raise ValueError("; ".join(errors))
