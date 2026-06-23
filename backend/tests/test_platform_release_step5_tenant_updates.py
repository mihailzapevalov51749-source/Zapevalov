from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release.models import TenantUpdateOffer
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
        email=f"step5_tenant_{_suffix()}@test.local",
        full_name="Step5 Tenant Tester",
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


def _resolve_client_portal_id(db: Session) -> int:
    portal = (
        db.query(Portal)
        .filter(Portal.tenant_type == TenantType.CLIENT.value)
        .filter(Portal.tenant_status == TenantStatus.ACTIVE.value)
        .order_by(Portal.id.asc())
        .first()
    )
    if portal is None:
        raise AssertionError("No active CLIENT portal found for Step5 tests")
    return int(portal.id)


def _create_release(client: TestClient, user: User) -> int:
    last_response = None
    for _ in range(5):
        response = client.post(
            "/platform/releases",
            headers=_auth_headers(user),
            json={
                "title": f"Step5 Release {_suffix()}",
                "description": "Tenant update migration",
                "changes": [{"title": "Change", "change_type": "feature"}],
            },
        )
        if response.status_code == 201:
            return response.json()["id"]
        last_response = response
        if response.status_code != 409:
            break
    assert last_response is not None
    raise AssertionError(last_response.text)


def _approve_and_publish(client: TestClient, release_id: int, user: User) -> None:
    assert client.post(
        f"/platform/releases/{release_id}/submit-for-review",
        headers=_auth_headers(user),
    ).status_code == 200
    assert client.post(
        f"/platform/releases/{release_id}/start-review",
        headers=_auth_headers(user),
    ).status_code == 200
    assert client.post(
        f"/platform/releases/{release_id}/approve",
        headers=_auth_headers(user),
        json={"comment": "Approved"},
    ).status_code == 200
    assert client.post(
        f"/platform/releases/{release_id}/publish-to-template",
        headers=_auth_headers(user),
    ).status_code == 200


def _cleanup_release_artifacts(db: Session, release_id: int) -> None:
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
    db.query(TenantUpdateOffer).filter(TenantUpdateOffer.release_id == release_id).delete(
        synchronize_session=False
    )
    db.query(PlatformDeployment).filter(
        PlatformDeployment.release_package_id == release_id
    ).delete(synchronize_session=False)
    package = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == release_id).one_or_none()
    if package is not None:
        db.delete(package)
    db.flush()


def _first_offer_id(client: TestClient, tenant_id: int, user: User) -> int:
    response = client.get(
        f"/tenants/{tenant_id}/updates",
        headers=_auth_headers(user),
        params={"status": "available"},
    )
    assert response.status_code == 200, response.text
    items = response.json()
    assert items, "Expected at least one update offer"
    return int(items[0]["id"])


def test_step5_full_flow_offer_and_apply_via_client_deployment(client: TestClient, db: Session):
    _ensure_template_portal(db)
    tenant_id = _resolve_client_portal_id(db)
    reviewer = _create_user(db, role_name="superadmin", tenant_id=None)
    tenant_user = _create_user(db, role_name="admin", tenant_id=tenant_id)
    db.commit()

    release_id = _create_release(client, reviewer)
    _approve_and_publish(client, release_id, reviewer)

    offer_result = client.post(
        f"/platform/releases/{release_id}/offer-to-tenants",
        headers=_auth_headers(reviewer),
    )
    assert offer_result.status_code == 200, offer_result.text
    assert offer_result.json()["offers_created"] >= 1
    assert offer_result.json()["release"]["status"] in {
        "offered_to_tenants",
        "published_to_template",
        "approved_by_platform",
    }

    offer_id = _first_offer_id(client, tenant_id, tenant_user)
    apply_result = client.post(
        f"/tenants/{tenant_id}/updates/{offer_id}/apply",
        headers=_auth_headers(tenant_user),
    )
    assert apply_result.status_code == 200, apply_result.text
    body = apply_result.json()
    assert body["offer"]["status"] == "applied"

    deployments = (
        db.query(PlatformDeployment)
        .filter(
            PlatformDeployment.release_package_id == release_id,
            PlatformDeployment.target_environment_type == "client",
            PlatformDeployment.target_tenant_id == tenant_id,
        )
        .all()
    )
    assert deployments, "Client deployment should be created"
    assert deployments[-1].status == "succeeded"

    env_row = (
        db.query(PlatformEnvironmentVersion)
        .filter(PlatformEnvironmentVersion.tenant_id == tenant_id)
        .one_or_none()
    )
    assert env_row is not None
    assert env_row.platform_version == body["tenant_version"]["current_version"]

    history_rows = (
        db.query(PlatformVersionHistory)
        .filter(PlatformVersionHistory.tenant_id == tenant_id)
        .all()
    )
    assert history_rows
    assert any(row.platform_version == env_row.platform_version for row in history_rows)

    _cleanup_release_artifacts(db, release_id)
    db.commit()


