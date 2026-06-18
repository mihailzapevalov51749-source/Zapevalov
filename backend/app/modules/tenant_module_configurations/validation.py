"""Validate tenant module configuration payloads against manifest settings_schema."""

from __future__ import annotations

from typing import Any

from app.modules.platform_modules.settings_schema.validator import (
    SettingsSchemaValidationError,
    validate_settings_schema,
)


def _schema_has_content(schema: dict[str, Any] | None) -> bool:
    if not schema or not isinstance(schema, dict):
        return False
    blocks = schema.get("blocks")
    if not isinstance(blocks, dict) or not blocks:
        return False
    return bool(schema.get("schema_version")) and bool(schema.get("module_key"))


def is_usable_settings_schema(schema: dict[str, Any] | None) -> bool:
    if not _schema_has_content(schema):
        return False
    try:
        validate_settings_schema(schema, expected_module_key=str(schema.get("module_key") or ""))
    except SettingsSchemaValidationError:
        return False
    return True


def validate_tenant_configuration_against_schema(
    schema: dict[str, Any],
    *,
    settings: dict[str, Any],
    permissions: dict[str, Any],
    views: dict[str, Any],
    rules: dict[str, Any],
    templates: dict[str, Any],
) -> None:
    validate_settings_schema(schema, expected_module_key=str(schema.get("module_key") or ""))

    blocks = schema.get("blocks") or {}
    _validate_values_against_fields_block("settings", blocks.get("settings") or {}, settings)
    _validate_values_against_fields_block("views", blocks.get("views") or {}, views)
    _validate_values_against_fields_block("rules", blocks.get("rules") or {}, rules)
    _validate_permissions_values(blocks.get("permissions") or {}, permissions)

    if not isinstance(templates, dict):
        raise SettingsSchemaValidationError("templates must be an object")


def _validate_values_against_fields_block(
    block_name: str,
    block: dict[str, Any],
    values: dict[str, Any],
) -> None:
    if not isinstance(values, dict):
        raise SettingsSchemaValidationError(f"{block_name} must be an object")

    fields = block.get("fields") or {}
    defaults = block.get("defaults") or {}

    for field_key, field_def in fields.items():
        if not isinstance(field_def, dict):
            continue
        if field_def.get("required", True) and field_key not in values:
            raise SettingsSchemaValidationError(f"{block_name}.{field_key} is required")
        if field_key not in values:
            continue
        _validate_field_value_simple(
            block_name=block_name,
            field_key=field_key,
            field_def=field_def,
            value=values[field_key],
        )

    unknown_keys = set(values.keys()) - set(fields.keys())
    if unknown_keys:
        raise SettingsSchemaValidationError(
            f"{block_name} has unknown keys: {sorted(unknown_keys)}"
        )


def _validate_permissions_values(
    permissions_block: dict[str, Any],
    values: dict[str, Any],
) -> None:
    if not isinstance(values, dict):
        raise SettingsSchemaValidationError("permissions must be an object")

    actions = permissions_block.get("actions") or {}
    roles = permissions_block.get("roles") or ["user", "admin", "superadmin"]

    for role in roles:
        role_values = values.get(role)
        if not isinstance(role_values, dict):
            raise SettingsSchemaValidationError(f"permissions.{role} must be an object")
        for action_key in actions:
            action_value = role_values.get(action_key)
            if not isinstance(action_value, bool):
                raise SettingsSchemaValidationError(
                    f"permissions.{role}.{action_key} must be boolean"
                )


def _validate_field_value_simple(
    *,
    block_name: str,
    field_key: str,
    field_def: dict[str, Any],
    value: Any,
) -> None:
    from app.modules.platform_modules.settings_schema.validator import _validate_field_value

    _validate_field_value(
        block_name=block_name,
        field_key=field_key,
        field_def=field_def,
        value=value,
    )


def extract_defaults_from_schema(schema: dict[str, Any]) -> dict[str, Any]:
    blocks = schema.get("blocks") or {}
    settings_block = blocks.get("settings") or {}
    views_block = blocks.get("views") or {}
    rules_block = blocks.get("rules") or {}
    permissions_block = blocks.get("permissions") or {}
    templates_block = blocks.get("templates") or {}

    return {
        "schema_version": str(schema.get("schema_version") or "1.0.0"),
        "settings": dict(settings_block.get("defaults") or {}),
        "permissions": dict(permissions_block.get("defaults") or {}),
        "views": dict(views_block.get("defaults") or {}),
        "rules": dict(rules_block.get("defaults") or {}),
        "templates": dict(templates_block.get("defaults") or {}),
    }
