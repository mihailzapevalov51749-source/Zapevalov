"""Tests for TEMPLATE version pin guards (WI-IMPL-010)."""

from __future__ import annotations

from types import SimpleNamespace

from app.modules.platform_publish_orchestrator.template_version_pin_guards import (
    validate_template_version_pin_preconditions,
)


def _deployment(**manifest) -> SimpleNamespace:
    return SimpleNamespace(deployment_manifest_json=manifest)


def test_pin_allowed_after_successful_activation() -> None:
    deployment = _deployment(
        activation_status="activated",
        activated_release_id="release-099",
    )
    allowed, reason = validate_template_version_pin_preconditions(deployment)
    assert allowed is True
    assert reason == ""


def test_pin_blocked_without_activation() -> None:
    deployment = _deployment(materialized_release_id="release-099")
    allowed, reason = validate_template_version_pin_preconditions(deployment)
    assert allowed is False
    assert "activation_status" in reason


def test_pin_blocked_without_activated_release_id() -> None:
    deployment = _deployment(activation_status="activated")
    allowed, reason = validate_template_version_pin_preconditions(deployment)
    assert allowed is False
    assert "activated_release_id" in reason
