"""Review workflow on package Source Of Truth (migration Step 2)."""

from __future__ import annotations

import uuid
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_build_registry import service as build_service
from app.modules.platform_release.constants import PlatformReleaseStatus
from app.modules.platform_release.schemas import PlatformReleaseOut
from app.modules.platform_release_package_registry import adapters, service
from app.modules.platform_release_package_registry.constants import PlatformReleasePackageStatus
from app.modules.platform_release_package_registry.governance import get_review_status
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.users.models import Role, User


class DummyDb:
    def __init__(self) -> None:
        self.commit_calls = 0
        self.refresh_calls = 0

    def commit(self) -> None:
        self.commit_calls += 1

    def refresh(self, _obj) -> None:
        self.refresh_calls += 1


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _package(
    *,
    review_status: str = PlatformReleaseStatus.DRAFT.value,
    manifest: dict | None = None,
) -> SimpleNamespace:
    base_manifest = dict(manifest or {})
    base_manifest.setdefault(
        "governance",
        {
            "review_status": review_status,
            "submitted_at": None,
            "submitted_by": None,
            "review_started_at": None,
            "review_started_by": None,
            "review_comment": None,
            "approved_at": None,
            "approved_by": None,
            "changes_requested_at": None,
            "changes_requested_by": None,
            "offered_at": None,
            "offered_by": None,
        },
    )
    return SimpleNamespace(
        id=501,
        package_key="PKG-20260616-0001",
        platform_version="1.3.0",
        build_id=7,
        status=PlatformReleasePackageStatus.DRAFT.value,
        package_manifest_json=base_manifest,
        module_bom_json={"modules": ["runtime.chat"]},
        release_notes="Package release notes",
        created_by=10,
        created_at=datetime(2026, 6, 16, 10, 0, 0),
        published_at=None,
    )


def _actor(user_id: int = 99) -> SimpleNamespace:
    return SimpleNamespace(id=user_id)


def test_submit_for_review_from_draft(monkeypatch):
    db = DummyDb()
    package = _package()
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    result = service.submit_for_review(db, package_id=package.id, actor=_actor())

    assert get_review_status(result) == PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value
    assert result.package_manifest_json["governance"]["submitted_by"] == 99
    assert db.commit_calls == 1


def test_submit_for_review_from_changes_requested(monkeypatch):
    db = DummyDb()
    package = _package(review_status=PlatformReleaseStatus.CHANGES_REQUESTED.value)
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    result = service.submit_for_review(db, package_id=package.id, actor=_actor())

    assert get_review_status(result) == PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value


def test_submit_for_review_rejects_approved(monkeypatch):
    db = DummyDb()
    package = _package(review_status=PlatformReleaseStatus.APPROVED_BY_PLATFORM.value)
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    with pytest.raises(HTTPException) as exc_info:
        service.submit_for_review(db, package_id=package.id, actor=_actor())

    assert exc_info.value.status_code == 400


def test_start_review_rejects_draft(monkeypatch):
    db = DummyDb()
    package = _package()
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    with pytest.raises(HTTPException):
        service.start_review(db, package_id=package.id, actor=_actor())


def test_request_changes_rejects_draft(monkeypatch):
    db = DummyDb()
    package = _package()
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    with pytest.raises(HTTPException):
        service.request_changes(
            db,
            package_id=package.id,
            comment="fix",
            actor=_actor(),
        )


def test_approve_package_rejects_ready_for_review(monkeypatch):
    db = DummyDb()
    package = _package(review_status=PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value)
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    with pytest.raises(HTTPException):
        service.approve_package(db, package_id=package.id, actor=_actor())


