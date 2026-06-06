import json
from typing import Any
from uuid import UUID

from app.modules.platform.runtime.query.filter_operators import (
    ParsedFilterCondition,
    allowed_operators_for_field_type,
    normalize_catalog_field_type,
    normalize_filter_operator,
    operator_requires_value,
)
from app.modules.platform.shared.enums import FieldType

ENTITY_SORT_FIELDS = frozenset(
    {
        "id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "record_version",
        "record_number",
    },
)
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


def parse_filter_conditions(query_params: dict[str, str]) -> list[ParsedFilterCondition]:
    conditions: list[ParsedFilterCondition] = []

    raw_filters_json = query_params.get("filters")
    if raw_filters_json:
        try:
            parsed = json.loads(raw_filters_json)
        except json.JSONDecodeError as exc:
            raise ValueError("filters должен быть valid JSON array") from exc

        if not isinstance(parsed, list):
            raise ValueError("filters должен быть JSON array")

        for index, item in enumerate(parsed):
            if not isinstance(item, dict):
                raise ValueError(f"filters[{index}] должен быть object")

            field_key = str(item.get("field") or item.get("fieldKey") or "").strip()
            operator = normalize_filter_operator(item.get("op") or item.get("operator"))

            if not field_key:
                raise ValueError(f"filters[{index}].field обязателен")

            conditions.append(
                ParsedFilterCondition(
                    field=field_key,
                    op=operator,
                    value=item.get("value"),
                ),
            )

    legacy_filters = parse_filter_params(query_params)
    for field_key, raw_value in legacy_filters.items():
        conditions.append(
            ParsedFilterCondition(
                field=field_key,
                op=normalize_filter_operator("eq"),
                value=raw_value,
            ),
        )

    return conditions


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


def parse_sort_specs(query_params: dict[str, str]) -> list[tuple[str, str]] | None:
    raw = query_params.get("sorts")
    if not raw:
        return None

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("sorts должен быть valid JSON array") from exc

    if not isinstance(parsed, list) or not parsed:
        raise ValueError("sorts должен быть non-empty JSON array")

    specs: list[tuple[str, str]] = []

    for index, item in enumerate(parsed):
        if not isinstance(item, dict):
            raise ValueError(f"sorts[{index}] должен быть object")

        field_key = str(item.get("field") or item.get("fieldKey") or "").strip()
        order = str(item.get("order") or item.get("direction") or "asc").lower()

        if not field_key:
            raise ValueError(f"sorts[{index}].field обязателен")

        specs.append((field_key, order))

    return specs


def validate_sort_specs(
    sort_specs: list[tuple[str, str]],
    field_map: dict[str, dict[str, Any]],
) -> None:
    for sort_field, sort_order in sort_specs:
        validate_sort(sort_field, field_map)
        validate_order(sort_order)


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


def validate_filter_conditions(
    conditions: list[ParsedFilterCondition],
    field_map: dict[str, dict[str, Any]],
) -> None:
    errors: list[str] = []

    for condition in conditions:
        field_meta = field_map.get(condition.field)
        if field_meta is None:
            errors.append(f"Неизвестное поле фильтра: {condition.field}")
            continue

        field_type = normalize_catalog_field_type(field_meta.get("field_type"))
        allowed_ops = allowed_operators_for_field_type(field_type)

        if condition.op not in allowed_ops:
            errors.append(
                f"Поле '{condition.field}': оператор '{condition.op}' не поддерживается",
            )
            continue

        if operator_requires_value(condition.op) and condition.value in (None, ""):
            errors.append(
                f"Поле '{condition.field}': оператор '{condition.op}' требует value",
            )

    if errors:
        raise ValueError("; ".join(errors))


def _coerce_list_value(field_key: str, raw_value: Any) -> list[Any]:
    if isinstance(raw_value, list):
        return raw_value

    if isinstance(raw_value, str):
        trimmed = raw_value.strip()
        if not trimmed:
            return []

        if trimmed.startswith("["):
            try:
                parsed = json.loads(trimmed)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"Поле '{field_key}': filter value для in/not_in ожидает JSON array",
                ) from exc
            if not isinstance(parsed, list):
                raise ValueError(
                    f"Поле '{field_key}': filter value для in/not_in ожидает JSON array",
                )
            return parsed

        return [part.strip() for part in trimmed.split(",") if part.strip()]

    return [raw_value]


def coerce_filter_value(
    field_metadata: dict[str, Any],
    raw_value: Any,
    *,
    operator: str,
) -> Any:
    field_key = field_metadata.get("key", "?")
    field_type = normalize_catalog_field_type(field_metadata.get("field_type"))

    if not operator_requires_value(operator):
        return None

    if operator in {"in", "not_in"}:
        values = _coerce_list_value(field_key, raw_value)
        if not values:
            raise ValueError(
                f"Поле '{field_key}': оператор '{operator}' требует непустой список value",
            )
        return [coerce_filter_value(field_metadata, item, operator="eq") for item in values]

    if raw_value is None:
        return None

    if field_type in {FieldType.TEXT.value, FieldType.CHOICE.value}:
        return str(raw_value)

    if field_type == FieldType.TEXTAREA.value:
        return str(raw_value)

    if field_type in {FieldType.DATE.value, FieldType.DATETIME.value, FieldType.UUID.value}:
        return str(raw_value)

    if field_type == FieldType.NUMBER.value:
        try:
            raw_string = str(raw_value)
            if "." in raw_string:
                return float(raw_string)
            return int(raw_string)
        except ValueError as exc:
            raise ValueError(
                f"Поле '{field_key}': filter value должно быть number",
            ) from exc

    if field_type == FieldType.BOOLEAN.value:
        if isinstance(raw_value, bool):
            return raw_value

        normalized = str(raw_value).strip().lower()
        if normalized in {"true", "1", "yes", "да"}:
            return True
        if normalized in {"false", "0", "no", "нет"}:
            return False
        raise ValueError(f"Поле '{field_key}': filter value должно быть boolean")

    if field_type == FieldType.USER.value:
        try:
            parsed = int(raw_value)
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Поле '{field_key}': filter value должно быть user_id",
            ) from exc
        if parsed <= 0:
            raise ValueError(f"Поле '{field_key}': filter value должно быть user_id")
        return parsed

    if field_type == FieldType.MULTI_CHOICE.value and operator == "eq":
        return _coerce_list_value(field_key, raw_value)

    if field_type == FieldType.RELATION.value:
        normalized = str(raw_value).strip()
        if not normalized:
            raise ValueError(
                f"Поле '{field_key}': filter value должно быть valid UUID string",
            )
        validate_uuid_string(normalized, field_key)
        return normalized

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
            coerced[field_key] = coerce_filter_value(
                field_meta,
                raw_value,
                operator="eq",
            )
        except ValueError as exc:
            errors.append(str(exc))

    if errors:
        raise ValueError("; ".join(errors))

    return coerced


def coerce_filter_conditions(
    conditions: list[ParsedFilterCondition],
    field_map: dict[str, dict[str, Any]],
) -> list[ParsedFilterCondition]:
    coerced: list[ParsedFilterCondition] = []
    errors: list[str] = []

    for condition in conditions:
        field_meta = field_map[condition.field]
        try:
            value = coerce_filter_value(
                field_meta,
                condition.value,
                operator=condition.op,
            )
            coerced.append(
                ParsedFilterCondition(
                    field=condition.field,
                    op=condition.op,
                    value=value,
                ),
            )
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
