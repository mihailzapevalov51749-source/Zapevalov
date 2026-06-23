"""Deployment Verify Gate (WI-IMPL-004).

Mandatory Digest Bridge check before deployment can reach SUCCEEDED.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry.constants import (
    DeploymentVerifyFailureReason,
    PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import (
    record_platform_event,
    record_tenant_event,
)
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_release_provenance.bridge import verify_release_provenance
from app.modules.platform_release_provenance.runtime_artifacts import (
    get_suite_root,
    load_physical_manifest,
    resolve_release_dir,
)
from app.modules.platform_release_provenance.snapshots import (
    build_snapshot_from_orm,
    package_snapshot_from_orm,
)
from app.modules.platform_release_provenance.types import VerifyResult

VERIFY_PROOF_VERSION = "1.0"

_BUILD_ISSUE_CODES = frozenset(
    {
        "BUILD_NOT_FOUND",
        "BUILD_ID_MISMATCH",
        "BUILD_KEY_MISMATCH",
        "COMMIT_SHA_MISMATCH",
        "BACKEND_DIGEST_MISMATCH",
        "FRONTEND_DIGEST_MISMATCH",
    }
)
_PACKAGE_ISSUE_CODES = frozenset(
    {
        "PACKAGE_NOT_FOUND",
        "PACKAGE_DIGEST_MISMATCH",
        "PACKAGE_DIGEST_MISSING",
        "PACKAGE_KEY_MISMATCH",
        "MISSING_LINKAGE",
    }
)
_MANIFEST_ISSUE_CODES = frozenset(
    {
        "MANIFEST_MISSING",
        "MANIFEST_SCHEMA_INVALID",
        "RELEASE_PACKAGE_ID_MISMATCH",
        "RELEASE_PACKAGE_KEY_MISMATCH",
    }
)
_RUNTIME_ISSUE_CODES = frozenset(
    {
        "RELEASE_MISSING",
        "RELEASE_ID_MISMATCH",
        "RUNTIME_SLOT_MISMATCH",
        "ARTIFACT_MISSING",
        "FINGERPRINT_MISMATCH",
        "FRONTEND_DIGEST_MISMATCH",
    }
)


def deployment_verify_passed(result: VerifyResult) -> bool:
    return result.status == "passed" and not result.drift_detected


def resolve_runtime_slot_key(deployment: Any) -> str:
    manifest = deployment.deployment_manifest_json if isinstance(
        deployment.deployment_manifest_json, dict
    ) else {}
    slot = manifest.get("runtime_slot_key")
    if slot is not None and str(slot).strip():
        return str(slot).strip()
    target_type = str(deployment.target_environment_type or "").strip().lower()
    if target_type == PlatformDeploymentTargetEnvironmentType.TEMPLATE.value:
        return "template"
    if target_type == PlatformDeploymentTargetEnvironmentType.CLIENT.value:
        return "client"
    if target_type == PlatformDeploymentTargetEnvironmentType.DEV.value:
        return "dev"
    return target_type or "template"


def resolve_verify_failure_reason(result: VerifyResult) -> str:
    if deployment_verify_passed(result):
        return ""

    issue_codes = {issue.code for issue in result.issues}

    if not result.build_match or issue_codes & _BUILD_ISSUE_CODES:
        return DeploymentVerifyFailureReason.BUILD_MISMATCH.value
    if not result.package_match or issue_codes & _PACKAGE_ISSUE_CODES:
        return DeploymentVerifyFailureReason.PACKAGE_MISMATCH.value
    if not result.manifest_match or issue_codes & _MANIFEST_ISSUE_CODES:
        return DeploymentVerifyFailureReason.MANIFEST_MISMATCH.value
    if not result.runtime_match or issue_codes & _RUNTIME_ISSUE_CODES:
        return DeploymentVerifyFailureReason.RUNTIME_MISMATCH.value
    if result.drift_detected:
        return DeploymentVerifyFailureReason.DRIFT_DETECTED.value
    return DeploymentVerifyFailureReason.VERIFY_FAILED.value


def build_verify_proof(result: VerifyResult) -> dict[str, Any]:
    return {
        "verify_proof_version": VERIFY_PROOF_VERSION,
        "status": result.status,
        "verified_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
            "+00:00", "Z"
        ),
        "build_match": result.build_match,
        "package_match": result.package_match,
        "manifest_match": result.manifest_match,
        "runtime_match": result.runtime_match,
        "drift_detected": result.drift_detected,
        "issues": [issue.to_dict() for issue in result.issues],
        "checks": result.checks,
    }


def _load_runtime_context(
    deployment: Any,
    *,
    runtime_slot_key: str,
) -> tuple[dict[str, Any] | None, Path | None]:
    manifest_json = deployment.deployment_manifest_json if isinstance(
        deployment.deployment_manifest_json, dict
    ) else {}
    release_id = manifest_json.get("materialized_release_id")
    if release_id is not None:
        release_id = str(release_id).strip() or None

    suite_root = get_suite_root()
    try:
        release_dir = resolve_release_dir(
            suite_root=suite_root,
            runtime_slot_key=runtime_slot_key,
            release_id=release_id,
            use_current=not release_id,
        )
    except (FileNotFoundError, ValueError, OSError):
        return None, None

    manifest_path = release_dir / "manifest.json"
    if not manifest_path.is_file():
        return None, release_dir
    try:
        manifest = load_physical_manifest(manifest_path)
    except (OSError, ValueError):
        return None, release_dir
    return manifest, release_dir


def run_deployment_verify_gate(db: Session, deployment: Any) -> VerifyResult:
    """Run Digest Bridge for a deployment before SUCCEEDED transition."""
    package_orm = (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.id == deployment.release_package_id)
        .one_or_none()
    )
    build_orm = None
    if package_orm is not None and package_orm.build_id is not None:
        build_orm = (
            db.query(PlatformCodeBuild)
            .filter(PlatformCodeBuild.id == package_orm.build_id)
            .one_or_none()
        )

    package = package_snapshot_from_orm(package_orm) if package_orm is not None else None
    build = build_snapshot_from_orm(build_orm) if build_orm is not None else None
    runtime_slot_key = resolve_runtime_slot_key(deployment)
    manifest, release_dir = _load_runtime_context(
        deployment,
        runtime_slot_key=runtime_slot_key,
    )

    return verify_release_provenance(
        package=package,
        build=build,
        manifest=manifest,
        release_dir=release_dir,
        runtime_slot_key=runtime_slot_key,
    )


def attach_verify_proof(deployment: Any, verify_proof: dict[str, Any]) -> None:
    manifest = dict(deployment.deployment_manifest_json or {})
    manifest["verify_proof"] = verify_proof
    deployment.deployment_manifest_json = manifest


def record_deployment_verify_audit(
    db: Session,
    *,
    deployment: Any,
    verify_result: VerifyResult,
    verify_proof: dict[str, Any],
    passed: bool,
) -> None:
    failure_reason = resolve_verify_failure_reason(verify_result)
    metadata = {
        "deployment_id": deployment.id,
        "deployment_key": deployment.deployment_key,
        "release_package_id": deployment.release_package_id,
        "target_environment_type": deployment.target_environment_type,
        "verify_proof": verify_proof,
        "failure_reason": failure_reason or None,
    }
    slug_suffix = "passed" if passed else "failed"
    slug = f"deployment-verify-{slug_suffix}-{deployment.id}"

    if passed:
        title = f"Deployment {deployment.deployment_key}: verify gate passed"
        description = "Digest Bridge подтвердил целостность release provenance перед SUCCEEDED."
        event_code = PlatformEventCode.DEPLOYMENT_VERIFY_PASSED.value
        audit_status = PlatformAuditStatus.DONE.value
    else:
        title = f"Deployment {deployment.deployment_key}: verify gate failed"
        description = (
            f"Digest Bridge заблокировал переход в SUCCEEDED: {failure_reason}. "
            f"status={verify_result.status}, drift_detected={verify_result.drift_detected}."
        )
        event_code = PlatformEventCode.DEPLOYMENT_VERIFY_FAILED.value
        audit_status = PlatformAuditStatus.ERROR.value

    target_type = str(deployment.target_environment_type or "").strip().lower()
    tenant_id = deployment.target_tenant_id

    if target_type == PlatformDeploymentTargetEnvironmentType.CLIENT.value and tenant_id is not None:
        record_tenant_event(
            db,
            tenant_id=tenant_id,
            event_code=event_code,
            event_category=PlatformEventCategory.PUBLICATION.value,
            title=title,
            description=description,
            status=audit_status,
            target_type="platform_deployment",
            target_id=deployment.id,
            target_name=deployment.deployment_key,
            metadata=metadata,
            slug=slug,
            commit=False,
        )
        return

    record_platform_event(
        db,
        event_code=event_code,
        event_category=PlatformEventCategory.PUBLICATION.value,
        title=title,
        description=description,
        status=audit_status,
        target_type="platform_deployment",
        target_id=deployment.id,
        target_name=deployment.deployment_key,
        company_id=tenant_id,
        metadata=metadata,
        slug=slug,
        commit=False,
    )
