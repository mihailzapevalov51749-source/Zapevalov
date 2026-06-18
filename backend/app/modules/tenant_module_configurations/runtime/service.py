"""Runtime service for tenant module configurations."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module
from app.modules.platform_modules.settings_schema.validator import SettingsSchemaValidationError
from app.modules.tenant_module_configurations.constants import (
    ACTIVE_CONFIGURATION_MODULE_KEYS,
    MANIFEST_DEFAULTS_SOURCE,
)
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.runtime.cache import (
    get_cached_runtime_configuration,
    set_cached_runtime_configuration,
)
from app.modules.tenant_module_configurations.runtime.schemas import RuntimeModuleConfigurationOut
from app.modules.tenant_module_configurations.validation import (
    extract_defaults_from_schema,
    validate_tenant_configuration_against_schema,
)

WAVE1_SETTINGS_KEYS: dict[str, tuple[str, ...]] = {
    "runtime.calendar": (
        "default_view",
        "week_starts_on",
        "working_hours",
        "enabled_event_types",
        "default_event_duration_minutes",
    ),
    "runtime.chat": (
        "attachments_enabled",
        "mentions_enabled",
        "reactions_enabled",
        "max_participants_per_chat",
        "message_edit_window_minutes",
    ),
    "runtime.notifications": (
        "enabled_categories",
        "default_priority",
        "overlay_enabled",
        "bell_enabled",
        "quiet_hours",
    ),
}


def _normalize_module_key(module_key: str) -> str:
    return str(module_key or "").strip()


def _load_manifest_defaults(db: Session, module_key: str) -> dict[str, Any]:
    manifest = get_active_manifest_for_module(db, module_key)
    if manifest is None or not isinstance(manifest.settings_schema, dict):
        return {
            "module_version": "1.0.0",
            "config_version": "1.0.0",
            "schema_version": "1.0.0",
            "source": MANIFEST_DEFAULTS_SOURCE,
            "settings": {},
            "permissions": {},
            "views": {},
            "rules": {},
            "templates": {},
            "updated_at": None,
        }

    defaults = extract_defaults_from_schema(manifest.settings_schema)
    return {
        "module_version": str(manifest.module_version or "1.0.0"),
        "config_version": str(defaults.get("schema_version") or "1.0.0"),
        "schema_version": str(defaults.get("schema_version") or "1.0.0"),
        "source": MANIFEST_DEFAULTS_SOURCE,
        "settings": dict(defaults.get("settings") or {}),
        "permissions": dict(defaults.get("permissions") or {}),
        "views": dict(defaults.get("views") or {}),
        "rules": dict(defaults.get("rules") or {}),
        "templates": dict(defaults.get("templates") or {}),
        "updated_at": None,
        "_settings_schema": manifest.settings_schema,
    }


def _resolve_configuration_payload(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> dict[str, Any]:
    row = get_configuration(db, tenant_id=tenant_id, module_key=module_key)
    if row is None:
        return _load_manifest_defaults(db, module_key)

    manifest = get_active_manifest_for_module(db, module_key)
    schema = manifest.settings_schema if manifest and isinstance(manifest.settings_schema, dict) else None

    payload = {
        "module_version": str(row.module_version or "1.0.0"),
        "config_version": str(row.config_version or "1.0.0"),
        "schema_version": str(row.schema_version or "1.0.0"),
        "source": str(row.source or MANIFEST_DEFAULTS_SOURCE),
        "settings": dict(row.settings or {}),
        "permissions": dict(row.permissions or {}),
        "views": dict(row.views or {}),
        "rules": dict(row.rules or {}),
        "templates": dict(row.templates or {}),
        "updated_at": row.updated_at,
        "_settings_schema": schema,
    }

    if schema:
        try:
            validate_tenant_configuration_against_schema(
                schema,
                settings=payload["settings"],
                permissions=payload["permissions"],
                views=payload["views"],
                rules=payload["rules"],
                templates=payload["templates"],
            )
        except SettingsSchemaValidationError:
            defaults = _load_manifest_defaults(db, module_key)
            payload["settings"] = defaults["settings"]
            payload["permissions"] = defaults["permissions"]
            payload["views"] = defaults["views"]
            payload["rules"] = defaults["rules"]
            payload["templates"] = defaults["templates"]
            payload["source"] = MANIFEST_DEFAULTS_SOURCE

    return payload


def _extract_wave1_settings(module_key: str, settings: dict[str, Any]) -> dict[str, Any]:
    keys = WAVE1_SETTINGS_KEYS.get(module_key, ())
    return {key: settings.get(key) for key in keys if key in settings}


def get_runtime_module_configuration(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
    use_cache: bool = True,
) -> RuntimeModuleConfigurationOut:
    normalized_key = _normalize_module_key(module_key)
    if normalized_key not in ACTIVE_CONFIGURATION_MODULE_KEYS:
        raise ValueError(f"Unsupported runtime module key: {module_key}")

    cached = get_cached_runtime_configuration(tenant_id, normalized_key) if use_cache else None
    if cached is not None:
        payload = cached.payload
        cached_at = cached.cached_at
        return RuntimeModuleConfigurationOut(
            tenant_id=int(tenant_id),
            module_key=normalized_key,
            source_version=str(payload.get("source_version") or "1.0.0"),
            configuration_version=str(payload.get("configuration_version") or "1.0.0"),
            schema_version=str(payload.get("schema_version") or "1.0.0"),
            source=str(payload.get("source") or MANIFEST_DEFAULTS_SOURCE),
            settings=dict(payload.get("settings") or {}),
            updated_at=payload.get("updated_at"),
            cache_status="hit",
            last_refresh=cached_at,
        )

    raw = _resolve_configuration_payload(db, tenant_id=tenant_id, module_key=normalized_key)
    runtime_settings = _extract_wave1_settings(normalized_key, dict(raw.get("settings") or {}))

    response_payload = {
        "tenant_id": int(tenant_id),
        "module_key": normalized_key,
        "source_version": str(raw.get("module_version") or "1.0.0"),
        "configuration_version": str(raw.get("config_version") or "1.0.0"),
        "schema_version": str(raw.get("schema_version") or "1.0.0"),
        "source": str(raw.get("source") or MANIFEST_DEFAULTS_SOURCE),
        "settings": runtime_settings,
        "updated_at": raw.get("updated_at"),
    }

    set_cached_runtime_configuration(
        tenant_id,
        normalized_key,
        {
            **response_payload,
            "source_version": response_payload["source_version"],
            "configuration_version": response_payload["configuration_version"],
        },
    )

    return RuntimeModuleConfigurationOut(
        **response_payload,
        cache_status="miss",
        last_refresh=datetime.utcnow(),
    )


def get_runtime_settings(
    db: Session,
    *,
    tenant_id: int | None,
    module_key: str,
) -> dict[str, Any]:
    if tenant_id is None:
        defaults = _load_manifest_defaults(db, _normalize_module_key(module_key))
        return _extract_wave1_settings(_normalize_module_key(module_key), defaults["settings"])

    configuration = get_runtime_module_configuration(
        db,
        tenant_id=int(tenant_id),
        module_key=module_key,
    )
    return dict(configuration.settings or {})
