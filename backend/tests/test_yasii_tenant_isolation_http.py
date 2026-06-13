"""HTTP integration tests for YASII tenant isolation (membership gate)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.ai_context.handoff import clear_handoff_registry
from app.modules.auth.security import create_access_token
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.models import Portal
from app.modules.users.models import Role, User

TEST_HOST_PAYLOAD = {
    "hostSurface": "dashboard",
    "tenantId": "0",
    "userId": "0",
    "sessionId": "session-test",
    "timestamp": "2026-06-13T12:00:00Z",
    "dashboardId": "platform_dev",
    "selectedScope": "yasii-test",
    "widgetId": "embedded-ai-track",
}


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


def _ensure_portals(db: Session, portal_a: int, portal_b: int) -> None:
    for portal_id, label in ((portal_a, "A"), (portal_b, "B")):
        existing = db.query(Portal).filter(Portal.id == portal_id).first()
        if existing is None:
            db.add(
                Portal(
                    id=portal_id,
                    name=f"YASII ISO {label} {_suffix()}",
                    code=f"yasii_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "user").first()
    if role is None:
        role = Role(name=f"yasii_iso_user_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(db: Session, *, portal_id: int) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"yasii_iso_{portal_id}_{_suffix()}@test.local",
        full_name=f"YASII User {portal_id}",
        hashed_password="hash",
        is_active=True,
        tenant_id=portal_id,
        role_id=role.id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _resolve_platform_owner(db: Session) -> User | None:
    row = db.query(PlatformSettings).filter_by(id=PLATFORM_SETTINGS_SINGLETON_ID).first()
    if row is None or row.platform_owner_user_id is None:
        return None
    return db.query(User).filter(User.id == row.platform_owner_user_id).first()


@pytest.fixture(autouse=True)
def _clear_handoff_registry() -> None:
    clear_handoff_registry()
    yield
    clear_handoff_registry()


def test_yasii_query_requires_auth(client: TestClient, db: Session) -> None:
    portal_a = 9301
    _ensure_portals(db, portal_a, 9302)
    db.commit()

    response = client.post(
        f"/yasii/tenants/{portal_a}/query",
        json={
            "requestId": "req-1",
            "payload": {"text": "hello"},
        },
    )

    assert response.status_code == 401, response.text


def test_yasii_query_own_tenant_not_denied(client: TestClient, db: Session) -> None:
    portal_a = 9303
    portal_b = 9304
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        f"/yasii/tenants/{portal_a}/query",
        headers=_auth_headers(user),
        json={
            "requestId": "req-own",
            "payload": {"text": "hello"},
        },
    )

    assert response.status_code != 403, response.text


def test_yasii_query_foreign_tenant_returns_403(client: TestClient, db: Session) -> None:
    portal_a = 9305
    portal_b = 9306
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    response = client.post(
        f"/yasii/tenants/{portal_b}/query",
        headers=_auth_headers(user),
        json={
            "requestId": "req-foreign",
            "payload": {"text": "hello", "tenantId": str(portal_b)},
        },
    )

    assert response.status_code == 403, response.text


def test_yasii_handoff_foreign_tenant_body_returns_403(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9307
    portal_b = 9308
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    payload = dict(TEST_HOST_PAYLOAD)
    payload["tenantId"] = str(portal_b)

    response = client.post(
        f"/ai-context/tenants/{portal_a}/handoff",
        headers=_auth_headers(user),
        json=payload,
    )

    assert response.status_code == 403, response.text


def test_yasii_embedded_query_rejects_foreign_handoff_tenant(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9309
    portal_b = 9310
    _ensure_portals(db, portal_a, portal_b)
    user_a = _create_tenant_user(db, portal_id=portal_a)
    user_b = _create_tenant_user(db, portal_id=portal_b)
    db.commit()

    handoff_response = client.post(
        f"/ai-context/tenants/{portal_a}/handoff",
        headers=_auth_headers(user_a),
        json={**TEST_HOST_PAYLOAD, "tenantId": str(portal_a)},
    )
    assert handoff_response.status_code == 200, handoff_response.text
    handoff_id = handoff_response.json()["handoffId"]

    response = client.post(
        f"/yasii/tenants/{portal_b}/embedded/query",
        headers=_auth_headers(user_b),
        json={"handoffId": handoff_id, "queryText": "test"},
    )

    assert response.status_code == 403, response.text


def test_yasii_embedded_query_allows_own_handoff(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9311
    _ensure_portals(db, portal_a, 9312)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    handoff_response = client.post(
        f"/ai-context/tenants/{portal_a}/handoff",
        headers=_auth_headers(user),
        json={**TEST_HOST_PAYLOAD, "tenantId": str(portal_a)},
    )
    assert handoff_response.status_code == 200, handoff_response.text
    handoff_id = handoff_response.json()["handoffId"]

    response = client.post(
        f"/yasii/tenants/{portal_a}/embedded/query",
        headers=_auth_headers(user),
        json={"handoffId": handoff_id, "queryText": "test"},
    )

    assert response.status_code == 200, response.text


def test_platform_owner_can_access_foreign_yasii_tenant(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9313
    portal_b = 9314
    _ensure_portals(db, portal_a, portal_b)
    owner = _resolve_platform_owner(db)
    if owner is None:
        pytest.skip("Platform owner is not configured in test database")

    db.commit()
    headers = _auth_headers(owner)

    response = client.post(
        f"/yasii/tenants/{portal_b}/query",
        headers=headers,
        json={
            "requestId": "req-owner",
            "payload": {"text": "hello"},
        },
    )

    assert response.status_code != 403, response.text
