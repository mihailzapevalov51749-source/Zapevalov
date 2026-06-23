"""Publish Orchestrator — coordinator for publish lifecycle (WI-IMPL-006–010).

Foundation: creates deployment and records lifecycle phases.
WI-IMPL-007: materializes TEMPLATE runtime release.
WI-IMPL-008: verifies materialized release via Digest Bridge.
WI-IMPL-009: activates TEMPLATE current junction after verify.
WI-IMPL-010: pins TEMPLATE version in platform_environment_versions after activate.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry import service as deployment_registry_service
from app.modules.platform_deployment_registry.constants import PlatformDeploymentKind
from app.modules.platform_deployment_registry.deployment_kind import is_valid_deployment_kind
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_publish_orchestrator.constants import (
  PUBLISH_ORCHESTRATOR_MANIFEST_KEY,
  PublishExtensionStatus,
  PublishOrchestratorStatus,
  PublishPhase,
)
from app.modules.platform_publish_orchestrator.template_activation_audit import (
  record_template_activation_audit,
)
from app.modules.platform_publish_orchestrator.template_activation_guards import (
  validate_template_activation_preconditions,
)
from app.modules.platform_publish_orchestrator.template_materialization_audit import (
  record_template_materialization_audit,
)
from app.modules.platform_publish_orchestrator.template_runtime_activation import (
  TemplateActivationError,
  activate_template_release,
)
from app.modules.platform_publish_orchestrator.template_runtime_materialization import (
  TemplateMaterializationError,
  materialize_template_release,
)
from app.modules.platform_publish_orchestrator.template_verify_audit import (
  record_template_verify_audit,
)
from app.modules.platform_publish_orchestrator.template_version_pin import (
  build_version_pin_proof,
  pin_template_environment_version,
)
from app.modules.platform_publish_orchestrator.template_version_pin_audit import (
  record_template_version_pin_audit,
)
from app.modules.platform_publish_orchestrator.template_version_pin_guards import (
  validate_template_version_pin_preconditions,
)
from app.modules.platform_publish_orchestrator.types import (
  PublishContext,
  PublishExtensionResult,
  PublishResult,
)
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_release_provenance.verify_gate import (
  attach_verify_proof,
  build_verify_proof,
  deployment_verify_passed,
  resolve_verify_failure_reason,
  run_deployment_verify_gate,
)


def _parse_orchestrator_started_at(raw: str | None) -> datetime:
  if not raw:
    return datetime.now(timezone.utc).replace(tzinfo=None)
  text = str(raw).strip()
  if text.endswith("Z"):
    text = f"{text[:-1]}+00:00"
  return datetime.fromisoformat(text).replace(tzinfo=None)


class PublishOrchestrator:
  """Single entry point for publish coordination (ADR-CP-001)."""

  def __init__(self, db: Session) -> None:
    self.db = db
    self._phase = PublishPhase.VALIDATING
    self._errors: list[str] = []
    self._materialized_release_id: str | None = None
    self._activated_release_id: str | None = None
    self._pinned_environment_version_id: int | None = None

  @property
  def current_phase(self) -> PublishPhase:
    return self._phase

  def run(self, context: PublishContext) -> PublishResult:
    started_at = datetime.now(timezone.utc).replace(tzinfo=None)
    try:
      self._phase = PublishPhase.VALIDATING
      self._validate_context(context)
      deployment = self._create_deployment(context)
      self._phase = PublishPhase.DEPLOYMENT_CREATED
      self._attach_orchestrator_manifest(deployment, context, started_at=started_at)
      self._phase = PublishPhase.MATERIALIZATION_PENDING
      self._persist_orchestrator_phase(deployment, context)

      if context.deployment_kind == PlatformDeploymentKind.TEMPLATE_PUBLISH.value:
        materialize_result = self.materialize(context, deployment)
        if materialize_result.status == PublishExtensionStatus.FAILED:
          self._phase = PublishPhase.FAILED
          return PublishResult(
            status=PublishOrchestratorStatus.FAILED,
            release_package_id=context.release_package_id,
            current_phase=self._phase,
            deployment_id=deployment.id,
            deployment_key=deployment.deployment_key,
            materialized_release_id=self._materialized_release_id,
            errors=list(self._errors),
            started_at=started_at,
            finished_at=datetime.now(timezone.utc).replace(tzinfo=None),
          )
        self._phase = PublishPhase.VERIFY_PENDING

      if context.deployment_kind == PlatformDeploymentKind.TEMPLATE_PUBLISH.value:
        verify_result = self.verify(context, deployment)
        if verify_result.status == PublishExtensionStatus.FAILED:
          self._persist_orchestrator_phase(deployment, context)
          return PublishResult(
            status=PublishOrchestratorStatus.FAILED,
            release_package_id=context.release_package_id,
            current_phase=self._phase,
            deployment_id=deployment.id,
            deployment_key=deployment.deployment_key,
            materialized_release_id=self._materialized_release_id,
            errors=list(self._errors),
            started_at=started_at,
            finished_at=datetime.now(timezone.utc).replace(tzinfo=None),
          )

        activate_result = self.activate(context, deployment)
        if activate_result.status == PublishExtensionStatus.FAILED:
          self._persist_orchestrator_phase(deployment, context)
          return PublishResult(
            status=PublishOrchestratorStatus.FAILED,
            release_package_id=context.release_package_id,
            current_phase=self._phase,
            deployment_id=deployment.id,
            deployment_key=deployment.deployment_key,
            materialized_release_id=self._materialized_release_id,
            errors=list(self._errors),
            started_at=started_at,
            finished_at=datetime.now(timezone.utc).replace(tzinfo=None),
          )

        pin_result = self.pin_version(context, deployment)
        if pin_result.status == PublishExtensionStatus.FAILED:
          self._persist_orchestrator_phase(deployment, context)
          return PublishResult(
            status=PublishOrchestratorStatus.FAILED,
            release_package_id=context.release_package_id,
            current_phase=self._phase,
            deployment_id=deployment.id,
            deployment_key=deployment.deployment_key,
            materialized_release_id=self._materialized_release_id,
            errors=list(self._errors),
            started_at=started_at,
            finished_at=datetime.now(timezone.utc).replace(tzinfo=None),
          )

      self._persist_orchestrator_phase(deployment, context)
      return PublishResult(
        status=PublishOrchestratorStatus.IN_PROGRESS,
        release_package_id=context.release_package_id,
        current_phase=self._phase,
        deployment_id=deployment.id,
        deployment_key=deployment.deployment_key,
        materialized_release_id=self._materialized_release_id,
        errors=[],
        started_at=started_at,
      )
    except HTTPException as exc:
      detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
      self._errors.append(detail)
      self._phase = PublishPhase.FAILED
      return PublishResult(
        status=PublishOrchestratorStatus.FAILED,
        release_package_id=context.release_package_id,
        current_phase=self._phase,
        errors=list(self._errors),
        started_at=started_at,
        finished_at=datetime.now(timezone.utc).replace(tzinfo=None),
      )
    except Exception as exc:  # pragma: no cover - guardrail
      self._errors.append(str(exc))
      self._phase = PublishPhase.FAILED
      return PublishResult(
        status=PublishOrchestratorStatus.FAILED,
        release_package_id=context.release_package_id,
        current_phase=self._phase,
        errors=list(self._errors),
        started_at=started_at,
        finished_at=datetime.now(timezone.utc).replace(tzinfo=None),
      )

  def materialize(
    self,
    context: PublishContext,
    deployment: PlatformDeployment,
  ) -> PublishExtensionResult:
    if context.deployment_kind != PlatformDeploymentKind.TEMPLATE_PUBLISH.value:
      return PublishExtensionResult(
        phase=PublishPhase.MATERIALIZATION_PENDING,
        status=PublishExtensionStatus.SKIPPED,
        message="Materialization applies only to template_publish deployments.",
      )

    record_template_materialization_audit(
      self.db,
      deployment=deployment,
      phase="started",
      release_package_id=context.release_package_id,
      actor_user_id=context.actor_user_id,
    )

    package = (
      self.db.query(PlatformReleasePackage)
      .filter(PlatformReleasePackage.id == context.release_package_id)
      .one()
    )
    build = (
      self.db.query(PlatformCodeBuild)
      .filter(PlatformCodeBuild.id == package.build_id)
      .one()
    )

    try:
      result = materialize_template_release(
        release_package_id=package.id,
        package_key=package.package_key,
        build_id=build.id,
        build_key=build.build_key,
        git_commit=build.commit_sha,
      )
    except (TemplateMaterializationError, OSError, ValueError, RuntimeError) as exc:
      failure = str(exc)
      self._errors.append(failure)
      record_template_materialization_audit(
        self.db,
        deployment=deployment,
        phase="failed",
        release_package_id=context.release_package_id,
        failure_reason=failure,
        actor_user_id=context.actor_user_id,
      )
      self._update_extension_status(deployment, context, materialize=PublishExtensionStatus.FAILED)
      self.db.commit()
      self.db.refresh(deployment)
      return PublishExtensionResult(
        phase=PublishPhase.MATERIALIZATION_PENDING,
        status=PublishExtensionStatus.FAILED,
        message=failure,
      )

    self._materialized_release_id = result.release_id
    manifest = dict(deployment.deployment_manifest_json or {})
    manifest["materialized_release_id"] = result.release_id
    manifest["runtime_slot_key"] = "template"
    deployment.deployment_manifest_json = manifest
    self._update_extension_status(deployment, context, materialize=PublishExtensionStatus.COMPLETED)
    self.db.commit()
    self.db.refresh(deployment)

    record_template_materialization_audit(
      self.db,
      deployment=deployment,
      phase="succeeded",
      release_package_id=context.release_package_id,
      materialized_release_id=result.release_id,
      actor_user_id=context.actor_user_id,
    )
    self.db.commit()

    return PublishExtensionResult(
      phase=PublishPhase.VERIFY_PENDING,
      status=PublishExtensionStatus.COMPLETED,
      message=f"Materialized {result.release_id} at {result.release_dir}",
    )

  def verify(
    self,
    context: PublishContext,
    deployment: PlatformDeployment,
  ) -> PublishExtensionResult:
    if context.deployment_kind != PlatformDeploymentKind.TEMPLATE_PUBLISH.value:
      return PublishExtensionResult(
        phase=PublishPhase.VERIFY_PENDING,
        status=PublishExtensionStatus.SKIPPED,
        message="Verify applies only to template_publish deployments.",
      )

    manifest_json = deployment.deployment_manifest_json if isinstance(
      deployment.deployment_manifest_json, dict
    ) else {}
    materialized_release_id = manifest_json.get("materialized_release_id")
    if materialized_release_id is not None:
      materialized_release_id = str(materialized_release_id).strip() or None

    record_template_verify_audit(
      self.db,
      deployment=deployment,
      phase="started",
      release_package_id=context.release_package_id,
      materialized_release_id=materialized_release_id,
      actor_user_id=context.actor_user_id,
    )

    verify_result = run_deployment_verify_gate(self.db, deployment)
    verify_proof = build_verify_proof(verify_result)
    attach_verify_proof(deployment, verify_proof)
    passed = deployment_verify_passed(verify_result)

    if passed:
      self._phase = PublishPhase.VERIFY_PASSED
      ext_status = PublishExtensionStatus.COMPLETED
      message = (
        f"Template release {materialized_release_id or 'unknown'} "
        "passed Digest Bridge verification."
      )
      record_template_verify_audit(
        self.db,
        deployment=deployment,
        phase="passed",
        release_package_id=context.release_package_id,
        materialized_release_id=materialized_release_id,
        verify_proof=verify_proof,
        actor_user_id=context.actor_user_id,
      )
    else:
      self._phase = PublishPhase.VERIFY_FAILED
      ext_status = PublishExtensionStatus.FAILED
      failure_reason = resolve_verify_failure_reason(verify_result)
      message = (
        f"Template release verification failed: {failure_reason or verify_result.status}"
      )
      self._errors.append(message)
      record_template_verify_audit(
        self.db,
        deployment=deployment,
        phase="failed",
        release_package_id=context.release_package_id,
        materialized_release_id=materialized_release_id,
        verify_proof=verify_proof,
        failure_reason=failure_reason or verify_result.status,
        actor_user_id=context.actor_user_id,
      )

    self._update_extension_status(deployment, context, verify=ext_status)
    self.db.commit()
    self.db.refresh(deployment)

    return PublishExtensionResult(
      phase=self._phase,
      status=ext_status,
      message=message,
    )

  def activate(
    self,
    context: PublishContext,
    deployment: PlatformDeployment,
  ) -> PublishExtensionResult:
    if context.deployment_kind != PlatformDeploymentKind.TEMPLATE_PUBLISH.value:
      return PublishExtensionResult(
        phase=PublishPhase.ACTIVATING,
        status=PublishExtensionStatus.SKIPPED,
        message="Activation applies only to template_publish deployments.",
      )

    manifest_json = deployment.deployment_manifest_json if isinstance(
      deployment.deployment_manifest_json, dict
    ) else {}
    materialized_release_id = manifest_json.get("materialized_release_id")
    if materialized_release_id is not None:
      materialized_release_id = str(materialized_release_id).strip() or None

    allowed, block_reason = validate_template_activation_preconditions(deployment)
    if not allowed:
      self._phase = PublishPhase.ACTIVATION_FAILED
      message = f"Template activation blocked: {block_reason}"
      self._errors.append(message)
      record_template_activation_audit(
        self.db,
        deployment=deployment,
        phase="failed",
        release_package_id=context.release_package_id,
        activated_release_id=materialized_release_id,
        failure_reason=block_reason,
        actor_user_id=context.actor_user_id,
      )
      manifest = dict(deployment.deployment_manifest_json or {})
      manifest["activation_status"] = "failed"
      deployment.deployment_manifest_json = manifest
      self._update_extension_status(deployment, context, activate=PublishExtensionStatus.FAILED)
      self.db.commit()
      self.db.refresh(deployment)
      return PublishExtensionResult(
        phase=PublishPhase.ACTIVATION_FAILED,
        status=PublishExtensionStatus.FAILED,
        message=message,
      )

    self._phase = PublishPhase.ACTIVATING
    record_template_activation_audit(
      self.db,
      deployment=deployment,
      phase="started",
      release_package_id=context.release_package_id,
      activated_release_id=materialized_release_id,
      actor_user_id=context.actor_user_id,
    )

    try:
      result = activate_template_release(release_id=str(materialized_release_id))
    except (TemplateActivationError, TemplateMaterializationError, OSError, ValueError, RuntimeError) as exc:
      failure = str(exc)
      self._phase = PublishPhase.ACTIVATION_FAILED
      self._errors.append(failure)
      record_template_activation_audit(
        self.db,
        deployment=deployment,
        phase="failed",
        release_package_id=context.release_package_id,
        activated_release_id=materialized_release_id,
        failure_reason=failure,
        actor_user_id=context.actor_user_id,
      )
      manifest = dict(deployment.deployment_manifest_json or {})
      manifest["activation_status"] = "failed"
      deployment.deployment_manifest_json = manifest
      self._update_extension_status(deployment, context, activate=PublishExtensionStatus.FAILED)
      self.db.commit()
      self.db.refresh(deployment)
      return PublishExtensionResult(
        phase=PublishPhase.ACTIVATION_FAILED,
        status=PublishExtensionStatus.FAILED,
        message=failure,
      )

    activated_at = datetime.now(timezone.utc).replace(microsecond=0)
    self._activated_release_id = result.release_id
    manifest = dict(deployment.deployment_manifest_json or {})
    manifest["activation_status"] = "activated"
    manifest["activated_release_id"] = result.release_id
    manifest["activated_at"] = activated_at.isoformat().replace("+00:00", "Z")
    deployment.deployment_manifest_json = manifest
    self._phase = PublishPhase.ACTIVATED
    self._update_extension_status(deployment, context, activate=PublishExtensionStatus.COMPLETED)
    self.db.commit()
    self.db.refresh(deployment)

    record_template_activation_audit(
      self.db,
      deployment=deployment,
      phase="succeeded",
      release_package_id=context.release_package_id,
      activated_release_id=result.release_id,
      previous_release_id=result.previous_release_id,
      actor_user_id=context.actor_user_id,
    )
    self.db.commit()

    return PublishExtensionResult(
      phase=PublishPhase.ACTIVATED,
      status=PublishExtensionStatus.COMPLETED,
      message=(
        f"Activated {result.release_id} at {result.current_link} "
        f"(previous={result.previous_release_id or 'none'})"
      ),
    )

  def pin_version(
    self,
    context: PublishContext,
    deployment: PlatformDeployment,
  ) -> PublishExtensionResult:
    if context.deployment_kind != PlatformDeploymentKind.TEMPLATE_PUBLISH.value:
      return PublishExtensionResult(
        phase=PublishPhase.VERSION_PIN_PENDING,
        status=PublishExtensionStatus.SKIPPED,
        message="Version pin applies only to template_publish deployments.",
      )

    allowed, block_reason = validate_template_version_pin_preconditions(deployment)
    if not allowed:
      self._phase = PublishPhase.VERSION_PIN_FAILED
      message = f"Template version pin blocked: {block_reason}"
      self._errors.append(message)
      manifest = dict(deployment.deployment_manifest_json or {})
      manifest["version_pin_status"] = "failed"
      manifest["version_pin_failure_reason"] = block_reason
      deployment.deployment_manifest_json = manifest
      self._update_extension_status(deployment, context, pin=PublishExtensionStatus.FAILED)
      self.db.commit()
      self.db.refresh(deployment)
      return PublishExtensionResult(
        phase=PublishPhase.VERSION_PIN_FAILED,
        status=PublishExtensionStatus.FAILED,
        message=message,
      )

    manifest_json = deployment.deployment_manifest_json if isinstance(
      deployment.deployment_manifest_json, dict
    ) else {}
    activated_release_id = str(manifest_json.get("activated_release_id") or "").strip()
    platform_version = str(
      context.platform_version or deployment.target_platform_version or ""
    ).strip()
    if not platform_version:
      self._phase = PublishPhase.VERSION_PIN_FAILED
      message = "Template version pin blocked: platform_version missing"
      self._errors.append(message)
      manifest = dict(manifest_json)
      manifest["version_pin_status"] = "failed"
      manifest["version_pin_failure_reason"] = message
      deployment.deployment_manifest_json = manifest
      self._update_extension_status(deployment, context, pin=PublishExtensionStatus.FAILED)
      self.db.commit()
      self.db.refresh(deployment)
      return PublishExtensionResult(
        phase=PublishPhase.VERSION_PIN_FAILED,
        status=PublishExtensionStatus.FAILED,
        message=message,
      )

    self._phase = PublishPhase.VERSION_PINNING
    pinned_at = datetime.now(timezone.utc).replace(microsecond=0)

    try:
      environment_version = pin_template_environment_version(
        self.db,
        deployment=deployment,
        tenant_id=int(context.target_tenant_id),
        platform_version=platform_version,
        activated_release_id=activated_release_id,
        release_package_id=context.release_package_id,
        actor_user_id=context.actor_user_id,
        pinned_at=pinned_at,
      )
    except HTTPException as exc:
      failure = str(exc.detail)
      self._phase = PublishPhase.VERSION_PIN_FAILED
      self._errors.append(failure)
      manifest = dict(deployment.deployment_manifest_json or {})
      manifest["version_pin_status"] = "failed"
      manifest["version_pin_failure_reason"] = failure
      deployment.deployment_manifest_json = manifest
      self._update_extension_status(deployment, context, pin=PublishExtensionStatus.FAILED)
      self.db.commit()
      self.db.refresh(deployment)
      return PublishExtensionResult(
        phase=PublishPhase.VERSION_PIN_FAILED,
        status=PublishExtensionStatus.FAILED,
        message=failure,
      )

    self._pinned_environment_version_id = environment_version.id
    version_pin_proof = build_version_pin_proof(
      platform_version=environment_version.platform_version,
      activated_release_id=activated_release_id,
      release_package_id=context.release_package_id,
      environment_version_id=environment_version.id,
      environment_key=environment_version.environment_key,
      pinned_at=pinned_at,
    )
    manifest = dict(deployment.deployment_manifest_json or {})
    manifest["version_pin"] = version_pin_proof
    manifest["version_pin_status"] = "pinned"
    deployment.deployment_manifest_json = manifest
    self._phase = PublishPhase.VERSION_PINNED
    self._update_extension_status(deployment, context, pin=PublishExtensionStatus.COMPLETED)
    self.db.commit()
    self.db.refresh(deployment)

    record_template_version_pin_audit(
      self.db,
      deployment=deployment,
      release_package_id=context.release_package_id,
      platform_version=environment_version.platform_version,
      activated_release_id=activated_release_id,
      environment_version_id=environment_version.id,
      environment_key=environment_version.environment_key,
      version_pin_proof=version_pin_proof,
      actor_user_id=context.actor_user_id,
    )
    self.db.commit()

    return PublishExtensionResult(
      phase=PublishPhase.VERSION_PINNED,
      status=PublishExtensionStatus.COMPLETED,
      message=(
        f"Pinned TEMPLATE platform_version={environment_version.platform_version} "
        f"for activated_release_id={activated_release_id}"
      ),
    )

  def audit(
    self,
    context: PublishContext,
    deployment: PlatformDeployment,
  ) -> PublishExtensionResult:
    return self._stub_extension(PublishPhase.AUDIT_PENDING, "WI-IMPL-008 / audit completion")

  def _stub_extension(self, phase: PublishPhase, future_wi: str) -> PublishExtensionResult:
    return PublishExtensionResult(
      phase=phase,
      status=PublishExtensionStatus.NOT_IMPLEMENTED,
      message=f"Extension point reserved for {future_wi}; not implemented in current WI.",
    )

  def _validate_context(self, context: PublishContext) -> None:
    if context.release_package_id <= 0:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="release_package_id обязателен",
      )
    if not is_valid_deployment_kind(context.deployment_kind):
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Неподдерживаемый deployment_kind: {context.deployment_kind}",
      )
    if context.target_tenant_id is None:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="target_tenant_id обязателен для publish orchestrator",
      )
    package = (
      self.db.query(PlatformReleasePackage)
      .filter(PlatformReleasePackage.id == context.release_package_id)
      .one_or_none()
    )
    if package is None:
      raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Release package {context.release_package_id} не найден",
      )
    if str(package.status or "").strip().lower() != "published":
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Release package должен быть published перед orchestrator run",
      )

  def _create_deployment(self, context: PublishContext) -> PlatformDeployment:
    manifest = dict(context.deployment_manifest_json or {})
    manifest.setdefault("created_via", "publish_orchestrator")
    return deployment_registry_service.create_deployment(
      self.db,
      deployment_key=context.deployment_key,
      release_package_id=context.release_package_id,
      deployment_kind=context.deployment_kind,
      target_environment_type=context.target_environment_type,
      target_tenant_id=context.target_tenant_id,
      target_schema_revision=context.target_schema_revision,
      previous_platform_version=context.previous_platform_version,
      previous_release_package_id=context.previous_release_package_id,
      deployment_manifest_json=manifest,
      actor=None,
    )

  def _attach_orchestrator_manifest(
    self,
    deployment: PlatformDeployment,
    context: PublishContext,
    *,
    started_at: datetime,
  ) -> None:
    manifest = dict(deployment.deployment_manifest_json or {})
    manifest[PUBLISH_ORCHESTRATOR_MANIFEST_KEY] = self._orchestrator_manifest_payload(
      context,
      started_at=started_at,
      phase=PublishPhase.DEPLOYMENT_CREATED,
    )
    deployment.deployment_manifest_json = manifest
    self.db.commit()
    self.db.refresh(deployment)

  def _persist_orchestrator_phase(
    self,
    deployment: PlatformDeployment,
    context: PublishContext,
  ) -> None:
    manifest = dict(deployment.deployment_manifest_json or {})
    existing = manifest.get(PUBLISH_ORCHESTRATOR_MANIFEST_KEY)
    started_at_raw = existing.get("started_at") if isinstance(existing, dict) else None
    started_at = _parse_orchestrator_started_at(started_at_raw)
    manifest[PUBLISH_ORCHESTRATOR_MANIFEST_KEY] = self._orchestrator_manifest_payload(
      context,
      started_at=started_at,
      phase=self._phase,
    )
    deployment.deployment_manifest_json = manifest
    self.db.commit()
    self.db.refresh(deployment)

  def _update_extension_status(
    self,
    deployment: PlatformDeployment,
    context: PublishContext,
    *,
    materialize: PublishExtensionStatus | None = None,
    verify: PublishExtensionStatus | None = None,
    activate: PublishExtensionStatus | None = None,
    pin: PublishExtensionStatus | None = None,
  ) -> None:
    manifest = dict(deployment.deployment_manifest_json or {})
    existing = manifest.get(PUBLISH_ORCHESTRATOR_MANIFEST_KEY)
    started_at_raw = existing.get("started_at") if isinstance(existing, dict) else None
    started_at = _parse_orchestrator_started_at(started_at_raw)
    payload = self._orchestrator_manifest_payload(context, started_at=started_at, phase=self._phase)
    if materialize is not None:
      payload["extension_points"]["materialize"] = materialize.value
    if verify is not None:
      payload["extension_points"]["verify"] = verify.value
    if activate is not None:
      payload["extension_points"]["activate"] = activate.value
    if pin is not None:
      payload["extension_points"]["pin_version"] = pin.value
    if self._materialized_release_id:
      payload["materialized_release_id"] = self._materialized_release_id
    manifest[PUBLISH_ORCHESTRATOR_MANIFEST_KEY] = payload
    deployment.deployment_manifest_json = manifest

  def _orchestrator_manifest_payload(
    self,
    context: PublishContext,
    *,
    started_at: datetime,
    phase: PublishPhase,
  ) -> dict[str, Any]:
    extension_materialize = (
      PublishExtensionStatus.COMPLETED.value
      if self._materialized_release_id
      else PublishExtensionStatus.NOT_IMPLEMENTED.value
    )
    if self._phase in {
      PublishPhase.VERIFY_PASSED,
      PublishPhase.ACTIVATING,
      PublishPhase.ACTIVATED,
      PublishPhase.ACTIVATION_FAILED,
      PublishPhase.VERSION_PINNING,
      PublishPhase.VERSION_PINNED,
      PublishPhase.VERSION_PIN_FAILED,
    }:
      extension_verify = PublishExtensionStatus.COMPLETED.value
    elif self._phase == PublishPhase.VERIFY_FAILED:
      extension_verify = PublishExtensionStatus.FAILED.value
    else:
      extension_verify = PublishExtensionStatus.NOT_IMPLEMENTED.value
    if self._phase in {
      PublishPhase.ACTIVATED,
      PublishPhase.VERSION_PINNING,
      PublishPhase.VERSION_PINNED,
      PublishPhase.VERSION_PIN_FAILED,
    }:
      extension_activate = PublishExtensionStatus.COMPLETED.value
    elif self._phase == PublishPhase.ACTIVATION_FAILED:
      extension_activate = PublishExtensionStatus.FAILED.value
    else:
      extension_activate = PublishExtensionStatus.NOT_IMPLEMENTED.value
    if self._phase == PublishPhase.VERSION_PINNED:
      extension_pin = PublishExtensionStatus.COMPLETED.value
    elif self._phase == PublishPhase.VERSION_PIN_FAILED:
      extension_pin = PublishExtensionStatus.FAILED.value
    else:
      extension_pin = PublishExtensionStatus.NOT_IMPLEMENTED.value
    payload: dict[str, Any] = {
      "status": PublishOrchestratorStatus.IN_PROGRESS.value,
      "current_phase": phase.value,
      "deployment_kind": context.deployment_kind,
      "release_package_id": context.release_package_id,
      "package_key": context.package_key,
      "platform_version": context.platform_version,
      "target_environment_type": context.target_environment_type,
      "target_tenant_id": context.target_tenant_id,
      "started_at": started_at.replace(microsecond=0).isoformat() + "Z",
      "extension_points": {
        "materialize": extension_materialize,
        "verify": extension_verify,
        "activate": extension_activate,
        "pin_version": extension_pin,
        "audit": PublishExtensionStatus.NOT_IMPLEMENTED.value,
      },
    }
    if self._materialized_release_id:
      payload["materialized_release_id"] = self._materialized_release_id
    if self._activated_release_id:
      payload["activated_release_id"] = self._activated_release_id
    if self._pinned_environment_version_id is not None:
      payload["pinned_environment_version_id"] = self._pinned_environment_version_id
    return payload
