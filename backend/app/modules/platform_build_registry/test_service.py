from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.platform_build_registry import service
from app.modules.platform_build_registry.constants import PlatformBuildStatus


class DummyDb:
    def __init__(self) -> None:
        self.commit_calls = 0
        self.refresh_calls = 0

    def commit(self) -> None:
        self.commit_calls += 1

    def refresh(self, _obj) -> None:
        self.refresh_calls += 1


def _build(status: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=100,
        build_key="BLD-20260616-0001",
        commit_sha="a" * 40,
        status=status,
        backend_digest=None,
        frontend_digest=None,
        schema_revision="rev-1",
        build_manifest_json={"schema_revision": "rev-1"},
        started_at=None,
        finished_at=None,
        failure_reason=None,
    )


def test_start_succeed_failed_cancel_allowed_transitions(monkeypatch):
    db = DummyDb()

    pending = _build(PlatformBuildStatus.PENDING.value)
    monkeypatch.setattr(service, "get_build", lambda _db, _id: pending)
    started = service.start_build(db, build_id=pending.id)
    assert started.status == PlatformBuildStatus.RUNNING.value
    assert started.started_at is not None

    running_success = _build(PlatformBuildStatus.RUNNING.value)
    monkeypatch.setattr(service, "get_build", lambda _db, _id: running_success)
    succeeded = service.mark_succeeded(db, build_id=running_success.id)
    assert succeeded.status == PlatformBuildStatus.SUCCEEDED.value
    assert succeeded.finished_at is not None

    running_failed = _build(PlatformBuildStatus.RUNNING.value)
    monkeypatch.setattr(service, "get_build", lambda _db, _id: running_failed)
    failed = service.mark_failed(
        db,
        build_id=running_failed.id,
        failure_reason="compile error",
    )
    assert failed.status == PlatformBuildStatus.FAILED.value
    assert failed.failure_reason == "compile error"

    pending_cancel = _build(PlatformBuildStatus.PENDING.value)
    monkeypatch.setattr(service, "get_build", lambda _db, _id: pending_cancel)
    cancelled_pending = service.cancel_build(db, build_id=pending_cancel.id)
    assert cancelled_pending.status == PlatformBuildStatus.CANCELLED.value

    running_cancel = _build(PlatformBuildStatus.RUNNING.value)
    monkeypatch.setattr(service, "get_build", lambda _db, _id: running_cancel)
    cancelled_running = service.cancel_build(db, build_id=running_cancel.id)
    assert cancelled_running.status == PlatformBuildStatus.CANCELLED.value


def test_forbidden_transitions(monkeypatch):
    db = DummyDb()
    terminal = _build(PlatformBuildStatus.SUCCEEDED.value)
    monkeypatch.setattr(service, "get_build", lambda _db, _id: terminal)

    with pytest.raises(HTTPException):
        service.start_build(db, build_id=terminal.id)
    with pytest.raises(HTTPException):
        service.cancel_build(db, build_id=terminal.id)

    with pytest.raises(HTTPException):
        service._assert_transition(
            current_status=PlatformBuildStatus.RUNNING.value,
            allowed_from={PlatformBuildStatus.PENDING.value},
            action="back_to_pending",
        )


def test_mark_succeeded_is_not_reapplied(monkeypatch):
    db = DummyDb()
    running = _build(PlatformBuildStatus.RUNNING.value)
    monkeypatch.setattr(service, "get_build", lambda _db, _id: running)

    service.mark_succeeded(db, build_id=running.id)
    assert running.status == PlatformBuildStatus.SUCCEEDED.value

    with pytest.raises(HTTPException):
        service.mark_succeeded(db, build_id=running.id)


def test_create_build_validates_key_and_commit(monkeypatch):
    db = DummyDb()

    with pytest.raises(HTTPException):
        service.create_build(
            db,
            build_key="INVALID",
            commit_sha="a" * 40,
            build_manifest_json={"modules": []},
        )

    with pytest.raises(HTTPException):
        service.create_build(
            db,
            build_key="BLD-20260616-0001",
            commit_sha="short",
            build_manifest_json={"modules": []},
        )

    with pytest.raises(HTTPException):
        service.create_build(
            db,
            build_key="BLD-20260616-0001",
            commit_sha="a" * 40,
            build_manifest_json={},
        )


def test_create_build_requires_unique_key(monkeypatch):
    existing = SimpleNamespace(id=1)

    class QueryResult:
        def filter(self, *_args, **_kwargs):
            return self

        def one_or_none(self):
            return existing

    class DbWithQuery(DummyDb):
        def query(self, *_args, **_kwargs):
            return QueryResult()

    db = DbWithQuery()

    with pytest.raises(HTTPException) as exc_info:
        service.create_build(
            db,
            build_key="BLD-20260616-0001",
            commit_sha="a" * 40,
            build_manifest_json={"modules": []},
        )
    assert exc_info.value.status_code == 409
