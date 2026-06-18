"""Map configuration diff payload to preview affected_* fields."""

from __future__ import annotations

from typing import Any


def _extract_changed_keys(changed_items: list[Any] | None) -> list[str]:
    keys: list[str] = []
    for item in changed_items or []:
        if isinstance(item, dict):
            key = str(item.get("key") or "").strip()
            if key:
                keys.append(key)
    return keys


def extract_affected_settings(diff_payload: dict[str, Any] | None) -> list[str]:
    block = (diff_payload or {}).get("settings") or {}
    items = list(block.get("added") or [])
    items.extend(block.get("removed") or [])
    items.extend(_extract_changed_keys(block.get("changed")))
    return items


def extract_affected_permissions(diff_payload: dict[str, Any] | None) -> list[str]:
    block = (diff_payload or {}).get("permissions") or {}
    items = list(block.get("added") or [])
    items.extend(block.get("removed") or [])
    items.extend(_extract_changed_keys(block.get("changed")))
    return items


def extract_affected_views(diff_payload: dict[str, Any] | None) -> list[str]:
    block = (diff_payload or {}).get("views") or {}
    items = list(block.get("added") or [])
    items.extend(block.get("removed") or [])
    items.extend(_extract_changed_keys(block.get("changed")))
    return items


def extract_affected_rules(diff_payload: dict[str, Any] | None) -> list[str]:
    block = (diff_payload or {}).get("rules") or {}
    items = list(block.get("added") or [])
    items.extend(block.get("removed") or [])
    items.extend(_extract_changed_keys(block.get("changed")))
    return items


def extract_affected_templates(diff_payload: dict[str, Any] | None) -> list[str]:
    block = (diff_payload or {}).get("templates") or {}
    items = list(block.get("added_seeds") or [])
    items.extend(block.get("removed_seeds") or [])
    items.extend(_extract_changed_keys(block.get("changed_seeds")))
    return items


def apply_diff_to_preview_payload(
    payload: dict[str, Any],
    diff_payload: dict[str, Any] | None,
    *,
    risk_level: str | None = None,
) -> dict[str, Any]:
    next_payload = dict(payload)
    if not isinstance(diff_payload, dict):
        return next_payload

    next_payload["affected_settings"] = extract_affected_settings(diff_payload)
    next_payload["affected_permissions"] = extract_affected_permissions(diff_payload)
    next_payload["affected_views"] = extract_affected_views(diff_payload)
    next_payload["affected_rules"] = extract_affected_rules(diff_payload)
    next_payload["affected_templates"] = extract_affected_templates(diff_payload)

    if risk_level:
        next_payload["risk_level"] = risk_level

    impact_analysis = dict(next_payload.get("impact_analysis") or {})
    impact_analysis["configuration_diff"] = diff_payload
    next_payload["impact_analysis"] = impact_analysis
    return next_payload
