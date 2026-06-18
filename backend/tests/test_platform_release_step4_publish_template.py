from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_environment.resolver import resolve_template_tenant_id
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
        email=f"step4_publish_{_suffix()}@test.local",
        full_name="Step4 Publish Tester",
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


def _ensure_template_portal(db: Session) -> int:
    existing = resolve_template_tenant_id(db)
    if existing is not None:
        return existing
    portal = Portal(
        name=f"Template {_suffix()}",
        code=f"template_{_suffix()}",
        tenant_type=TenantType.TEMPLATE.value,
        tenant_status=TenantStatus.ACTIVE.value,
        template_version="1.0.0",
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal.id


def _create_release(client: TestClient, user: User) -> int:
    response = client.post(
        "/platform/releases",
        headers=_auth_headers(user),
        json={
            "title": f"Step4 Publish {_suffix()}",
            "description": "Publish to template test",
            "changes": [{"title": "Change", "change_type": "feature"}],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def _approve_release(client: TestClient, release_id: int, user: User) -> None:
    assert client.post(
        f"/platform/releases/{release_id}/submit-for-review",
        headers=_auth_headers(user),
    ).status_code == 200
    assert client.post(
        f"/platform/releases/{release_id}/start-review",
        headers=_auth_headers(user),
    ).status_code == 200
    approve = client.post(
        f"/platform/releases/{release_id}/approve",
        headers=_auth_headers(user),
        json={"comment": "Approved"},
    )
    assert approve.status_code == 200, approve.text
    assert approve.json()["status"] == "approved_by_platform"


def _cleanup_package_dependencies(db: Session, release_id: int) -> None:
    tenant_ids = [
        row.target_tenant_id
        for row in db.query(PlatformDeployment)
        .filter(PlatformDeployment.release_package_id == release_id)
        .all()
        if row.target_tenant_id is not None
    ]
    if tenant_ids:
        db.query(PlatformVersionHistory).filter(
            PlatformVersionHistory.tenant_id.in_(tenant_ids)
        ).delete(synchronize_session=False)
        db.query(PlatformEnvironmentVersion).filter(
            PlatformEnvironmentVersion.tenant_id.in_(tenant_ids)
        ).delete(synchronize_session=False)
    db.query(PlatformDeployment).filter(
        PlatformDeployment.release_package_id == release_id
    ).delete(synchronize_session=False)
    package = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == release_id).one_or_none()
    if package is not None:
        db.delete(package)
    db.flush()


def test_publish_to_template_uses_package_and_deployment_runtime(client: TestClient, db: Session):
    _ensure_template_portal(db)
    reviewer = _create_user(db)
    db.commit()

    release_id = _create_release(client, reviewer)
    _approve_release(client, release_id, reviewer)

    publish = client.post(
        f"/platform/releases/{release_id}/publish-to-template",
        headers=_auth_headers(reviewer),
    )
    assert publish.status_code == 200, publish.text
    body = publish.json()
    assert body["release"]["status"] == "published_to_template"

    package = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == release_id).one()
    assert package.status == "published"
    governance = package.package_manifest_json.get("governance") or {}
    assert governance.get("review_status") == "published_to_template"

    deployment = (
        db.query(PlatformDeployment)
        .filter(PlatformDeployment.release_package_id == release_id)
        .order_by(PlatformDeployment.id.desc())
        .first()
    )
    assert deployment is not None
    assert deployment.status == "succeeded"
    assert deployment.target_environment_type == "template"

    env_row = (
        db.query(PlatformEnvironmentVersion)
        .filter(PlatformEnvironmentVersion.tenant_id == deployment.target_tenant_id)
        .one_or_none()
    )
    assert env_row is not None
    assert env_row.platform_version == package.platform_version

    history_rows = (
        db.query(PlatformVersionHistory)
        .filter(PlatformVersionHistory.tenant_id == deployment.target_tenant_id)
        .all()
    )
    assert len(history_rows) >= 1
    assert any(row.platform_version == package.platform_version for row in history_rows)

    _cleanup_package_dependencies(db, release_id)
    db.commit()


def test_publish_forbidden_without_approve(client: TestClient, db: Session):
    _ensure_template_portal(db)
    reviewer = _create_user(db)
    db.commit()
    release_id = _create_release(client, reviewer)

    publish = client.post(
        f"/platform/releases/{release_id}/publish-to-template",
        headers=_auth_headers(reviewer),
    )
    assert publish.status_code == 400
    assert "approved by platform" in publish.json()["detail"].lower()

    _cleanup_package_dependencies(db, release_id)
    db.commit()


def test_publish_forbidden_for_cancelled_and_deprecated_package(client: TestClient, db: Session):
    _ensure_template_portal(db)
    reviewer = _create_user(db)
    db.commit()

    cancelled_id = _create_release(client, reviewer)
    _approve_release(client, cancelled_id, reviewer)
    package_cancelled = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == cancelled_id).one()
    package_cancelled.status = "cancelled"
    db.commit()
    publish_cancelled = client.post(
        f"/platform/releases/{cancelled_id}/publish-to-template",
        headers=_auth_headers(reviewer),
    )
    assert publish_cancelled.status_code == 400
    assert "must be ready" in publish_cancelled.json()["detail"].lower()

    deprecated_id = _create_release(client, reviewer)
    _approve_release(client, deprecated_id, reviewer)
    package_deprecated = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == deprecated_id).one()
    package_deprecated.status = "deprecated"
    db.commit()
    publish_deprecated = client.post(
        f"/platform/releases/{deprecated_id}/publish-to-template",
        headers=_auth_headers(reviewer),
    )
    assert publish_deprecated.status_code == 400
    assert "must be ready" in publish_deprecated.json()["detail"].lower()

    _cleanup_package_dependencies(db, cancelled_id)
    _cleanup_package_dependencies(db, deprecated_id)
    db.commit()
