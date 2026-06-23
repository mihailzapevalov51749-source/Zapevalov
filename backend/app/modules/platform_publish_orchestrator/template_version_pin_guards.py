"""Version pin guards for TEMPLATE publish (WI-IMPL-010)."""

from __future__ import annotations

from typing import Any


def validate_template_version_pin_preconditions(deployment: Any) -> tuple[bool, str]:
    """Allow version pin only after successful runtime activation."""
    manifest = deployment.deployment_manifest_json if isinstance(
        deployment.deployment_manifest_json, dict
    ) else {}

    if str(manifest.get("activation_status") or "").strip().lower() != "activated":
        return False, "activation_status != activated"

    activated_release_id = manifest.get("activated_release_id")
    if activated_release_id is None or not str(activated_release_id).strip():
        return False, "activated_release_id missing"

    return True, ""
