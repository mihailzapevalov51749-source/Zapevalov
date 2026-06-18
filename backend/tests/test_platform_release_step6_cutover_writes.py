from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release.models import PlatformRelease, ReleaseChange, TenantUpdateOffer
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
    return TestClient(app, raise_server_exceptions=True)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _ensure_role(db: Session, name: str) -> Role:
    role = db.query(Role).filter(Role.name == name).first()
    if role is None:
        role = Role(name=name, description=f"test role {name}")
        db.add(role)
        db.flush()
    return role


def _create_user(db: Session, *, role_name: str = "admin", tenant_id: int | None = None) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"step6_cutover_{_suffix()}@test.local",
        full_name="Step6 Cutover Tester",
        hashed_password="hash",
        is_active=True,
        tenant_id=tenant_id,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _resolve_client_portal_id(db: Session) -> int:
    portal = (
        db.query(Portal)
        .filter(Portal.tenant_type == TenantType.CLIENT.value)
        .filter(Portal.tenant_status == TenantStatus.ACTIVE.value)
        .order_by(Portal.id.asc())
        .first()
    )
    if portal is None:
        raise AssertionError("No active CLIENT portal found for Step6 tests")
    return portal.id


def _create_release(client: TestClient, headers: dict[str, str]) -> dict:
    last_response = None
    for _ in range(5):
        suffix = _suffix()
        response = client.post(
            "/platform/releases",
            headers=headers,
            json={
                "title": f"Step6 cutover {suffix}",
                "description": "Cutover writes regression",
                "changes": [
                    {
                        "change_type": "feature",
                        "title": f"Change {suffix}",
                        "description": "step6",
                        "risk_level": "low",
                    }
                ],
            },
        )
        if response.status_code == 201:
            return response.json()
        last_response = response
        if response.status_code != 409:
            break
    assert last_response is not None
    raise AssertionError(f"Failed to create release: {last_response.status_code} {last_response.text}")


def _cleanup_release_artifacts(db: Session, release_id: int, tenant_ids: list[int]) -> None:
    db.query(TenantUpdateOffer).filter(TenantUpdateOffer.release_id == release_id).delete(
        synchronize_session=False
    )
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
        build_id = package.build_id
        db.delete(package)
        db.flush()
        if build_id is not None:
            from app.modules.platform_build_registry.models import PlatformCodeBuild

            build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == build_id).one_or_none()
            if build is not None:
                db.delete(build)
    db.commit()


def test_full_flow_does_not_write_platform_releases(client: TestClient, db: Session):
    reviewer = _create_user(db, role_name="superadmin", tenant_id=None)
    tenant_user = _create_user(
        db,
        role_name="admin",
        tenant_id=_resolve_client_portal_id(db),
    )
    client_portal_id = _resolve_client_portal_id(db)
    template_id = resolve_template_tenant_id(db)
    assert template_id is not None
    db.commit()

    reviewer_headers = _auth_headers(reviewer)
    tenant_headers = _auth_headers(tenant_user)

    releases_before = db.query(PlatformRelease).count()
    changes_before = db.query(ReleaseChange).count()

    created = _create_release(client, reviewer_headers)
    release_id = created["id"]

    try:
        assert client.post(
            f"/platform/releases/{release_id}/submit-for-review",
            headers=reviewer_headers,
        ).status_code == 200
        assert client.post(
            f"/platform/releases/{release_id}/start-review",
            headers=reviewer_headers,
        ).status_code == 200
        assert client.post(
            f"/platform/releases/{release_id}/approve",
            headers=reviewer_headers,
            json={"comment": "ok"},
        ).status_code == 200
        assert client.post(
            f"/platform/releases/{release_id}/publish-to-template",
            headers=reviewer_headers,
        ).status_code == 200
        assert client.post(
            f"/platform/releases/{release_id}/offer-to-tenants",
            headers=reviewer_headers,
        ).status_code == 200

        offers = client.get(
            f"/tenants/{client_portal_id}/updates",
            headers=tenant_headers,
            params={"status": "available"},
        ).json()
        offer = next(item for item in offers if item["release_id"] == release_id)
        assert client.post(
            f"/tenants/{client_portal_id}/updates/{offer['id']}/apply",
            headers=tenant_headers,
        ).status_code == 200

        assert db.query(PlatformRelease).count() == releases_before
        assert db.query(ReleaseChange).count() == changes_before

        deployment = (
            db.query(PlatformDeployment)
            .filter(PlatformDeployment.release_package_id == release_id)
            .filter(PlatformDeployment.target_tenant_id == client_portal_id)
            .order_by(PlatformDeployment.id.desc())
            .first()
        )
        assert deployment is not None
        assert deployment.status == "succeeded"

        env = (
            db.query(PlatformEnvironmentVersion)
            .filter(PlatformEnvironmentVersion.tenant_id == client_portal_id)
            .one_or_none()
        )
        assert env is not None
        assert env.platform_version == created["version"]
    finally:
        _cleanup_release_artifacts(db, release_id, [client_portal_id, template_id])


def test_legacy_release_id_returns_404_on_review_actions(client: TestClient, db: Session):
    reviewer = _create_user(db, role_name="superadmin", tenant_id=None)
    db.commit()
    headers = _auth_headers(reviewer)
    missing_id = 9_999_999

    for path in (
        "submit-for-review",
        "start-review",
        "request-changes",
        "approve",
        "offer-to-tenants",
    ):
        method = "post"
        kwargs: dict = {"headers": headers}
        if path == "request-changes":
            kwargs["json"] = {"comment": "legacy"}
        elif path == "approve":
            kwargs["json"] = {"comment": "legacy"}

        response = client.request(
            method,
            f"/platform/releases/{missing_id}/{path}",
            **kwargs,
        )
        assert response.status_code == 404, path
        assert "Package not found" in response.text