def test_offer_for_unpublished_package_is_forbidden(client: TestClient, db: Session):
    _ensure_template_portal(db)
    tenant_id = _resolve_client_portal_id(db)
    reviewer = _create_user(db, role_name="superadmin", tenant_id=None)
    db.commit()
    release_id = _create_release(client, reviewer)

    response = client.post(
        f"/platform/releases/{release_id}/offer-to-tenants",
        headers=_auth_headers(reviewer),
    )
    assert response.status_code == 400

    _cleanup_release_artifacts(db, release_id)
    db.commit()


def test_apply_missing_and_processed_offers(client: TestClient, db: Session):
    _ensure_template_portal(db)
    tenant_id = _resolve_client_portal_id(db)
    reviewer = _create_user(db, role_name="superadmin", tenant_id=None)
    tenant_user = _create_user(db, role_name="admin", tenant_id=tenant_id)
    db.commit()

    missing = client.post(
        f"/tenants/{tenant_id}/updates/999999/apply",
        headers=_auth_headers(tenant_user),
    )
    assert missing.status_code == 404

    release_id = _create_release(client, reviewer)
    _approve_and_publish(client, release_id, reviewer)
    assert client.post(
        f"/platform/releases/{release_id}/offer-to-tenants",
        headers=_auth_headers(reviewer),
    ).status_code == 200
    offer_id = _first_offer_id(client, tenant_id, tenant_user)
    assert client.post(
        f"/tenants/{tenant_id}/updates/{offer_id}/apply",
        headers=_auth_headers(tenant_user),
    ).status_code == 200
    applied_again = client.post(
        f"/tenants/{tenant_id}/updates/{offer_id}/apply",
        headers=_auth_headers(tenant_user),
    )
    assert applied_again.status_code == 400

    release_id_skip = _create_release(client, reviewer)
    _approve_and_publish(client, release_id_skip, reviewer)
    assert client.post(
        f"/platform/releases/{release_id_skip}/offer-to-tenants",
        headers=_auth_headers(reviewer),
    ).status_code == 200
    skip_offer_id = _first_offer_id(client, tenant_id, tenant_user)
    assert client.post(
        f"/tenants/{tenant_id}/updates/{skip_offer_id}/skip",
        headers=_auth_headers(tenant_user),
    ).status_code == 200
    skipped_apply = client.post(
        f"/tenants/{tenant_id}/updates/{skip_offer_id}/apply",
        headers=_auth_headers(tenant_user),
    )
    assert skipped_apply.status_code == 400

    _cleanup_release_artifacts(db, release_id)
    _cleanup_release_artifacts(db, release_id_skip)
    db.commit()


def test_apply_handles_deployment_failure(client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch):
    _ensure_template_portal(db)
    tenant_id = _resolve_client_portal_id(db)
    reviewer = _create_user(db, role_name="superadmin", tenant_id=None)
    tenant_user = _create_user(db, role_name="admin", tenant_id=tenant_id)
    db.commit()

    release_id = _create_release(client, reviewer)
    _approve_and_publish(client, release_id, reviewer)
    assert client.post(
        f"/platform/releases/{release_id}/offer-to-tenants",
        headers=_auth_headers(reviewer),
    ).status_code == 200
    offer_id = _first_offer_id(client, tenant_id, tenant_user)

    from app.modules.platform_release import service as release_service

    def _fail_mark_succeeded(db_session: Session, *, deployment_id: int):
        raise HTTPException(status_code=500, detail=f"deployment failed {deployment_id}")

    monkeypatch.setattr(release_service.deployment_registry_service, "mark_succeeded", _fail_mark_succeeded)
    failed = client.post(
        f"/tenants/{tenant_id}/updates/{offer_id}/apply",
        headers=_auth_headers(tenant_user),
    )
    assert failed.status_code == 500

    offer = db.query(TenantUpdateOffer).filter(TenantUpdateOffer.id == offer_id).one()
    assert offer.status == "available"
    assert offer.applied_at is None

    _cleanup_release_artifacts(db, release_id)
    db.commit()
