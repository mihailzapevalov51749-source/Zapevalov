"""Field Definition default value contract — storage, validation, runtime resolution."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from app.modules.platform.shared.enums import FieldType

DEFAULT_VALUE_NONE = "none"
DEFAULT_VALUE_CONSTANT = "constant"
DEFAULT_VALUE_OPTION = "option"
DEFAULT_VALUE_CURRENT_USER = "current_user"
DEFAULT_VALUE_SPECIFIC_USER = "specific_user"
DEFAULT_VALUE_TODAY = "today"
DEFAULT_VALUE_TODAY_PLUS_DAYS = "today_plus_days"
DEFAULT_VALUE_SPECIFIC_DATE = "specific_date"
DEFAULT_VALUE_NOW = "now"
DEFAULT_VALUE_NOW_PLUS_HOURS = "now_plus_hours"
DEFAULT_VALUE_SPECIFIC_DATETIME = "specific_datetime"
DEFAULT_VALUE_TRUE = "true"
DEFAULT_VALUE_FALSE = "false"
DEFAULT_VALUE_SPECIFIC_RECORD = "specific_record"

NO_DEFAULT_FIELD_TYPES = frozenset({FieldType.FILE})

TEXT_LIKE_FIELD_TYPES = frozenset({FieldType.TEXT, FieldType.TEXTAREA, FieldType.UUID})

CHOICE_FIELD_TYPES = frozenset({FieldType.CHOICE, FieldType.MULTI_CHOICE})


@dataclass(frozen=True)
class DefaultValueResolveContext:
    current_user_id: int | None = None
    now: datetime | None = None


def empty_default_value() -> dict[str, Any]:
    return {"type": DEFAULT_VALUE_NONE, "value": None}


def _is_structured_default(raw: Any) -> bool:
    return isinstance(raw, dict) and "type" in raw


def normalize_default_value_json(
    raw: Any | None,
    field_type: FieldType | str,
) -> dict[str, Any] | None:
    """Normalize storage to ``{ type, value }`` or ``None`` for forbidden types."""
    ft = FieldType(field_type) if not isinstance(field_type, FieldType) else field_type

    if ft in NO_DEFAULT_FIELD_TYPES:
        return None

    if raw is None:
        if ft == FieldType.BOOLEAN:
            return {"type": DEFAULT_VALUE_FALSE, "value": None}
        return empty_default_value()

    if _is_structured_default(raw):
        return {"type": str(raw["type"]), "value": raw.get("value")}

    # Legacy scalar formats (pre-contract migration).
    if ft == FieldType.BOOLEAN and isinstance(raw, bool):
        return {
            "type": DEFAULT_VALUE_TRUE if raw else DEFAULT_VALUE_FALSE,
            "value": None,
        }

    if ft in {FieldType.DATE, FieldType.DATETIME} and isinstance(raw, str):
        legacy_type = (
            DEFAULT_VALUE_SPECIFIC_DATETIME
            if ft == FieldType.DATETIME
            else DEFAULT_VALUE_SPECIFIC_DATE
        )
        return {"type": legacy_type, "value": raw}

    if ft == FieldType.USER and isinstance(raw, (int, str)) and not isinstance(raw, bool):
        return {"type": DEFAULT_VALUE_SPECIFIC_USER, "value": int(raw)}

    if ft in TEXT_LIKE_FIELD_TYPES and isinstance(raw, str):
        return {"type": DEFAULT_VALUE_CONSTANT, "value": raw}

    if ft == FieldType.NUMBER and isinstance(raw, (int, float)) and not isinstance(raw, bool):
        return {"type": DEFAULT_VALUE_CONSTANT, "value": raw}

    if ft in CHOICE_FIELD_TYPES and isinstance(raw, str):
        return {"type": DEFAULT_VALUE_OPTION, "value": raw}

    return empty_default_value()


def _allowed_types_for_field(field_type: FieldType) -> frozenset[str]:
    if field_type in TEXT_LIKE_FIELD_TYPES | {FieldType.NUMBER}:
        return frozenset({DEFAULT_VALUE_NONE, DEFAULT_VALUE_CONSTANT})

    if field_type in CHOICE_FIELD_TYPES:
        return frozenset({DEFAULT_VALUE_NONE, DEFAULT_VALUE_OPTION})

    if field_type == FieldType.USER:
        return frozenset(
            {
                DEFAULT_VALUE_NONE,
                DEFAULT_VALUE_CURRENT_USER,
                DEFAULT_VALUE_SPECIFIC_USER,
            },
        )

    if field_type == FieldType.DATE:
        return frozenset(
            {
                DEFAULT_VALUE_NONE,
                DEFAULT_VALUE_TODAY,
                DEFAULT_VALUE_TODAY_PLUS_DAYS,
                DEFAULT_VALUE_SPECIFIC_DATE,
            },
        )

    if field_type == FieldType.DATETIME:
        return frozenset(
            {
                DEFAULT_VALUE_NONE,
                DEFAULT_VALUE_NOW,
                DEFAULT_VALUE_NOW_PLUS_HOURS,
                DEFAULT_VALUE_SPECIFIC_DATETIME,
            },
        )

    if field_type == FieldType.BOOLEAN:
        return frozenset({DEFAULT_VALUE_TRUE, DEFAULT_VALUE_FALSE})

    if field_type == FieldType.RELATION:
        return frozenset({DEFAULT_VALUE_NONE, DEFAULT_VALUE_SPECIFIC_RECORD})

    return frozenset({DEFAULT_VALUE_NONE})


def _choice_option_keys(settings_json: dict[str, Any] | None) -> set[str]:
    options = (settings_json or {}).get("options") or []
    keys: set[str] = set()

    for option in options:
        if isinstance(option, dict) and option.get("key") is not None:
            keys.add(str(option["key"]))

    return keys


def _require_non_negative_int(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{label} должен быть целым числом >= 0")

    if value < 0:
        raise ValueError(f"{label} должен быть >= 0")

    return value


def _parse_iso_date(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("default_value.value должен быть ISO date string")

    try:
        date.fromisoformat(value.strip())
    except ValueError as exc:
        raise ValueError("default_value.value должен быть валидной ISO date") from exc

    return value.strip()


def _parse_iso_datetime(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("default_value.value должен быть ISO datetime string")

    raw = value.strip()

    try:
        datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("default_value.value должен быть валидным ISO datetime") from exc

    return raw


def validate_default_value_json(
    *,
    field_type: FieldType | str,
    default_value_json: Any | None,
    settings_json: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    ft = FieldType(field_type) if not isinstance(field_type, FieldType) else field_type

    if ft in NO_DEFAULT_FIELD_TYPES:
        if default_value_json is not None:
            raise ValueError("default_value_json для file field должен быть null")
        return None

    normalized = normalize_default_value_json(default_value_json, ft)
    assert normalized is not None

    scenario_type = normalized["type"]
    value = normalized.get("value")
    allowed = _allowed_types_for_field(ft)

    if scenario_type not in allowed:
        raise ValueError(
            f"default_value.type '{scenario_type}' недопустим для field_type={ft.value}",
        )

    if scenario_type == DEFAULT_VALUE_NONE:
        if value is not None:
            raise ValueError("default_value.value должен быть null при type=none")
        return normalized

    if scenario_type == DEFAULT_VALUE_CONSTANT:
        if ft == FieldType.NUMBER:
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ValueError("default_value.value для number должен быть числом")
        elif ft == FieldType.UUID:
            if not isinstance(value, str) or not value.strip():
                raise ValueError("default_value.value для uuid должен быть непустой строкой")
            try:
                UUID(value.strip())
            except ValueError as exc:
                raise ValueError("default_value.value для uuid должен быть валидным UUID") from exc
        else:
            if not isinstance(value, str):
                raise ValueError("default_value.value для text должен быть строкой")
        return normalized

    if scenario_type == DEFAULT_VALUE_OPTION:
        option_keys = _choice_option_keys(settings_json)

        if not option_keys:
            raise ValueError(
                "default_value.type=option требует непустой settings_json.options",
            )

        if not isinstance(value, str) or value not in option_keys:
            raise ValueError(
                "default_value.value должен быть ключом из settings_json.options",
            )

        return normalized

    if scenario_type == DEFAULT_VALUE_CURRENT_USER:
        if value is not None:
            raise ValueError("default_value.value должен быть null при type=current_user")
        return normalized

    if scenario_type == DEFAULT_VALUE_SPECIFIC_USER:
        if isinstance(value, bool) or not isinstance(value, (int, str)):
            raise ValueError("default_value.value для specific_user должен быть user_id")
        return normalized

    if scenario_type == DEFAULT_VALUE_TODAY:
        if value is not None:
            raise ValueError("default_value.value должен быть null при type=today")
        return normalized

    if scenario_type == DEFAULT_VALUE_TODAY_PLUS_DAYS:
        _require_non_negative_int(value, "default_value.value (дни)")
        return normalized

    if scenario_type == DEFAULT_VALUE_SPECIFIC_DATE:
        normalized["value"] = _parse_iso_date(value)
        return normalized

    if scenario_type == DEFAULT_VALUE_NOW:
        if value is not None:
            raise ValueError("default_value.value должен быть null при type=now")
        return normalized

    if scenario_type == DEFAULT_VALUE_NOW_PLUS_HOURS:
        _require_non_negative_int(value, "default_value.value (часы)")
        return normalized

    if scenario_type == DEFAULT_VALUE_SPECIFIC_DATETIME:
        normalized["value"] = _parse_iso_datetime(value)
        return normalized

    if scenario_type in {DEFAULT_VALUE_TRUE, DEFAULT_VALUE_FALSE}:
        if value is not None:
            raise ValueError("default_value.value должен быть null для boolean default")
        return normalized

    if scenario_type == DEFAULT_VALUE_SPECIFIC_RECORD:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(
                "default_value.value для specific_record должен быть UUID записи",
            )

        try:
            UUID(value.strip())
        except ValueError as exc:
            raise ValueError(
                "default_value.value для specific_record должен быть валидным UUID",
            ) from exc

        normalized["value"] = value.strip()
        return normalized

    raise ValueError(f"Неизвестный default_value.type: {scenario_type}")


def _resolve_now(ctx: DefaultValueResolveContext) -> datetime:
    return ctx.now or datetime.now(timezone.utc)


def resolve_default_value(
    *,
    field_type: FieldType | str,
    default_value_json: Any | None,
    settings_json: dict[str, Any] | None = None,
    context: DefaultValueResolveContext | None = None,
) -> Any | None:
    """Resolve configured default to a runtime scalar value, or ``None`` if not applicable."""
    ft = FieldType(field_type) if not isinstance(field_type, FieldType) else field_type
    ctx = context or DefaultValueResolveContext()

    if ft in NO_DEFAULT_FIELD_TYPES or is_relation_field_type_scalar_excluded(ft):
        return None

    normalized = normalize_default_value_json(default_value_json, ft)

    if normalized is None:
        return None

    scenario_type = normalized["type"]
    value = normalized.get("value")

    if scenario_type == DEFAULT_VALUE_NONE:
        return None

    if scenario_type == DEFAULT_VALUE_CONSTANT:
        return value

    if scenario_type == DEFAULT_VALUE_OPTION:
        if ft == FieldType.MULTI_CHOICE:
            return [str(value)]
        return str(value)

    if scenario_type == DEFAULT_VALUE_CURRENT_USER:
        return ctx.current_user_id

    if scenario_type == DEFAULT_VALUE_SPECIFIC_USER:
        return int(value) if value is not None else None

    if scenario_type == DEFAULT_VALUE_TODAY:
        return _resolve_now(ctx).date().isoformat()

    if scenario_type == DEFAULT_VALUE_TODAY_PLUS_DAYS:
        days = int(value or 0)
        return (_resolve_now(ctx).date() + timedelta(days=days)).isoformat()

    if scenario_type == DEFAULT_VALUE_SPECIFIC_DATE:
        return str(value)

    if scenario_type == DEFAULT_VALUE_NOW:
        return _resolve_now(ctx).isoformat()

    if scenario_type == DEFAULT_VALUE_NOW_PLUS_HOURS:
        hours = int(value or 0)
        return (_resolve_now(ctx) + timedelta(hours=hours)).isoformat()

    if scenario_type == DEFAULT_VALUE_SPECIFIC_DATETIME:
        return str(value)

    if scenario_type == DEFAULT_VALUE_TRUE:
        return True

    if scenario_type == DEFAULT_VALUE_FALSE:
        return False

    if scenario_type == DEFAULT_VALUE_SPECIFIC_RECORD:
        return str(value)

    return None


def is_relation_field_type_scalar_excluded(field_type: FieldType | str) -> bool:
    ft = FieldType(field_type) if not isinstance(field_type, FieldType) else field_type
    return ft == FieldType.RELATION


def apply_defaults_to_values(
    *,
    fields: list[dict[str, Any]],
    values: dict[str, Any],
    context: DefaultValueResolveContext | None = None,
) -> dict[str, Any]:
    """Merge field defaults into ``values`` for keys absent from the incoming payload."""
    merged = dict(values)
    ctx = context or DefaultValueResolveContext()

    for field in fields:
        key = field.get("key")

        if not key or key in merged:
            continue

        field_type = field.get("field_type", "")

        if is_relation_field_type_scalar_excluded(field_type):
            continue

        resolved = resolve_default_value(
            field_type=field_type,
            default_value_json=field.get("default_value_json"),
            settings_json=field.get("settings_json"),
            context=ctx,
        )

        if resolved is not None:
            merged[key] = resolved

    return merged
