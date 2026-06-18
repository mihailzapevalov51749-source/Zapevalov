from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_release.models import PlatformRelease, ReleaseChange
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.users.models import Role, User


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


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


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
        email=f"step3_release_{_suffix()}@test.local",
        full_name="Step3 Release Tester",
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


def _cleanup_package_release(db: Session, package_id: int) -> None:
    package = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == package_id).one_or_none()
    if package is None:
        return
    build_id = package.build_id
    db.delete(package)
    db.flush()
    if build_id is not None:
        build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == build_id).one_or_none()
        if build is not None:
            db.delete(build)
            db.flush()


def test_create_release_uses_build_and_package_sot(client: TestClient, db: Session):
    user = _create_user(db)
    db.commit()
    payload = {
        "title": f"Step3 Create {_suffix()}",
        "description": "Created via adapter",
        "changes": [{"title": "Change 1", "change_type": "feature", "description": "Desc"}],
    }
    response = client.post("/platform/releases", headers=_auth_headers(user), json=payload)
    assert response.status_code == 201, response.text
    body = response.json()

    package = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == body["id"]).one_or_none()
    assert package is not None
    assert package.platform_version == body["version"]
    assert package.package_manifest_json.get("title") == payload["title"]
    assert package.package_manifest_json.get("description") == payload["description"]
    assert package.package_manifest_json.get("created_via") == "platform_releases_api_adapter"

    build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == package.build_id).one_or_none()
    assert build is not None
    assert build.build_manifest_json.get("created_via") == "platform_releases_api_adapter"

    legacy_release = db.query(PlatformRelease).filter(PlatformRelease.id == body["id"]).one_or_none()
    assert legacy_release is None
    assert db.query(ReleaseChange).filter(ReleaseChange.release_id == body["id"]).count() == 0

    _cleanup_package_release(db, package.id)
    db.commit()


def test_list_get_update_modules_work_from_package_sot(client: TestClient, db: Session):
    user = _create_user(db)
    db.commit()
    create_payload = {
        "title": f"Step3 CRUD {_suffix()}",
        "description": "Before update",
        "changes": [{"title": "Init", "change_type": "feature", "description": "Init desc"}],
    }
    created = client.post("/platform/releases", headers=_auth_headers(user), json=create_payload)
    assert created.status_code == 201, created.text
    created_body = created.json()
    release_id = created_body["id"]

    list_response = client.get("/platform/releases", headers=_auth_headers(user))
    assert list_response.status_code == 200, list_response.text
    ids = {item["id"] for item in list_response.json()}
    assert release_id in ids

    get_response = client.get(f"/platform/releases/{release_id}", headers=_auth_headers(user))
    assert get_response.status_code == 200, get_response.text
    get_body = get_response.json()
    assert get_body["title"] == create_payload["title"]
    assert get_body["description"] == create_payload["description"]
    assert get_body["changes"][0]["title"] == "Init"

    update_payload = {
        "title": "Updated title",
        "description": "Updated notes",
        "changes": [{"title": "Edited", "change_type": "fix", "description": "Fix desc"}],
    }
    update_response = client.patch(
        f"/platform/releases/{release_id}",
        headers=_auth_headers(user),
        json=update_payload,
    )
    assert update_response.status_code == 200, update_response.text
    updated = update_response.json()
    assert updated["title"] == "Updated title"
    assert updated["description"] == "Updated notes"
    assert updated["changes"][0]["title"] == "Edited"

    package = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == release_id).one()
    assert package.release_notes == "Updated notes"
    assert package.package_manifest_json.get("title") == "Updated title"
    assert package.package_manifest_json.get("description") == "Updated notes"
    assert package.package_manifest_json.get("changes")[0]["title"] == "Edited"

    modules_response = client.get(f"/platform/releases/{release_id}/modules", headers=_auth_headers(user))
    assert modules_response.status_code == 200, modules_response.text
    modules = modules_response.json()
    assert len(modules) == 1
    assert modules[0]["module_key"] == "legacy.change.1"
    assert modules[0]["release_id"] == release_id

    _cleanup_package_release(db, release_id)
    db.commit()


def test_review_workflow_after_step3_create_without_legacy_release(client: TestClient, db: Session):
    user = _create_user(db)
    reviewer = _create_user(db)
    db.commit()
    legacy_release_count_before = db.query(PlatformRelease).count()
    created = client.post(
        "/platform/releases",
        headers=_auth_headers(user),
        json={
            "title": f"Step3 Review {_suffix()}",
            "description": "Review flow",
            "changes": [{"title": "R1", "change_type": "feature"}],
        },
    )
    assert created.status_code == 201, created.text
    release_id = created.json()["id"]

    submit = client.post(f"/platform/releases/{release_id}/submit-for-review", headers=_auth_headers(user))
    assert submit.status_code == 200, submit.text
    assert submit.json()["status"] == "ready_for_platform_review"

    start = client.post(f"/platform/releases/{release_id}/start-review", headers=_auth_headers(reviewer))
    assert start.status_code == 200, start.text
    assert start.json()["status"] == "in_platform_review"

    request_changes = client.post(
        f"/platform/releases/{release_id}/request-changes",
        headers=_auth_headers(reviewer),
        json={"comment": "Need revision"},
    )
    assert request_changes.status_code == 200, request_changes.text
    assert request_changes.json()["status"] == "changes_requested"

    resubmit = client.post(f"/platform/releases/{release_id}/submit-for-review", headers=_auth_headers(user))
    assert resubmit.status_code == 200, resubmit.text
    assert resubmit.json()["status"] == "ready_for_platform_review"

    restart = client.post(f"/platform/releases/{release_id}/start-review", headers=_auth_headers(reviewer))
    assert restart.status_code == 200, restart.text
    approve = client.post(
        f"/platform/releases/{release_id}/approve",
        headers=_auth_headers(reviewer),
        json={"comment": "Approved"},
    )
    assert approve.status_code == 200, approve.text
    assert approve.json()["status"] == "approved_by_platform"

    assert db.query(PlatformRelease).count() == legacy_release_count_before
    _cleanup_package_release(db, release_id)
    db.commit()
