from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.platform_deployment_registry import service
from app.modules.platform_deployment_registry.constants import PlatformDeploymentStatus


class DummyDb:
    def __init__(self) -> None:
        self.commit_calls = 0
        self.refresh_calls = 0

    def commit(self) -> None:
        self.commit_calls += 1

    def refresh(self, _obj) -> None:
        self.refresh_calls += 1


def _deployment(status: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=200,
        deployment_key="DPL-20260616-0001",
        release_package_id=10,
        deployment_kind="template_publish",
        target_environment_type="template",
        target_tenant_id=501,
        target_platform_version="1.2.3",
        target_schema_revision="rev-1",
        previous_platform_version="1.2.2",
        created_by=700,
        status=status,
        started_at=None,
        finished_at=None,
        failure_reason=None,
        deployment_manifest_json={},
    )


def _patch_verify_passed(monkeypatch) -> None:
    from app.modules.platform_release_provenance.types import VerifyResult

    passed = VerifyResult(
        status="passed",
        build_match=True,
        package_match=True,
        manifest_match=True,
        runtime_match=True,
        drift_detected=False,
    )
    monkeypatch.setattr(
        service,
        "run_deployment_verify_gate",
        lambda _db, _dep: passed,
    )
    monkeypatch.setattr(service, "record_deployment_verify_audit", lambda *_a, **_k: None)
    monkeypatch.setattr(service, "record_deployment_lifecycle_audit", lambda *_a, **_k: None)


def _patch_lifecycle_audit_only(monkeypatch) -> None:
    monkeypatch.setattr(service, "record_deployment_lifecycle_audit", lambda *_a, **_k: None)


def test_start_succeed_failed_cancel_allowed_transitions(monkeypatch):
    db = DummyDb()
    writes: list[dict] = []
    _patch_verify_passed(monkeypatch)

    planned = _deployment(PlatformDeploymentStatus.PLANNED.value)
    monkeypatch.setattr(service, "get_deployment", lambda _db, _id: planned)
    started = service.start_deployment(db, deployment_id=planned.id)
    assert started.status == PlatformDeploymentStatus.RUNNING.value
    assert started.started_at is not None

    running_success = _deployment(PlatformDeploymentStatus.RUNNING.value)
    monkeypatch.setattr(service, "get_deployment", lambda _db, _id: running_success)
    monkeypatch.setattr(
        service.platform_version_service,
        "record_environment_version",
        lambda *_args, **kwargs: writes.append(dict(kwargs)),
    )
    succeeded = service.mark_succeeded(db, deployment_id=running_success.id)
    assert succeeded.status == PlatformDeploymentStatus.SUCCEEDED.value
    assert succeeded.finished_at is not None
    assert len(writes) == 1
    assert writes[0]["tenant_id"] == 501

    running_failed = _deployment(PlatformDeploymentStatus.RUNNING.value)
    monkeypatch.setattr(service, "get_deployment", lambda _db, _id: running_failed)
    failed = service.mark_failed(
        db,
        deployment_id=running_failed.id,
        failure_reason="runtime error",
    )
    assert failed.status == PlatformDeploymentStatus.FAILED.value
    assert failed.failure_reason == "runtime error"

    planned_cancel = _deployment(PlatformDeploymentStatus.PLANNED.value)
    monkeypatch.setattr(service, "get_deployment", lambda _db, _id: planned_cancel)
    cancelled_planned = service.cancel_deployment(db, deployment_id=planned_cancel.id)
    assert cancelled_planned.status == PlatformDeploymentStatus.CANCELLED.value

    running_cancel = _deployment(PlatformDeploymentStatus.RUNNING.value)
    monkeypatch.setattr(service, "get_deployment", lambda _db, _id: running_cancel)
    cancelled_running = service.cancel_deployment(db, deployment_id=running_cancel.id)
    assert cancelled_running.status == PlatformDeploymentStatus.CANCELLED.value


def test_forbidden_transitions(monkeypatch):
    db = DummyDb()
    terminal = _deployment(PlatformDeploymentStatus.SUCCEEDED.value)
    monkeypatch.setattr(service, "get_deployment", lambda _db, _id: terminal)

    with pytest.raises(HTTPException):
        service.start_deployment(db, deployment_id=terminal.id)
    with pytest.raises(HTTPException):
        service.cancel_deployment(db, deployment_id=terminal.id)

    with pytest.raises(HTTPException):
        service._assert_transition(
            current_status=PlatformDeploymentStatus.RUNNING.value,
            allowed_from={PlatformDeploymentStatus.PLANNED.value},
            action="back_to_planned",
        )


def test_mark_succeeded_is_not_reapplied(monkeypatch):
    db = DummyDb()
    running = _deployment(PlatformDeploymentStatus.RUNNING.value)
    writes_count = {"value": 0}
    _patch_verify_passed(monkeypatch)

    def _record(*_args, **_kwargs):
        writes_count["value"] += 1

    monkeypatch.setattr(service, "get_deployment", lambda _db, _id: running)
    monkeypatch.setattr(service.platform_version_service, "record_environment_version", _record)

    service.mark_succeeded(db, deployment_id=running.id)
    assert running.status == PlatformDeploymentStatus.SUCCEEDED.value
    assert writes_count["value"] == 1

    with pytest.raises(HTTPException):
        service.mark_succeeded(db, deployment_id=running.id)
    assert writes_count["value"] == 1


def test_failed_and_cancelled_do_not_touch_environment_write_path(monkeypatch):
    db = DummyDb()
    _patch_lifecycle_audit_only(monkeypatch)

    def _should_not_call(*_args, **_kwargs):
        raise AssertionError("record_environment_version must not be called")

    monkeypatch.setattr(
        service.platform_version_service,
        "record_environment_version",
        _should_not_call,
    )

    running_failed = _deployment(PlatformDeploymentStatus.RUNNING.value)
    monkeypatch.setattr(service, "get_deployment", lambda _db, _id: running_failed)
    service.mark_failed(db, deployment_id=running_failed.id, failure_reason="boom")

    planned_cancel = _deployment(PlatformDeploymentStatus.PLANNED.value)
    monkeypatch.setattr(service, "get_deployment", lambda _db, _id: planned_cancel)
    service.cancel_deployment(db, deployment_id=planned_cancel.id)


def test_create_deployment_requires_published_package(monkeypatch):
    db = DummyDb()
    package = SimpleNamespace(
        id=10,
        status="ready",
        platform_version="1.0.0",
        package_manifest_json={},
    )
    monkeypatch.setattr(service, "_get_release_package_or_400", lambda *_args, **_kwargs: package)

    with pytest.raises(HTTPException):
        service.create_deployment(
            db,
            deployment_key="DPL-20260616-0002",
            release_package_id=10,
            target_environment_type="template",
            actor=SimpleNamespace(id=1),
        )

