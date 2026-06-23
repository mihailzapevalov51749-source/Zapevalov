"""Tests for Publish Orchestrator foundation + materialization + verify + activate + pin (WI-IMPL-006–010)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.platform_deployment_registry.constants import (
  PlatformDeploymentKind,
  PlatformDeploymentStatus,
  PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_publish_orchestrator.constants import (
  PUBLISH_ORCHESTRATOR_MANIFEST_KEY,
  PublishExtensionStatus,
  PublishOrchestratorStatus,
  PublishPhase,
)
from app.modules.platform_publish_orchestrator.orchestrator import PublishOrchestrator
from app.modules.platform_publish_orchestrator.service import build_publish_context, run_publish
from app.modules.platform_publish_orchestrator.template_runtime_activation import (
  TemplateActivationResult,
)
from app.modules.platform_publish_orchestrator.template_runtime_materialization import (
  TemplateMaterializationResult,
)
from app.modules.platform_publish_orchestrator.types import PublishContext, PublishResult
from app.modules.platform_release_provenance.types import VerifyIssue, VerifyResult


def _package(*, status: str = "published", build_id: int = 9) -> SimpleNamespace:
  return SimpleNamespace(
    id=77,
    package_key="PKG-20260619-0077",
    platform_version="2.0.0",
    status=status,
    build_id=build_id,
    package_manifest_json={"schema_revision": "api-adapter-v2"},
  )


def _build() -> SimpleNamespace:
  return SimpleNamespace(
    id=9,
    build_key="BLD-20260619-0009",
    commit_sha="d" * 40,
  )


def _deployment(deployment_id: int = 501) -> SimpleNamespace:
  return SimpleNamespace(
    id=deployment_id,
    deployment_key="DPL-20260619-0501",
    status=PlatformDeploymentStatus.PLANNED.value,
    deployment_manifest_json={},
    release_package_id=77,
    target_tenant_id=1,
    target_environment_type="template",
    deployment_kind=PlatformDeploymentKind.TEMPLATE_PUBLISH.value,
  )


class _FakeDb:
  def __init__(
    self,
    package: SimpleNamespace | None = None,
    build: SimpleNamespace | None = None,
  ) -> None:
    self._package = package
    self._build = build or _build()
    self.commit_calls = 0
    self.refresh_calls = 0

  def query(self, model) -> MagicMock:
    query = MagicMock()
    query.filter.return_value = query
    model_name = getattr(model, "__name__", str(model))
    if model_name == "PlatformReleasePackage":
      query.one_or_none.return_value = self._package
      query.one.return_value = self._package
    else:
      query.one.return_value = self._build
    return query

  def commit(self) -> None:
    self.commit_calls += 1

  def refresh(self, obj) -> None:
    self.refresh_calls += 1
    if not getattr(obj, "deployment_manifest_json", None):
      obj.deployment_manifest_json = {}


def _context(**overrides) -> PublishContext:
  base = build_publish_context(
    package=_package(),
    deployment_kind=PlatformDeploymentKind.TEMPLATE_PUBLISH.value,
    target_environment_type=PlatformDeploymentTargetEnvironmentType.TEMPLATE.value,
    target_tenant_id=1,
    deployment_key="DPL-20260619-0999",
  )
  for key, value in overrides.items():
    setattr(base, key, value)
  return base


def _materialization_result() -> TemplateMaterializationResult:
  from pathlib import Path

  release_dir = Path("/tmp/release-099")
  return TemplateMaterializationResult(
    release_id="release-099",
    release_dir=release_dir,
    manifest_path=release_dir / "manifest.json",
  )


def test_build_publish_context_contract() -> None:
  context = _context()
  assert context.release_package_id == 77
  assert context.package_key == "PKG-20260619-0077"
  assert context.platform_version == "2.0.0"
  assert context.deployment_kind == PlatformDeploymentKind.TEMPLATE_PUBLISH.value
  assert context.target_environment_type == "template"
  assert context.target_tenant_id == 1
  assert context.target_schema_revision == "api-adapter-v2"


def test_publish_result_contract_fields() -> None:
  result = PublishResult(
    status=PublishOrchestratorStatus.IN_PROGRESS,
    release_package_id=77,
    current_phase=PublishPhase.VERIFY_PENDING,
    deployment_id=501,
    deployment_key="DPL-20260619-0501",
    materialized_release_id="release-099",
    errors=[],
  )
  payload = result.to_dict()
  assert payload["status"] == "in_progress"
  assert payload["deployment_id"] == 501
  assert payload["current_phase"] == "verify_pending"
  assert payload["materialized_release_id"] == "release-099"
  assert payload["errors"] == []


def _passed_verify_result() -> VerifyResult:
  return VerifyResult(
    status="passed",
    build_match=True,
    package_match=True,
    manifest_match=True,
    runtime_match=True,
    drift_detected=False,
  )


def _failed_verify_result() -> VerifyResult:
  return VerifyResult(
    status="failed",
    build_match=False,
    package_match=False,
    manifest_match=False,
    runtime_match=False,
    drift_detected=True,
    issues=[VerifyIssue("RELEASE_MISSING", "missing runtime", "runtime")],
  )


def _activation_result() -> TemplateActivationResult:
  from pathlib import Path

  release_dir = Path("/tmp/release-099")
  return TemplateActivationResult(
    release_id="release-099",
    release_dir=release_dir,
    current_link=Path("/tmp/runtime/template/current"),
    previous_release_id="release-098",
  )


def test_orchestrator_audit_remains_stub(monkeypatch) -> None:
  db = _FakeDb(_package())
  orchestrator = PublishOrchestrator(db)  # type: ignore[arg-type]
  context = _context()
  deployment = _deployment()

  result = orchestrator.audit(context, deployment)  # type: ignore[arg-type]
  assert result.status == PublishExtensionStatus.NOT_IMPLEMENTED
  assert result.phase == PublishPhase.AUDIT_PENDING


def _pinned_environment_version() -> SimpleNamespace:
  return SimpleNamespace(
    id=901,
    platform_version="2.0.0",
    environment_key="TEMPLATE",
  )


def test_run_publish_full_template_flow_reaches_version_pinned(monkeypatch) -> None:
  db = _FakeDb(_package())
  created = _deployment()
  audit_calls: list[str] = []
  verify_audit_calls: list[str] = []
  activation_audit_calls: list[str] = []
  pin_audit_calls: list[int] = []

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.deployment_registry_service.create_deployment",
    lambda *_args, **_kwargs: created,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.materialize_template_release",
    lambda **_kwargs: _materialization_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_materialization_audit",
    lambda _db, *, phase, **_kwargs: audit_calls.append(phase),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.run_deployment_verify_gate",
    lambda _db, _dep: _passed_verify_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_verify_audit",
    lambda _db, *, phase, **_kwargs: verify_audit_calls.append(phase),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.activate_template_release",
    lambda **_kwargs: _activation_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_activation_audit",
    lambda _db, *, phase, **_kwargs: activation_audit_calls.append(phase),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.pin_template_environment_version",
    lambda _db, **_kwargs: _pinned_environment_version(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_version_pin_audit",
    lambda _db, *, environment_version_id, **_kwargs: pin_audit_calls.append(
      environment_version_id
    ),
  )

  result = run_publish(db, _context())  # type: ignore[arg-type]

  assert result.status == PublishOrchestratorStatus.IN_PROGRESS
  assert result.current_phase == PublishPhase.VERSION_PINNED
  assert result.materialized_release_id == "release-099"
  assert result.errors == []
  manifest = created.deployment_manifest_json
  assert manifest["materialized_release_id"] == "release-099"
  assert manifest["runtime_slot_key"] == "template"
  assert manifest["verify_proof"]["status"] == "passed"
  assert manifest["activation_status"] == "activated"
  assert manifest["activated_release_id"] == "release-099"
  assert manifest["activated_at"].endswith("Z")
  assert manifest["version_pin_status"] == "pinned"
  assert manifest["version_pin"]["platform_version"] == "2.0.0"
  assert manifest["version_pin"]["activated_release_id"] == "release-099"
  assert manifest[PUBLISH_ORCHESTRATOR_MANIFEST_KEY]["current_phase"] == "version_pinned"
  assert manifest[PUBLISH_ORCHESTRATOR_MANIFEST_KEY]["extension_points"]["verify"] == "completed"
  assert manifest[PUBLISH_ORCHESTRATOR_MANIFEST_KEY]["extension_points"]["activate"] == "completed"
  assert manifest[PUBLISH_ORCHESTRATOR_MANIFEST_KEY]["extension_points"]["pin_version"] == "completed"
  assert audit_calls == ["started", "succeeded"]
  assert verify_audit_calls == ["started", "passed"]
  assert activation_audit_calls == ["started", "succeeded"]
  assert pin_audit_calls == [901]


def test_run_publish_fails_when_package_not_published() -> None:
  db = _FakeDb(_package(status="ready"))
  result = run_publish(db, _context())  # type: ignore[arg-type]
  assert result.status == PublishOrchestratorStatus.FAILED
  assert result.current_phase == PublishPhase.FAILED
  assert result.errors


def test_run_publish_rejects_invalid_deployment_kind() -> None:
  db = _FakeDb(_package())
  context = _context(deployment_kind="invalid_kind")
  result = run_publish(db, context)  # type: ignore[arg-type]
  assert result.status == PublishOrchestratorStatus.FAILED
  assert "deployment_kind" in result.errors[0].lower()


def test_orchestrator_does_not_call_mark_succeeded(monkeypatch) -> None:
  db = _FakeDb(_package())
  created = _deployment()

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.deployment_registry_service.create_deployment",
    lambda *_args, **_kwargs: created,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.materialize_template_release",
    lambda **_kwargs: _materialization_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_materialization_audit",
    lambda *_args, **_kwargs: None,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.run_deployment_verify_gate",
    lambda _db, _dep: _passed_verify_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_verify_audit",
    lambda *_args, **_kwargs: None,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.activate_template_release",
    lambda **_kwargs: _activation_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_activation_audit",
    lambda *_args, **_kwargs: None,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.pin_template_environment_version",
    lambda _db, **_kwargs: _pinned_environment_version(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_version_pin_audit",
    lambda *_args, **_kwargs: None,
  )

  def _forbidden(*_args, **_kwargs):
    raise AssertionError("mark_succeeded must not be called in publish orchestrator")

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.deployment_registry_service.mark_succeeded",
    _forbidden,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.deployment_registry_service.start_deployment",
    _forbidden,
  )

  result = run_publish(db, _context())  # type: ignore[arg-type]
  assert result.status == PublishOrchestratorStatus.IN_PROGRESS
  assert result.current_phase == PublishPhase.VERSION_PINNED


def test_run_publish_verify_failed_stops_at_verify_failed(monkeypatch) -> None:
  db = _FakeDb(_package())
  created = _deployment()

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.deployment_registry_service.create_deployment",
    lambda *_args, **_kwargs: created,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.materialize_template_release",
    lambda **_kwargs: _materialization_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_materialization_audit",
    lambda *_args, **_kwargs: None,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.run_deployment_verify_gate",
    lambda _db, _dep: _failed_verify_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_verify_audit",
    lambda *_args, **_kwargs: None,
  )

  result = run_publish(db, _context())  # type: ignore[arg-type]

  assert result.status == PublishOrchestratorStatus.FAILED
  assert result.current_phase == PublishPhase.VERIFY_FAILED
  assert result.errors
  manifest = created.deployment_manifest_json
  assert manifest["verify_proof"]["status"] == "failed"
  assert manifest[PUBLISH_ORCHESTRATOR_MANIFEST_KEY]["current_phase"] == "verify_failed"
  assert manifest[PUBLISH_ORCHESTRATOR_MANIFEST_KEY]["extension_points"]["verify"] == "failed"


def test_verify_uses_run_deployment_verify_gate(monkeypatch) -> None:
  db = _FakeDb(_package())
  orchestrator = PublishOrchestrator(db)  # type: ignore[arg-type]
  deployment = _deployment()
  deployment.deployment_manifest_json = {
    "materialized_release_id": "release-099",
    "runtime_slot_key": "template",
  }
  gate_calls: list[int] = []

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.run_deployment_verify_gate",
    lambda _db, dep: gate_calls.append(dep.id) or _passed_verify_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_verify_audit",
    lambda *_args, **_kwargs: None,
  )

  result = orchestrator.verify(_context(), deployment)  # type: ignore[arg-type]

  assert gate_calls == [501]
  assert result.status == PublishExtensionStatus.COMPLETED
  assert result.phase == PublishPhase.VERIFY_PASSED
  assert deployment.deployment_manifest_json["verify_proof"]["status"] == "passed"


def test_activate_blocked_without_verify_proof(monkeypatch) -> None:
  db = _FakeDb(_package())
  orchestrator = PublishOrchestrator(db)  # type: ignore[arg-type]
  deployment = _deployment()
  deployment.deployment_manifest_json = {"materialized_release_id": "release-099"}
  audit_phases: list[str] = []

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_activation_audit",
    lambda _db, *, phase, **_kwargs: audit_phases.append(phase),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.activate_template_release",
    lambda **_kwargs: (_ for _ in ()).throw(AssertionError("must not activate")),
  )

  result = orchestrator.activate(_context(), deployment)  # type: ignore[arg-type]

  assert result.status == PublishExtensionStatus.FAILED
  assert result.phase == PublishPhase.ACTIVATION_FAILED
  assert deployment.deployment_manifest_json["activation_status"] == "failed"
  assert audit_phases == ["failed"]


def test_activate_blocked_with_drift_verify_proof(monkeypatch) -> None:
  db = _FakeDb(_package())
  orchestrator = PublishOrchestrator(db)  # type: ignore[arg-type]
  deployment = _deployment()
  deployment.deployment_manifest_json = {
    "materialized_release_id": "release-099",
    "verify_proof": {"status": "passed", "drift_detected": True},
  }

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_activation_audit",
    lambda *_args, **_kwargs: None,
  )

  result = orchestrator.activate(_context(), deployment)  # type: ignore[arg-type]

  assert result.status == PublishExtensionStatus.FAILED
  assert result.phase == PublishPhase.ACTIVATION_FAILED


def test_activate_success_updates_manifest(monkeypatch) -> None:
  db = _FakeDb(_package())
  orchestrator = PublishOrchestrator(db)  # type: ignore[arg-type]
  deployment = _deployment()
  deployment.deployment_manifest_json = {
    "materialized_release_id": "release-099",
    "verify_proof": {"status": "passed", "drift_detected": False},
  }

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.activate_template_release",
    lambda **_kwargs: _activation_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_activation_audit",
    lambda *_args, **_kwargs: None,
  )

  result = orchestrator.activate(_context(), deployment)  # type: ignore[arg-type]

  assert result.status == PublishExtensionStatus.COMPLETED
  assert result.phase == PublishPhase.ACTIVATED
  manifest = deployment.deployment_manifest_json
  assert manifest["activation_status"] == "activated"
  assert manifest["activated_release_id"] == "release-099"
  assert manifest["activated_at"]


def test_materialize_failure_records_audit_and_returns_failed(monkeypatch) -> None:
  db = _FakeDb(_package())
  orchestrator = PublishOrchestrator(db)  # type: ignore[arg-type]
  deployment = _deployment()
  audit_phases: list[str] = []

  def _raise_disk(**_kwargs):
    raise RuntimeError("disk full")

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.materialize_template_release",
    _raise_disk,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_materialization_audit",
    lambda _db, *, phase, **_kwargs: audit_phases.append(phase),
  )

  result = orchestrator.materialize(_context(), deployment)  # type: ignore[arg-type]

  assert result.status == PublishExtensionStatus.FAILED
  assert audit_phases == ["started", "failed"]


def test_pin_version_blocked_without_activation(monkeypatch) -> None:
  db = _FakeDb(_package())
  orchestrator = PublishOrchestrator(db)  # type: ignore[arg-type]
  deployment = _deployment()
  deployment.deployment_manifest_json = {
    "materialized_release_id": "release-099",
    "verify_proof": {"status": "passed", "drift_detected": False},
  }

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.pin_template_environment_version",
    lambda **_kwargs: (_ for _ in ()).throw(AssertionError("must not pin")),
  )

  result = orchestrator.pin_version(_context(), deployment)  # type: ignore[arg-type]

  assert result.status == PublishExtensionStatus.FAILED
  assert result.phase == PublishPhase.VERSION_PIN_FAILED
  assert deployment.deployment_manifest_json["version_pin_status"] == "failed"


def test_pin_version_success_updates_manifest_and_registry(monkeypatch) -> None:
  db = _FakeDb(_package())
  orchestrator = PublishOrchestrator(db)  # type: ignore[arg-type]
  deployment = _deployment()
  deployment.deployment_manifest_json = {
    "materialized_release_id": "release-099",
    "verify_proof": {"status": "passed", "drift_detected": False},
    "activation_status": "activated",
    "activated_release_id": "release-099",
    "activated_at": "2026-06-19T12:00:00Z",
  }
  pin_calls: list[str] = []

  def _pin(_db, **kwargs):
    pin_calls.append(kwargs["activated_release_id"])
    return _pinned_environment_version()

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.pin_template_environment_version",
    _pin,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_version_pin_audit",
    lambda *_args, **_kwargs: None,
  )

  result = orchestrator.pin_version(_context(), deployment)  # type: ignore[arg-type]

  assert result.status == PublishExtensionStatus.COMPLETED
  assert result.phase == PublishPhase.VERSION_PINNED
  assert pin_calls == ["release-099"]
  manifest = deployment.deployment_manifest_json
  assert manifest["version_pin_status"] == "pinned"
  assert manifest["version_pin"]["platform_version"] == "2.0.0"
  assert manifest["version_pin"]["activated_release_id"] == "release-099"


def test_activate_failure_does_not_pin_version(monkeypatch) -> None:
  db = _FakeDb(_package())
  created = _deployment()
  pin_called = {"value": False}

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.deployment_registry_service.create_deployment",
    lambda *_args, **_kwargs: created,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.materialize_template_release",
    lambda **_kwargs: _materialization_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_materialization_audit",
    lambda *_args, **_kwargs: None,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.run_deployment_verify_gate",
    lambda _db, _dep: _passed_verify_result(),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_verify_audit",
    lambda *_args, **_kwargs: None,
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.activate_template_release",
    lambda **_kwargs: (_ for _ in ()).throw(RuntimeError("activation failed")),
  )
  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.record_template_activation_audit",
    lambda *_args, **_kwargs: None,
  )

  def _pin(_db, **_kwargs):
    pin_called["value"] = True
    return _pinned_environment_version()

  monkeypatch.setattr(
    "app.modules.platform_publish_orchestrator.orchestrator.pin_template_environment_version",
    _pin,
  )

  result = run_publish(db, _context())  # type: ignore[arg-type]

  assert result.status == PublishOrchestratorStatus.FAILED
  assert result.current_phase == PublishPhase.ACTIVATION_FAILED
  assert pin_called["value"] is False
  assert "version_pin" not in (created.deployment_manifest_json or {})
