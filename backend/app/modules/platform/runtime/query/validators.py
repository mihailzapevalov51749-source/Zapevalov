import json
from typing import Any
from uuid import UUID

from app.modules.platform.shared.enums import FieldType

ENTITY_SORT_FIELDS = frozenset({"created_at", "updated_at"})
ALLOWED_ORDERS = frozenset({"asc", "desc"})


def fields_by_key(fields: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {field["key"]: field for field in fields if field.get("key")}


def parse_filter_params(query_params: dict[str, str]) -> dict[str, str]:
    filters: dict[str, str] = {}
    for key, value in query_params.items():
        if key.startswith("filter."):
            field_key = key[len("filter.") :]
            if field_key:
                filters[field_key] = value
    return filters


def validate_limit(limit: int) -> None:
    if limit < 1 or limit > 200:
        raise ValueError("limit должен быть в диапазоне 1..200")


def validate_offset(offset: int) -> None:
    if offset < 0:
        raise ValueError("offset должен быть >= 0")


def validate_order(order: str) -> None:
    if order not in ALLOWED_ORDERS:
        raise ValueError("order должен быть asc или desc")


def validate_sort(sort: str, field_map: dict[str, dict[str, Any]]) -> None:
    if sort in ENTITY_SORT_FIELDS:
        return
    if sort in field_map:
        return
    raise ValueError(f"Недопустимое поле сортировки: {sort}")


def validate_filter_fields(
    filters: dict[str, str],
    field_map: dict[str, dict[str, Any]],
) -> None:
    errors: list[str] = []
    for field_key in filters:
        if field_key not in field_map:
            errors.append(f"Неизвестное поле фильтра: {field_key}")
    if errors:
        raise ValueError("; ".join(errors))


def coerce_filter_value(field_metadata: dict[str, Any], raw_value: str) -> Any:
    field_key = field_metadata.get("key", "?")
    field_type = field_metadata.get("field_type", "")

    if field_type in {FieldType.TEXT, FieldType.TEXTAREA, FieldType.CHOICE}:
        return raw_value

    if field_type in {FieldType.DATE, FieldType.DATETIME, FieldType.UUID}:
        return raw_value

    if field_type == FieldType.NUMBER:
        try:
            if "." in raw_value:
                return float(raw_value)
            return int(raw_value)
        except ValueError as exc:
            raise ValueError(
                f"Поле '{field_key}': filter value должно быть number",
            ) from exc

    if field_type == FieldType.BOOLEAN:
        normalized = raw_value.strip().lower()
        if normalized in {"true", "1"}:
            return True
        if normalized in {"false", "0"}:
            return False
        raise ValueError(f"Поле '{field_key}': filter value должно быть boolean")

    if field_type == FieldType.MULTI_CHOICE:
        try:
            parsed = json.loads(raw_value)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Поле '{field_key}': multi_choice filter ожидает JSON array",
            ) from exc
        if not isinstance(parsed, list):
            raise ValueError(
                f"Поле '{field_key}': multi_choice filter ожидает JSON array",
            )
        return parsed

    raise ValueError(f"Поле '{field_key}': неподдерживаемый field_type для filter")


def coerce_filters(
    filters: dict[str, str],
    field_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    coerced: dict[str, Any] = {}
    errors: list[str] = []

    for field_key, raw_value in filters.items():
        field_meta = field_map[field_key]
        try:
            coerced[field_key] = coerce_filter_value(field_meta, raw_value)
        except ValueError as exc:
            errors.append(str(exc))

    if errors:
        raise ValueError("; ".join(errors))

    return coerced


def validate_uuid_string(value: str, field_key: str) -> None:
    try:
        UUID(value)
    except (ValueError, TypeError) as exc:
        raise ValueError(
            f"Поле '{field_key}': filter value должно быть valid UUID string",
        ) from exc