def test_full_review_transitions_update_adapter_status(monkeypatch):
    db = DummyDb()
    package = _package(
        manifest={
            "title": "Review package",
            "changes": [{"title": "Change 1", "change_type": "feature"}],
        },
    )
    monkeypatch.setattr(service, "get_release_package", lambda _db, _id: package)

    service.submit_for_review(db, package_id=package.id, actor=_actor(1))
    out = adapters.package_to_platform_release_out(package)
    assert out.status == PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value

    service.start_review(db, package_id=package.id, actor=_actor(2))
    out = adapters.package_to_platform_release_out(package)
    assert out.status == PlatformReleaseStatus.IN_PLATFORM_REVIEW.value

    service.request_changes(db, package_id=package.id, comment="Need fixes", actor=_actor(2))
    out = adapters.package_to_platform_release_out(package)
    assert out.status == PlatformReleaseStatus.CHANGES_REQUESTED.value
    assert out.review_comment == "Need fixes"

    service.submit_for_review(db, package_id=package.id, actor=_actor(1))
    service.start_review(db, package_id=package.id, actor=_actor(2))
    service.approve_package(db, package_id=package.id, actor=_actor(2), comment="OK")
    out = adapters.package_to_platform_release_out(package)
    assert isinstance(out, PlatformReleaseOut)
    assert out.status == PlatformReleaseStatus.APPROVED_BY_PLATFORM.value
    assert out.approved_by == 2


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=False)


def _ensure_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role


def _create_user(db: Session, *, role_name: str = "admin") -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"pkg_review_{_suffix()}@test.local",
        full_name="Package Review Tester",
        hashed_password="hash",
        is_active=True,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _create_draft_package(db: Session, actor: User, suffix: str) -> PlatformReleasePackage:
    seq = int(suffix[:4], 16) % 10000
    build_key = f"BLD-20260616-{seq:04d}"
    package_key = f"PKG-20260616-{seq:04d}"
    version = f"9.9.{seq}"

    build = build_service.create_build(
        db,
        build_key=build_key,
        commit_sha="a" * 40,
        build_manifest_json={"schema_revision": "rev-test", "source_tenant_id": 1},
        actor=actor,
    )
    build_service.start_build(db, build_id=build.id)
    build_service.mark_succeeded(db, build_id=build.id)

    return service.create_release_package(
        db,
        package_key=package_key,
        build_id=build.id,
        platform_version=version,
        package_manifest_json={
            "title": f"Package review {suffix}",
            "build_id": build.id,
            "changes": [{"title": "Change", "change_type": "feature"}],
        },
        module_bom_json={"modules": ["runtime.chat"]},
        actor=actor,
    )


def _cleanup_package(db: Session, package_id: int) -> None:
    package = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == package_id).one_or_none()
    if package is None:
        return
    db.delete(package)
    db.flush()


class TestPackageReviewQueueIntegration:
    def test_review_queue_and_count_from_packages(self, client: TestClient, db: Session) -> None:
        suffix = _suffix()
        reviewer = _create_user(db)
        package = _create_draft_package(db, reviewer, suffix)
        db.commit()

        submit = client.post(
            f"/platform/releases/{package.id}/submit-for-review",
            headers=_auth_headers(reviewer),
        )
        assert submit.status_code == 200, submit.text
        assert submit.json()["status"] == PlatformReleaseStatus.READY_FOR_PLATFORM_REVIEW.value

        queue = client.get("/platform/releases/review-queue", headers=_auth_headers(reviewer))
        assert queue.status_code == 200
        queue_ids = {item["id"] for item in queue.json()}
        assert package.id in queue_ids

        count = client.get("/platform/releases/review-count", headers=_auth_headers(reviewer))
        assert count.status_code == 200
        assert count.json()["count"] >= 1

        start = client.post(
            f"/platform/releases/{package.id}/start-review",
            headers=_auth_headers(reviewer),
        )
        assert start.status_code == 200
        assert start.json()["status"] == PlatformReleaseStatus.IN_PLATFORM_REVIEW.value

        count_after_start = client.get("/platform/releases/review-count", headers=_auth_headers(reviewer))
        assert count_after_start.json()["count"] >= 1

        _cleanup_package(db, package.id)
        db.commit()
