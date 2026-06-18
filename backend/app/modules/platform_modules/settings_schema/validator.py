"""Validation for platform module settings_schema contracts."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.modules.calendar.constants import CALENDAR_EVENT_TYPES
from app.modules.platform_modules.settings_schema.constants import (
    FIELD_OWNERS,
    FIELD_TYPES,
    PERMISSION_ROLES,
    SCHEMA_BLOCKS,
    TEMPLATE_KINDS,
)

_TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
_TZDATA_AVAILABLE: bool | None = None


def _tzdata_available() -> bool:
    global _TZDATA_AVAILABLE
    if _TZDATA_AVAILABLE is None:
        try:
            import tzdata  # noqa: F401
        except ImportError:
            _TZDATA_AVAILABLE = False
        else:
            _TZDATA_AVAILABLE = True
    return _TZDATA_AVAILABLE


class SettingsSchemaValidationError(ValueError):
    """Raised when settings_schema contract is invalid."""


def validate_settings_schema(
    schema: dict[str, Any] | None,
    *,
    expected_module_key: str | None = None,
) -> None:
    if not schema or not isinstance(schema, dict):
        raise SettingsSchemaValidationError("settings_schema must be a non-empty object")

    if not schema.get("schema_version"):
        raise SettingsSchemaValidationError("schema_version is required")

    module_key = schema.get("module_key")
    if not module_key:
        raise SettingsSchemaValidationError("module_key is required")

    if expected_module_key and module_key != expected_module_key:
        raise SettingsSchemaValidationError(
            f"module_key mismatch: expected {expected_module_key}, got {module_key}"
        )

    blocks = schema.get("blocks")
    if not isinstance(blocks, dict):
        raise SettingsSchemaValidationError("blocks must be an object")

    for block_name in SCHEMA_BLOCKS:
        if block_name not in blocks:
            raise SettingsSchemaValidationError(f"blocks.{block_name} is required")
        _validate_block(block_name, blocks[block_name], module_key=module_key)


def _validate_block(block_name: str, block: Any, *, module_key: str) -> None:
    if not isinstance(block, dict):
        raise SettingsSchemaValidationError(f"blocks.{block_name} must be an object")

    if block_name in {"settings", "views", "rules"}:
        _validate_fields_block(block_name, block)
        return

    if block_name == "permissions":
        _validate_permissions_block(block)
        return

    if block_name == "templates":
        _validate_templates_block(block)
        return

    raise SettingsSchemaValidationError(f"Unknown block: {block_name}")


def _validate_fields_block(block_name: str, block: dict[str, Any]) -> None:
    fields = block.get("fields")
    defaults = block.get("defaults")

    if not isinstance(fields, dict) or not fields:
        raise SettingsSchemaValidationError(f"blocks.{block_name}.fields must be a non-empty object")

    if not isinstance(defaults, dict):
        raise SettingsSchemaValidationError(f"blocks.{block_name}.defaults must be an object")

    for field_key, field_def in fields.items():
        if not isinstance(field_def, dict):
            raise SettingsSchemaValidationError(
                f"blocks.{block_name}.fields.{field_key} must be an object"
            )

        field_type = field_def.get("type")
        if field_type not in FIELD_TYPES:
            raise SettingsSchemaValidationError(
                f"blocks.{block_name}.fields.{field_key}.type is invalid: {field_type}"
            )

        owner = field_def.get("owner")
        if owner not in FIELD_OWNERS:
            raise SettingsSchemaValidationError(
                f"blocks.{block_name}.fields.{field_key}.owner is invalid: {owner}"
            )

        if field_def.get("required", True) and field_key not in defaults:
            raise SettingsSchemaValidationError(
                f"blocks.{block_name}.defaults.{field_key} is required"
            )

        default_value = defaults.get(field_key, field_def.get("default"))
        _validate_field_value(
            block_name=block_name,
            field_key=field_key,
            field_def=field_def,
            value=default_value,
        )


def _validate_permissions_block(block: dict[str, Any]) -> None:
    roles = block.get("roles")
    actions = block.get("actions")
    defaults = block.get("defaults")

    if roles != list(PERMISSION_ROLES):
        raise SettingsSchemaValidationError("blocks.permissions.roles must be user/admin/superadmin")

    if not isinstance(actions, dict) or not actions:
        raise SettingsSchemaValidationError("blocks.permissions.actions must be a non-empty object")

    if not isinstance(defaults, dict):
        raise SettingsSchemaValidationError("blocks.permissions.defaults must be an object")

    for action_key, action_def in actions.items():
        if action_def.get("type") != "boolean":
            raise SettingsSchemaValidationError(
                f"blocks.permissions.actions.{action_key}.type must be boolean"
            )
        owner = action_def.get("owner", "Platform")
        if owner not in FIELD_OWNERS:
            raise SettingsSchemaValidationError(
                f"blocks.permissions.actions.{action_key}.owner is invalid: {owner}"
            )

    for role in PERMISSION_ROLES:
        role_defaults = defaults.get(role)
        if not isinstance(role_defaults, dict):
            raise SettingsSchemaValidationError(f"blocks.permissions.defaults.{role} is required")

        for action_key in actions:
            value = role_defaults.get(action_key)
            if not isinstance(value, bool):
                raise SettingsSchemaValidationError(
                    f"blocks.permissions.defaults.{role}.{action_key} must be boolean"
                )


def _validate_templates_block(block: dict[str, Any]) -> None:
    seed_catalog = block.get("seed_catalog")
    defaults = block.get("defaults")

    if not isinstance(seed_catalog, list):
        raise SettingsSchemaValidationError("blocks.templates.seed_catalog must be an array")

    if defaults is not None and not isinstance(defaults, dict):
        raise SettingsSchemaValidationError("blocks.templates.defaults must be an object")

    seen_keys: set[str] = set()
    for index, seed in enumerate(seed_catalog):
        if not isinstance(seed, dict):
            raise SettingsSchemaValidationError(
                f"blocks.templates.seed_catalog[{index}] must be an object"
            )

        seed_key = seed.get("seed_key")
        if not seed_key or not isinstance(seed_key, str):
            raise SettingsSchemaValidationError(
                f"blocks.templates.seed_catalog[{index}].seed_key is required"
            )

        if seed_key in seen_keys:
            raise SettingsSchemaValidationError(
                f"duplicate template seed_key: {seed_key}"
            )
        seen_keys.add(seed_key)

        kind = seed.get("kind")
        if kind not in TEMPLATE_KINDS:
            raise SettingsSchemaValidationError(
                f"blocks.templates.seed_catalog[{index}].kind is invalid: {kind}"
            )


def _validate_field_value(
    *,
    block_name: str,
    field_key: str,
    field_def: dict[str, Any],
    value: Any,
) -> None:
    validation = field_def.get("validation") or {}
    field_type = field_def.get("type")
    nullable = validation.get("nullable", False)

    if value is None:
        if nullable or not field_def.get("required", True):
            return
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} cannot be null"
        )

    if field_type == "boolean" and not isinstance(value, bool):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be boolean"
        )

    if field_type == "string" and not isinstance(value, str):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be string"
        )

    if field_type == "integer" and not isinstance(value, int):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be integer"
        )

    if field_type == "enum":
        allowed = validation.get("enum") or []
        if value not in allowed:
            raise SettingsSchemaValidationError(
                f"blocks.{block_name}.defaults.{field_key} must be one of {allowed}"
            )

    if field_type == "array" and not isinstance(value, list):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be array"
        )

    if field_type == "object" and not isinstance(value, dict):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be object"
        )

    if field_type == "array":
        _validate_array_value(block_name, field_key, value, validation)

    if validation.get("format") == "working_hours":
        _validate_working_hours(block_name, field_key, value)

    if validation.get("format") == "quiet_hours" and value is not None:
        _validate_quiet_hours(block_name, field_key, value)

    if validation.get("format") == "iana_timezone":
        _validate_timezone(block_name, field_key, value)

    if field_key == "retention_days" and value is not None:
        _validate_retention_days(block_name, field_key, value)

    if field_key == "max_participants_per_chat" and value is not None:
        _validate_max_participants_per_chat(block_name, field_key, value)

    if field_key == "enabled_event_types":
        _validate_enabled_event_types(block_name, field_key, value)

    min_value = validation.get("min")
    max_value = validation.get("max")
    if isinstance(value, int):
        if min_value is not None and value < min_value:
            raise SettingsSchemaValidationError(
                f"blocks.{block_name}.defaults.{field_key} must be >= {min_value}"
            )
        if max_value is not None and value > max_value:
            raise SettingsSchemaValidationError(
                f"blocks.{block_name}.defaults.{field_key} must be <= {max_value}"
            )


def _validate_array_value(
    block_name: str,
    field_key: str,
    value: list[Any],
    validation: dict[str, Any],
) -> None:
    subset_of = validation.get("subset_of")
    if subset_of is not None:
        allowed = set(subset_of)
        invalid = [item for item in value if item not in allowed]
        if invalid:
            raise SettingsSchemaValidationError(
                f"blocks.{block_name}.defaults.{field_key} has invalid items: {invalid}"
            )

    enum_items = validation.get("enum_items")
    if enum_items is not None:
        invalid = [item for item in value if item not in enum_items]
        if invalid:
            raise SettingsSchemaValidationError(
                f"blocks.{block_name}.defaults.{field_key} has invalid view items: {invalid}"
            )


def _validate_working_hours(block_name: str, field_key: str, value: dict[str, Any]) -> None:
    start = value.get("start")
    end = value.get("end")
    if not _is_valid_hhmm(start) or not _is_valid_hhmm(end):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} requires HH:mm start/end"
        )
    if _time_to_minutes(start) >= _time_to_minutes(end):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} requires start < end"
        )


def _validate_quiet_hours(block_name: str, field_key: str, value: dict[str, Any]) -> None:
    if not isinstance(value, dict):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be object"
        )
    if value.get("enabled") is False:
        return
    start = value.get("start")
    end = value.get("end")
    if not _is_valid_hhmm(start) or not _is_valid_hhmm(end):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} requires HH:mm start/end"
        )
    timezone = value.get("timezone")
    if timezone:
        _validate_timezone(block_name, field_key, timezone)


def _validate_timezone(block_name: str, field_key: str, value: str) -> None:
    normalized = str(value or "").strip()
    if not normalized:
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be valid IANA timezone"
        )

    if not re.match(
        r"^[A-Za-z0-9_+-]+(?:/[A-Za-z0-9_+-]+(?:/[A-Za-z0-9_+-]+)?)?$",
        normalized,
    ):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be valid IANA timezone"
        )

    if not _tzdata_available():
        return

    try:
        ZoneInfo(normalized)
    except ZoneInfoNotFoundError as exc:
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be valid IANA timezone"
        ) from exc


def _validate_retention_days(block_name: str, field_key: str, value: Any) -> None:
    if not isinstance(value, int) or value < 1 or value > 3650:
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be between 1 and 3650"
        )


def _validate_max_participants_per_chat(block_name: str, field_key: str, value: Any) -> None:
    if not isinstance(value, int) or value < 2 or value > 500:
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be between 2 and 500"
        )


def _validate_enabled_event_types(block_name: str, field_key: str, value: Any) -> None:
    allowed = set(CALENDAR_EVENT_TYPES)
    if not isinstance(value, list):
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be array"
        )
    invalid = [item for item in value if item not in allowed]
    if invalid:
        raise SettingsSchemaValidationError(
            f"blocks.{block_name}.defaults.{field_key} must be subset of CALENDAR_EVENT_TYPES"
        )


def _is_valid_hhmm(value: Any) -> bool:
    return isinstance(value, str) and _TIME_PATTERN.match(value) is not None


def _time_to_minutes(value: str) -> int:
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def count_schema_fields(schema: dict[str, Any]) -> dict[str, int]:
    blocks = schema.get("blocks") or {}
    settings_count = len((blocks.get("settings") or {}).get("fields") or {})
    views_count = len((blocks.get("views") or {}).get("fields") or {})
    rules_count = len((blocks.get("rules") or {}).get("fields") or {})
    permissions_count = len((blocks.get("permissions") or {}).get("actions") or {})
    templates_count = len((blocks.get("templates") or {}).get("seed_catalog") or [])
    return {
        "settings": settings_count,
        "permissions": permissions_count,
        "views": views_count,
        "rules": rules_count,
        "templates": templates_count,
        "total": settings_count + views_count + rules_count + permissions_count + templates_count,
    }
