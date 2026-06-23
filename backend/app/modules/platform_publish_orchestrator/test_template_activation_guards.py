"""Tests for TEMPLATE activation guards (WI-IMPL-009)."""

from __future__ import annotations

from types import SimpleNamespace

from app.modules.platform_publish_orchestrator.template_activation_guards import (
    validate_template_activation_preconditions,
)


def _deployment(**manifest) -> SimpleNamespace:
    return SimpleNamespace(deployment_manifest_json=dict(manifest))


def test_activation_allowed_with_passed_verify_proof() -> None:
    deployment = _deployment(
        materialized_release_id="release-001",
        verify_proof={
            "status": "passed",
            "drift_detected": False,
        },
    )
    allowed, reason = validate_template_activation_preconditions(deployment)
    assert allowed is True
    assert reason == ""


def test_activation_blocked_without_verify_proof() -> None:
    deployment = _deployment(materialized_release_id="release-001")
    allowed, reason = validate_template_activation_preconditions(deployment)
    assert allowed is False
    assert reason == "verify_proof missing"


def test_activation_blocked_when_verify_not_passed() -> None:
    deployment = _deployment(
        materialized_release_id="release-001",
        verify_proof={"status": "failed", "drift_detected": True},
    )
    allowed, reason = validate_template_activation_preconditions(deployment)
    assert allowed is False
    assert reason == "verify_proof.status != passed"


def test_activation_blocked_when_drift_detected() -> None:
    deployment = _deployment(
        materialized_release_id="release-001",
        verify_proof={"status": "passed", "drift_detected": True},
    )
    allowed, reason = validate_template_activation_preconditions(deployment)
    assert allowed is False
    assert reason == "drift_detected"
