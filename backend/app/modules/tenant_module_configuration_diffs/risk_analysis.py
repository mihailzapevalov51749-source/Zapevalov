"""Risk analysis for tenant module configuration diffs."""

from __future__ import annotations

from typing import Any

from app.modules.tenant_module_configuration_diffs.constants import ConfigurationDiffRiskLevel


def _block_has_changes(block: dict[str, Any] | None) -> bool:
    if not isinstance(block, dict):
        return False
    for key in ("added", "removed", "changed", "added_seeds", "removed_seeds", "changed_seeds"):
        values = block.get(key)
        if isinstance(values, list) and values:
            return True
    return False


def compute_configuration_diff_risk_level(diff_payload: dict[str, Any] | None) -> str:
    payload = diff_payload if isinstance(diff_payload, dict) else {}

    settings = payload.get("settings") or {}
    permissions = payload.get("permissions") or {}
    views = payload.get("views") or {}
    rules = payload.get("rules") or {}
    templates = payload.get("templates") or {}

    if permissions.get("removed") or rules.get("removed") or templates.get("removed_seeds"):
        return ConfigurationDiffRiskLevel.CRITICAL

    if permissions.get("changed") or permissions.get("added") or rules.get("changed"):
        return ConfigurationDiffRiskLevel.HIGH

    if settings.get("changed") or views.get("changed") or settings.get("removed") or views.get("removed"):
        return ConfigurationDiffRiskLevel.MEDIUM

    if (
        settings.get("added")
        or views.get("added")
        or templates.get("added_seeds")
        or rules.get("added")
    ):
        return ConfigurationDiffRiskLevel.LOW

    if _block_has_changes(payload.get("settings")) or _block_has_changes(payload.get("permissions")):
        return ConfigurationDiffRiskLevel.MEDIUM

    return ConfigurationDiffRiskLevel.LOW
