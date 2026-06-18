"""Helpers to build canonical settings_schema block payloads."""

from __future__ import annotations

from typing import Any


def field_def(
    *,
    field_type: str,
    required: bool = True,
    default: Any = None,
    owner: str = "Platform",
    apply: bool = True,
    validation: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "type": field_type,
        "required": required,
        "default": default,
        "owner": owner,
        "apply": apply,
    }
    if validation:
        payload["validation"] = validation
    return payload


def permission_action_def(
    *,
    required: bool = True,
    owner: str = "Platform",
    apply: bool = True,
) -> dict[str, Any]:
    return {
        "type": "boolean",
        "required": required,
        "owner": owner,
        "apply": apply,
    }


def build_permissions_block(
    *,
    actions: dict[str, dict[str, Any]],
    defaults: dict[str, dict[str, bool]],
    roles: tuple[str, ...] = ("user", "admin", "superadmin"),
) -> dict[str, Any]:
    return {
        "roles": list(roles),
        "actions": actions,
        "defaults": defaults,
    }


def build_templates_block(
    *,
    seed_catalog: list[dict[str, Any]],
    defaults: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "seed_catalog": seed_catalog,
        "defaults": defaults or {},
    }


def build_settings_schema_envelope(
    *,
    module_key: str,
    settings_fields: dict[str, Any],
    settings_defaults: dict[str, Any],
    permissions: dict[str, Any],
    views_fields: dict[str, Any],
    views_defaults: dict[str, Any],
    rules_fields: dict[str, Any],
    rules_defaults: dict[str, Any],
    templates: dict[str, Any],
    schema_version: str = "1.0.0",
) -> dict[str, Any]:
    return {
        "schema_version": schema_version,
        "module_key": module_key,
        "blocks": {
            "settings": {
                "fields": settings_fields,
                "defaults": settings_defaults,
            },
            "permissions": permissions,
            "views": {
                "fields": views_fields,
                "defaults": views_defaults,
            },
            "rules": {
                "fields": rules_fields,
                "defaults": rules_defaults,
            },
            "templates": templates,
        },
    }
