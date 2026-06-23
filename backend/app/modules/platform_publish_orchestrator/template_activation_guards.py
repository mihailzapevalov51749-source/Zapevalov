"""Activation guards for TEMPLATE publish (WI-IMPL-009)."""

from __future__ import annotations

from typing import Any


def validate_template_activation_preconditions(deployment: Any) -> tuple[bool, str]:
    """Block activation without a passed verify_proof (ADR-PROVENANCE-001 / ADR-SEC-001)."""
    manifest = deployment.deployment_manifest_json if isinstance(
        deployment.deployment_manifest_json, dict
    ) else {}

    verify_proof = manifest.get("verify_proof")
    if not isinstance(verify_proof, dict):
        return False, "verify_proof missing"

    if str(verify_proof.get("status") or "").strip().lower() != "passed":
        return False, "verify_proof.status != passed"

    if bool(verify_proof.get("drift_detected")):
        return False, "drift_detected"

    materialized_release_id = manifest.get("materialized_release_id")
    if materialized_release_id is None or not str(materialized_release_id).strip():
        return False, "materialized_release_id missing"

    return True, ""
