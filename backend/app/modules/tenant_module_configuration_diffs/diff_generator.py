"""Compare tenant module configuration against target manifest defaults."""

from __future__ import annotations

from typing import Any

from app.modules.tenant_module_configurations.models import TenantModuleConfiguration


def _values_equal(left: Any, right: Any) -> bool:
    return left == right


def diff_flat_block(current: dict[str, Any] | None, target: dict[str, Any] | None) -> dict[str, Any]:
    current_values = dict(current or {})
    target_values = dict(target or {})

    current_keys = set(current_values.keys())
    target_keys = set(target_values.keys())

    added = sorted(target_keys - current_keys)
    removed = sorted(current_keys - target_keys)
    changed: list[dict[str, Any]] = []

    for key in sorted(current_keys & target_keys):
        left = current_values[key]
        right = target_values[key]
        if not _values_equal(left, right):
            changed.append({"key": key, "from": left, "to": right})

    return {"added": added, "removed": removed, "changed": changed}


def _collect_permission_actions(permissions: dict[str, Any] | None) -> set[str]:
    actions: set[str] = set()
    for role_values in (permissions or {}).values():
        if isinstance(role_values, dict):
            actions.update(str(key) for key in role_values.keys())
    return actions


def _permission_values_for_action(
    permissions: dict[str, Any] | None,
    action: str,
) -> dict[str, bool | None]:
    values: dict[str, bool | None] = {}
    for role, role_values in (permissions or {}).items():
        if not isinstance(role_values, dict):
            continue
        values[str(role)] = role_values.get(action)
    return values


def diff_permissions_block(
    current: dict[str, Any] | None,
    target: dict[str, Any] | None,
) -> dict[str, Any]:
    current_actions = _collect_permission_actions(current)
    target_actions = _collect_permission_actions(target)

    added = sorted(target_actions - current_actions)
    removed = sorted(current_actions - target_actions)
    changed: list[dict[str, Any]] = []

    for action in sorted(current_actions & target_actions):
        left = _permission_values_for_action(current, action)
        right = _permission_values_for_action(target, action)
        if left != right:
            changed.append({"key": action, "from": left, "to": right})

    return {"added": added, "removed": removed, "changed": changed}


def _normalize_template_seeds(templates: dict[str, Any] | None) -> dict[str, Any]:
    seeds: dict[str, Any] = {}
    catalog = (templates or {}).get("seed_catalog")
    if isinstance(catalog, list):
        for item in catalog:
            if not isinstance(item, dict):
                continue
            seed_key = str(item.get("seed_key") or "").strip()
            if not seed_key:
                continue
            seeds[seed_key] = item.get("payload")
    return seeds


def diff_templates_block(
    current: dict[str, Any] | None,
    target: dict[str, Any] | None,
) -> dict[str, Any]:
    current_seeds = _normalize_template_seeds(current)
    target_seeds = _normalize_template_seeds(target)

    added_seeds = sorted(set(target_seeds.keys()) - set(current_seeds.keys()))
    removed_seeds = sorted(set(current_seeds.keys()) - set(target_seeds.keys()))
    changed_seeds: list[dict[str, Any]] = []

    for seed_key in sorted(set(current_seeds.keys()) & set(target_seeds.keys())):
        left = current_seeds[seed_key]
        right = target_seeds[seed_key]
        if not _values_equal(left, right):
            changed_seeds.append({"key": seed_key, "from": left, "to": right})

    return {
        "added_seeds": added_seeds,
        "removed_seeds": removed_seeds,
        "changed_seeds": changed_seeds,
    }


def build_target_configuration_from_schema(schema: dict[str, Any]) -> dict[str, Any]:
    from app.modules.tenant_module_configurations.validation import extract_defaults_from_schema

    defaults = extract_defaults_from_schema(schema)
    templates_block = (schema.get("blocks") or {}).get("templates") or {}
    defaults["templates"] = dict(templates_block)
    return defaults


def generate_configuration_diff_payload(
    *,
    current_configuration: TenantModuleConfiguration,
    target_configuration: dict[str, Any],
) -> dict[str, Any]:
    return {
        "settings": diff_flat_block(current_configuration.settings, target_configuration.get("settings")),
        "permissions": diff_permissions_block(
            current_configuration.permissions,
            target_configuration.get("permissions"),
        ),
        "views": diff_flat_block(current_configuration.views, target_configuration.get("views")),
        "rules": diff_flat_block(current_configuration.rules, target_configuration.get("rules")),
        "templates": diff_templates_block(
            current_configuration.templates,
            target_configuration.get("templates"),
        ),
    }
