"""Tests for Deployment Verify Gate (WI-IMPL-004)."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.platform_deployment_registry import service as deployment_service
from app.modules.platform_deployment_registry.constants import (
    DeploymentVerifyFailureReason,
    PlatformDeploymentStatus,
)
from app.modules.platform_release_provenance.types import VerifyIssue, VerifyResult
from app.modules.platform_release_provenance.verify_gate import (
    build_verify_proof,
    deployment_verify_passed,
    resolve_verify_failure_reason,
)


def _passed_result() -> VerifyResult:
    return VerifyResult(
        status="passed",
        build_match=True,
        package_match=True,
        manifest_match=True,
        runtime_match=True,
        drift_detected=False,
        issues=[],
        checks=[{"name": "full_chain", "ok": True}],
    )


def _failed_result(
    *,
    status: str = "failed",
    build_match: bool = False,
    package_match: bool = False,
    manifest_match: bool = False,
    runtime_match: bool = False,
    drift_detected: bool = True,
    issues: list[VerifyIssue] | None = None,
) -> VerifyResult:
    return VerifyResult(
        status=status,  # type: ignore[arg-type]
        build_match=build_match,
        package_match=package_match,
        manifest_match=manifest_match,
        runtime_match=runtime_match,
        drift_detected=drift_detected,
        issues=issues or [],
        checks=[],
    )


def _deployment(status: str = "running") -> SimpleNamespace:
    return SimpleNamespace(
        id=301,
        deployment_key="DPL-20260619-0301",
        release_package_id=42,
        deployment_kind="template_publish",
        target_environment_type="template",
        target_tenant_id=1,
        target_platform_version="1.0.0",
        target_schema_revision="rev-1",
        previous_platform_version=None,
        created_by=1,
        status=status,
        started_at=None,
        finished_at=None,
        failure_reason=None,
        deployment_manifest_json={},
    )


class DummyDb:
    def __init__(self) -> None:
        self.commit_calls = 0
        self.refresh_calls = 0

    def commit(self) -> None:
        self.commit_calls += 1

    def refresh(self, _obj) -> None:
        self.refresh_calls += 1


@pytest.mark.parametrize(
    ("result", "expected"),
    [
        (_passed_result(), True),
        (_failed_result(status="partial", drift_detected=True), False),
        (_failed_result(status="failed"), False),
        (
            VerifyResult(
                status="passed",
                build_match=True,
                package_match=True,
                manifest_match=True,
                runtime_match=True,
                drift_detected=True,
            ),
            False,
        ),
    ],
)
def test_deployment_verify_passed(result: VerifyResult, expected: bool) -> None:
    assert deployment_verify_passed(result) is expected


@pytest.mark.parametrize(
    ("result", "expected_reason"),
    [
        (_passed_result(), ""),
        (
            _failed_result(
                build_match=False,
                issues=[VerifyIssue("BUILD_ID_MISMATCH", "mismatch", "package")],
            ),
            DeploymentVerifyFailureReason.BUILD_MISMATCH.value,
        ),
        (
            _failed_result(
                build_match=True,
                package_match=False,
                issues=[VerifyIssue("PACKAGE_DIGEST_MISMATCH", "mismatch", "package")],
            ),
            DeploymentVerifyFailureReason.PACKAGE_MISMATCH.value,
        ),
        (
            _failed_result(
                build_match=True,
                package_match=True,
                manifest_match=False,
                issues=[VerifyIssue("MANIFEST_MISSING", "missing", "manifest")],
            ),
            DeploymentVerifyFailureReason.MANIFEST_MISMATCH.value,
        ),
        (
            _failed_result(
                build_match=True,
                package_match=True,
                manifest_match=True,
                runtime_match=False,
                issues=[VerifyIssue("RELEASE_MISSING", "missing", "runtime")],
            ),
            DeploymentVerifyFailureReason.RUNTIME_MISMATCH.value,
        ),
        (
            _failed_result(
                status="partial",
                build_match=True,
                package_match=True,
                manifest_match=True,
                runtime_match=True,
                drift_detected=True,
                issues=[VerifyIssue("MISSING_LINKAGE", "legacy", "manifest")],
            ),
            DeploymentVerifyFailureReason.PACKAGE_MISMATCH.value,
        ),
        (
            _failed_result(
                status="partial",
                build_match=True,
                package_match=True,
                manifest_match=True,
                runtime_match=True,
                drift_detected=True,
                issues=[],
            ),
            DeploymentVerifyFailureReason.DRIFT_DETECTED.value,
        ),
        (
            _failed_result(
                status="failed",
                build_match=False,
                package_match=False,
                manifest_match=False,
                runtime_match=False,
                drift_detected=False,
                issues=[],
            ),
            DeploymentVerifyFailureReason.BUILD_MISMATCH.value,
        ),
    ],
)
def test_resolve_verify_failure_reason(result: VerifyResult, expected_reason: str) -> None:
    assert resolve_verify_failure_reason(result) == expected_reason


def test_build_verify_proof_contract() -> None:
    proof = build_verify_proof(_passed_result())
    assert proof["verify_proof_version"] == "1.0"
    assert proof["status"] == "passed"
    assert proof["verified_at"].endswith("Z")
    assert proof["build_match"] is True
    assert proof["package_match"] is True
    assert proof["manifest_match"] is True
    assert proof["runtime_match"] is True
    assert proof["drift_detected"] is False
    assert proof["issues"] == []
    assert proof["checks"]


def test_mark_succeeded_blocks_on_verify_failed(monkeypatch) -> None:
    db = DummyDb()
    deployment = _deployment()
    monkeypatch.setattr(deployment_service, "get_deployment", lambda _db, _id: deployment)
    monkeypatch.setattr(
        deployment_service,
        "run_deployment_verify_gate",
        lambda _db, _dep: _failed_result(
            build_match=True,
            package_match=True,
            manifest_match=True,
            runtime_match=False,
            issues=[VerifyIssue("RELEASE_MISSING", "missing", "runtime")],
        ),
    )
    monkeypatch.setattr(
        deployment_service,
        "record_deployment_verify_audit",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        deployment_service,
        "record_deployment_lifecycle_audit",
        lambda *_args, **_kwargs: None,
    )

    with pytest.raises(HTTPException) as exc_info:
        deployment_service.mark_succeeded(db, deployment_id=deployment.id)

    assert exc_info.value.status_code == 400
    assert deployment.status == PlatformDeploymentStatus.FAILED.value
    assert deployment.failure_reason == DeploymentVerifyFailureReason.RUNTIME_MISMATCH.value
    assert deployment.deployment_manifest_json["verify_proof"]["status"] == "failed"


def test_mark_succeeded_stores_verify_proof_on_success(monkeypatch) -> None:
    db = DummyDb()
    deployment = _deployment()
    writes: list[dict] = []
    audit_calls: list[bool] = []

    monkeypatch.setattr(deployment_service, "get_deployment", lambda _db, _id: deployment)
    monkeypatch.setattr(
        deployment_service,
        "run_deployment_verify_gate",
        lambda _db, _dep: _passed_result(),
    )
    monkeypatch.setattr(
        deployment_service,
        "record_deployment_verify_audit",
        lambda *_args, **kwargs: audit_calls.append(kwargs["passed"]),
    )
    monkeypatch.setattr(
        deployment_service.platform_version_service,
        "record_environment_version",
        lambda *_args, **kwargs: writes.append(dict(kwargs)),
    )

    monkeypatch.setattr(
        deployment_service,
        "record_deployment_lifecycle_audit",
        lambda *_args, **_kwargs: None,
    )

    succeeded = deployment_service.mark_succeeded(db, deployment_id=deployment.id)
    assert succeeded.status == PlatformDeploymentStatus.SUCCEEDED.value
    assert deployment.deployment_manifest_json["verify_proof"]["status"] == "passed"
    assert audit_calls == [True]
    assert len(writes) == 1


def test_mark_succeeded_blocks_drift_detected(monkeypatch) -> None:
    db = DummyDb()
    deployment = _deployment()
    monkeypatch.setattr(deployment_service, "get_deployment", lambda _db, _id: deployment)
    monkeypatch.setattr(
        deployment_service,
        "run_deployment_verify_gate",
        lambda _db, _dep: VerifyResult(
            status="passed",
            build_match=True,
            package_match=True,
            manifest_match=True,
            runtime_match=True,
            drift_detected=True,
        ),
    )
    monkeypatch.setattr(
        deployment_service,
        "record_deployment_verify_audit",
        lambda *_args, **_kwargs: None,
    )
    monkeypatch.setattr(
        deployment_service,
        "record_deployment_lifecycle_audit",
        lambda *_args, **_kwargs: None,
    )

    with pytest.raises(HTTPException):
        deployment_service.mark_succeeded(db, deployment_id=deployment.id)

    assert deployment.status == PlatformDeploymentStatus.FAILED.value
    assert deployment.failure_reason == DeploymentVerifyFailureReason.DRIFT_DETECTED.value
