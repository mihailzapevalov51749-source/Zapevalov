from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.platform_build_registry.constants import PlatformBuildStatus
from app.modules.platform_release_package_registry import service
from app.modules.platform_release_package_registry.constants import PlatformReleasePackageStatus


class DummyDb:
    def __init__(self) -> None:
        self.commit_calls = 0
        self.refresh_calls = 0

    def commit(self) -> None:
        self.commit_calls += 1

    def refresh(self, _obj) -> None:
        self.refresh_calls += 1


def _package(status: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=100,
        status=status,
        build_id=10,
        platform_version="1.2.3",
        package_manifest_json={"build_id": 10},
        module_bom_json={"modules": ["runtime.chat"]},
        ready_at=None,
        published_at=None,
        cancelled_at=None,
        cancelled_by=None,
        cancellation_reason=None,
        deprecated_at=None,
    )


def _build(status: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=10,
        status=status,
        commit_sha="a" * 40,
        schema_revision="rev-1",
        build_manifest_json={"schema_revision": "rev-1"},
    )


def test_mark_ready_allows_draft_to_ready(monkeypatch):
    db = DummyDb()
    package = _package(PlatformReleasePackageStatus.DRAFT.value)

    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)
    monkeypatch.setattr(
        service,
        "_get_succeeded_build_or_400",
        lambda _db, _build_id: _build(PlatformBuildStatus.SUCCEEDED.value),
    )
    monkeypatch.setattr(service, "_assert_package_readiness", lambda *_args, **_kwargs: None)

    result = service.mark_ready(db, package_id=package.id)

    assert result.status == PlatformReleasePackageStatus.READY.value
    assert result.ready_at is not None
    assert db.commit_calls == 1
    assert db.refresh_calls == 1


def test_publish_allows_ready_to_published(monkeypatch):
    db = DummyDb()
    package = _package(PlatformReleasePackageStatus.READY.value)
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    result = service.publish_package(db, package_id=package.id)

    assert result.status == PlatformReleasePackageStatus.PUBLISHED.value
    assert result.published_at is not None


def test_cancel_allows_draft_and_ready(monkeypatch):
    db = DummyDb()
    package = _package(PlatformReleasePackageStatus.DRAFT.value)
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    result = service.cancel_package(
        db,
        package_id=package.id,
        cancellation_reason="manual stop",
        actor=SimpleNamespace(id=777),
    )
    assert result.status == PlatformReleasePackageStatus.CANCELLED.value
    assert result.cancelled_at is not None
    assert result.cancelled_by == 777
    assert result.cancellation_reason == "manual stop"

    ready_db = DummyDb()
    ready_package = _package(PlatformReleasePackageStatus.READY.value)
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: ready_package)
    ready_result = service.cancel_package(
        ready_db,
        package_id=ready_package.id,
        cancellation_reason="stop at ready",
    )
    assert ready_result.status == PlatformReleasePackageStatus.CANCELLED.value


def test_deprecate_allows_published_to_deprecated(monkeypatch):
    db = DummyDb()
    package = _package(PlatformReleasePackageStatus.PUBLISHED.value)
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    result = service.deprecate_package(db, package_id=package.id)

    assert result.status == PlatformReleasePackageStatus.DEPRECATED.value
    assert result.deprecated_at is not None


def test_forbidden_transitions_are_blocked(monkeypatch):
    with pytest.raises(HTTPException):
        service._assert_transition(
            current_status=PlatformReleasePackageStatus.READY.value,
            allowed_from={PlatformReleasePackageStatus.DRAFT.value},
            action="back_to_draft",
        )

    published = _package(PlatformReleasePackageStatus.PUBLISHED.value)
    cancelled = _package(PlatformReleasePackageStatus.CANCELLED.value)
    deprecated = _package(PlatformReleasePackageStatus.DEPRECATED.value)
    db = DummyDb()

    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: published)
    with pytest.raises(HTTPException):
        service.cancel_package(db, package_id=published.id, cancellation_reason="no")

    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: cancelled)
    with pytest.raises(HTTPException):
        service.mark_ready(db, package_id=cancelled.id)

    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: deprecated)
    with pytest.raises(HTTPException):
        service.publish_package(db, package_id=deprecated.id)


@pytest.mark.parametrize(
    "build_status",
    [
        PlatformBuildStatus.PENDING.value,
        PlatformBuildStatus.RUNNING.value,
        PlatformBuildStatus.FAILED.value,
        PlatformBuildStatus.CANCELLED.value,
    ],
)
def test_assert_build_succeeded_rejects_non_succeeded(build_status: str):
    with pytest.raises(HTTPException) as exc_info:
        service._assert_build_succeeded(_build(build_status))
    assert exc_info.value.status_code == 400
    assert "succeeded build" in str(exc_info.value.detail).lower()


def test_assert_build_succeeded_allows_succeeded():
    service._assert_build_succeeded(_build(PlatformBuildStatus.SUCCEEDED.value))


@pytest.mark.parametrize(
    "build_status",
    [
        PlatformBuildStatus.PENDING.value,
        PlatformBuildStatus.RUNNING.value,
        PlatformBuildStatus.FAILED.value,
        PlatformBuildStatus.CANCELLED.value,
    ],
)
def test_create_release_package_rejects_each_non_succeeded_status(monkeypatch, build_status: str):
    db = DummyDb()
    monkeypatch.setattr(service, "_get_build_or_400", lambda _db, _id: _build(build_status))

    with pytest.raises(HTTPException) as exc_info:
        service.create_release_package(
            db,
            package_key="PKG-20260616-0001",
            build_id=10,
            platform_version="1.0.0",
            package_manifest_json={"build_id": 10},
            module_bom_json={"modules": ["runtime.chat"]},
        )
    assert exc_info.value.status_code == 400


def test_mark_ready_rejects_non_succeeded_build(monkeypatch):
    db = DummyDb()
    package = _package(PlatformReleasePackageStatus.DRAFT.value)
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)
    monkeypatch.setattr(
        service,
        "_get_build_or_400",
        lambda _db, _id: _build(PlatformBuildStatus.FAILED.value),
    )

    with pytest.raises(HTTPException) as exc_info:
        service.mark_ready(db, package_id=package.id)
    assert exc_info.value.status_code == 400
