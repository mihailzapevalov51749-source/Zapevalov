from typing import Any
from uuid import UUID

from app.modules.platform.runtime.entities.system_fields import (
    is_runtime_system_field_key,
    strip_client_system_values,
)
from app.modules.platform.shared.enums import FieldType
from app.modules.platform.shared.link_value import validate_link_field_value
from app.modules.platform.shared.relation_field_contract import is_relation_field_type


def _choice_option_keys(settings_json: dict[str, Any] | None) -> set[str]:
    options = (settings_json or {}).get("options") or []
    return {str(option["key"]) for option in options if option.get("key") is not None}


def _file_entry_id(item: dict[str, Any]) -> str | None:
    for key in ("file_id", "fileId", "id", "stored_file_name", "storedFileName"):
        raw = item.get(key)
        if raw is not None and str(raw).strip():
            return str(raw).strip()
    return None


def _validate_file_entry(field_key: str, item: Any, index: int) -> None:
    if not isinstance(item, dict):
        raise ValueError(
            f"Поле '{field_key}': элемент [{index}] должен быть объектом с метаданными файла",
        )

    if not _file_entry_id(item):
        raise ValueError(
            f"Поле '{field_key}': элемент [{index}] должен содержать file_id",
        )


def validate_field_value(field_metadata: dict[str, Any], value: Any) -> None:
    field_key = field_metadata.get("key", "?")
    field_type = field_metadata.get("field_type", "")

    if is_relation_field_type(field_type):
        if value is not None:
            raise ValueError(
                f"Поле '{field_key}': relation field не использует runtime_entity_values",
            )
        return

    if value is None:
        return

    if field_type in {FieldType.TEXT, FieldType.TEXTAREA}:
        if not isinstance(value, str):
            raise ValueError(f"Поле '{field_key}' ожидает string или null")
        return

    if field_type == FieldType.LINK:
        validate_link_field_value(field_key, value)
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

    if field_type == FieldType.USER:
        if isinstance(value, bool):
            raise ValueError(f"Поле '{field_key}' ожидает user_id (int) или null")
        if isinstance(value, int) and not isinstance(value, bool):
            if value <= 0:
                raise ValueError(f"Поле '{field_key}' ожидает положительный user_id или null")
            return
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                raise ValueError(f"Поле '{field_key}' ожидает user_id (int) или null")
            if not stripped.isdigit():
                raise ValueError(f"Поле '{field_key}' ожидает user_id (int) или null")
            if int(stripped) <= 0:
                raise ValueError(f"Поле '{field_key}' ожидает положительный user_id или null")
            return
        raise ValueError(f"Поле '{field_key}' ожидает user_id (int) или null")

    if field_type == FieldType.FILE:
        if not isinstance(value, list):
            raise ValueError(f"Поле '{field_key}' ожидает array of file metadata или null")

        settings = field_metadata.get("settings_json") or {}
        multiple = settings.get("multiple", True)

        if not multiple and len(value) > 1:
            raise ValueError(
                f"Поле '{field_key}' допускает только один файл (multiple=false)",
            )

        for index, item in enumerate(value):
            _validate_file_entry(field_key, item, index)
        return

    raise ValueError(f"Поле '{field_key}': неподдерживаемый field_type '{field_type}'")


def _fields_by_key(fields: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {field["key"]: field for field in fields if field.get("key")}


def _resolve_title_field_key(object_type_metadata: dict[str, Any]) -> str | None:
    title_key = object_type_metadata.get("title_field_key")
    if isinstance(title_key, str) and title_key.strip():
        return title_key.strip()
    return None


def _is_required_on_create(field: dict[str, Any], title_field_key: str | None) -> bool:
    if not field.get("is_required"):
        return False

    field_key = str(field.get("key") or "").strip()
    if not field_key:
        return False

    if title_field_key and field_key == title_field_key:
        return True

    return bool(field.get("quick_create"))


def validate_entity_create(
    values: dict[str, Any],
    object_type_metadata: dict[str, Any],
) -> None:
    fields = object_type_metadata.get("fields") or []
    field_map = _fields_by_key(fields)
    title_field_key = _resolve_title_field_key(object_type_metadata)
    errors: list[str] = []

    for key in values:
        if key not in field_map:
            errors.append(f"Неизвестное поле: {key}")

    for field in fields:
        field_key = field["key"]
        if field.get("is_system") or is_runtime_system_field_key(field_key):
            continue
        if is_relation_field_type(field.get("field_type")):
            if field_key in values:
                errors.append(
                    f"Поле '{field_key}': relation field не использует runtime_entity_values",
                )
            continue
        if _is_required_on_create(field, title_field_key) and field_key not in values:
            errors.append(f"Обязательное поле отсутствует: {field_key}")

    if errors:
        raise ValueError("; ".join(errors))

    for key, value in values.items():
        field_meta = field_map.get(key)
        if not field_meta:
            continue
        if is_relation_field_type(field_meta.get("field_type")):
            errors.append(
                f"Поле '{key}': relation field не использует runtime_entity_values",
            )
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
            continue

        field_meta = field_map[key]
        if field_meta.get("is_system") or is_runtime_system_field_key(key):
            errors.append(f"Системное поле нельзя изменять: {key}")
        if is_relation_field_type(field_meta.get("field_type")):
            errors.append(
                f"Поле '{key}': relation field не использует runtime_entity_values",
            )

    if errors:
        raise ValueError("; ".join(errors))

    for key, value in values.items():
        field_meta = field_map[key]
        if field_meta.get("is_system") or is_runtime_system_field_key(key):
            continue
        if is_relation_field_type(field_meta.get("field_type")):
            continue
        try:
            validate_field_value(field_meta, value)
        except ValueError as exc:
            errors.append(str(exc))

    if errors:
        raise ValueError("; ".join(errors))
