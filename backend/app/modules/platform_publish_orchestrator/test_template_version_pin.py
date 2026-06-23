"""Tests for TEMPLATE version pin service (WI-IMPL-010)."""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from app.modules.platform_publish_orchestrator.template_version_pin import (
    VERSION_PIN_SOURCE,
    build_version_pin_proof,
)


def test_build_version_pin_proof_contract() -> None:
    pinned_at = datetime(2026, 6, 19, 12, 0, tzinfo=timezone.utc)
    proof = build_version_pin_proof(
        platform_version="2.0.0",
        activated_release_id="release-099",
        release_package_id=77,
        environment_version_id=42,
        environment_key="TEMPLATE",
        pinned_at=pinned_at,
    )
    assert proof["status"] == "pinned"
    assert proof["platform_version"] == "2.0.0"
    assert proof["activated_release_id"] == "release-099"
    assert proof["release_package_id"] == 77
    assert proof["environment_version_id"] == 42
    assert proof["environment_key"] == "TEMPLATE"
    assert proof["source"] == VERSION_PIN_SOURCE
    assert proof["pinned_at"].endswith("Z")


def test_pin_template_environment_version_delegates_to_registry(monkeypatch) -> None:
    from app.modules.platform_publish_orchestrator.template_version_pin import (
        pin_template_environment_version,
    )

    captured: dict = {}

    def _record(_db, **kwargs):
        captured.update(kwargs)
        return SimpleNamespace(
            id=99,
            platform_version=kwargs["platform_version"],
            environment_key="TEMPLATE",
        )

    monkeypatch.setattr(
        "app.modules.platform_publish_orchestrator.template_version_pin.platform_version_service.record_environment_version",
        _record,
    )

    deployment = SimpleNamespace(deployment_key="DPL-TEST")
    pinned_at = datetime(2026, 6, 19, 12, 0, tzinfo=timezone.utc)
    row = pin_template_environment_version(
        None,  # type: ignore[arg-type]
        deployment=deployment,
        tenant_id=5,
        platform_version="2.0.0",
        activated_release_id="release-099",
        release_package_id=77,
        actor_user_id=3,
        pinned_at=pinned_at,
    )

    assert row.id == 99
    assert captured["tenant_id"] == 5
    assert captured["platform_version"] == "2.0.0"
    assert captured["installed_by_id"] == 3
    assert captured["commit"] is False
    assert "release-099" in captured["notes"]
    assert VERSION_PIN_SOURCE in captured["notes"]
