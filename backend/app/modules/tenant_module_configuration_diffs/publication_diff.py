"""Configuration diff helpers for publication pipeline offers."""

from __future__ import annotations

from typing import Any

from app.modules.tenant_module_configurations.constants import DEFAULT_CONFIG_VERSION
from app.modules.tenant_module_configurations.models import TenantModuleConfiguration
from app.modules.tenant_module_configuration_diffs.diff_generator import generate_configuration_diff_payload


def build_target_configuration_from_publication_snapshot(
    snapshot_payload: dict[str, Any],
) -> dict[str, Any]:
    """Build apply/diff target configuration from immutable publication snapshot."""
    payload = dict(snapshot_payload or {})
    schema_version = str(
        payload.get("schema_version")
        or payload.get("config_version")
        or DEFAULT_CONFIG_VERSION
    )
    return {
        "settings": dict(payload.get("settings") or {}),
        "permissions": dict(payload.get("permissions") or {}),
        "views": dict(payload.get("views") or {}),
        "rules": dict(payload.get("rules") or {}),
        "templates": dict(payload.get("templates") or {}),
        "schema_version": schema_version,
        "config_version": str(payload.get("config_version") or schema_version),
    }


def build_publication_configuration_diff(
    *,
    current_configuration: TenantModuleConfiguration,
    publication_snapshot: dict[str, Any],
) -> dict[str, Any]:
    """Diff current tenant configuration against publication snapshot (not manifest defaults)."""
    target_configuration = build_target_configuration_from_publication_snapshot(publication_snapshot)
    return generate_configuration_diff_payload(
        current_configuration=current_configuration,
        target_configuration=target_configuration,
    )
