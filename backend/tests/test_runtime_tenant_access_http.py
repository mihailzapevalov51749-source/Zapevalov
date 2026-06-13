"""HTTP integration tests for runtime API tenant isolation (membership gate)."""

from __future__ import annotations

import uuid
from typing import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.models import Portal
from app.modules.users.models import Role, User

OBJECT_TYPE_KEY = "task"
FAKE_ENTITY_ID = "00000000-0000-4000-8000-000000000001"


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
                    name=f"Runtime ISO {label} {_suffix()}",
                    code=f"runtime_iso_{portal_id}_{_suffix()}",
                )
            )
    db.flush()


def _ensure_role(db: Session) -> Role:
    role = db.query(Role).filter(Role.name == "user").first()
    if role is None:
        role = Role(name=f"runtime_iso_user_{_suffix()}", description="test")
        db.add(role)
        db.flush()
    return role


def _create_tenant_user(db: Session, *, portal_id: int) -> User:
    role = _ensure_role(db)
    user = User(
        email=f"runtime_iso_{portal_id}_{_suffix()}@test.local",
        full_name=f"Runtime User {portal_id}",
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


def _runtime_cases(tenant_id: int) -> list[tuple[str, str, Callable[[TestClient, dict[str, str]], object]]]:
    return [
        (
            "entities_list",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/entities/tenants/{tenant_id}/{OBJECT_TYPE_KEY}",
                headers=headers,
            ),
        ),
        (
            "query_list",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/query/tenants/{tenant_id}/{OBJECT_TYPE_KEY}",
                headers=headers,
            ),
        ),
        (
            "catalog",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/platform-metadata/tenants/{tenant_id}/catalog",
                headers=headers,
            ),
        ),
        (
            "catalog_version",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/platform-metadata/tenants/{tenant_id}/catalog/version",
                headers=headers,
            ),
        ),
        (
            "plan_tree",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/plan-tree/tenants/{tenant_id}/object-types/{OBJECT_TYPE_KEY}/views/plan",
                headers=headers,
            ),
        ),
        (
            "relations_by_key",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/relations/tenants/{tenant_id}/subtasks",
                headers=headers,
            ),
        ),
        (
            "relation_outgoing",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/relations/tenants/{tenant_id}/entities/{FAKE_ENTITY_ID}/outgoing",
                headers=headers,
            ),
        ),
        (
            "relation_field_state",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/relation-fields/tenants/{tenant_id}/entities/{FAKE_ENTITY_ID}/fields/parent",
                headers=headers,
            ),
        ),
        (
            "actions_placement",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/actions/tenants/{tenant_id}/{OBJECT_TYPE_KEY}/table_row",
                headers=headers,
            ),
        ),
        (
            "office_user_views",
            "GET",
            lambda client, headers: client.get(
                f"/runtime/office-user-views/tenants/{tenant_id}/{OBJECT_TYPE_KEY}",
                headers=headers,
            ),
        ),
        (
            "runtime_search",
            "POST",
            lambda client, headers: client.post(
                f"/runtime/search/tenants/{tenant_id}",
                headers=headers,
                json={
                    "query": "test",
                    "scope": "runtime.object_type",
                    "params": {"objectTypeKey": OBJECT_TYPE_KEY},
                },
            ),
        ),
        (
            "platform_search",
            "POST",
            lambda client, headers: client.post(
                f"/platform/search/tenants/{tenant_id}",
                headers=headers,
                json={
                    "query": "test",
                    "scope": "runtime.object_type",
                    "currentMode": "runtime",
                    "params": {"objectTypeKey": OBJECT_TYPE_KEY},
                },
            ),
        ),
    ]


@pytest.mark.parametrize(
    "case_name,method,invoke",
    [pytest.param(name, method, fn, id=name) for name, method, fn in _runtime_cases(0)],
)
def test_runtime_endpoints_require_auth(
    client: TestClient,
    db: Session,
    case_name: str,
    method: str,
    invoke: Callable,
) -> None:
    portal_a = 9201
    _ensure_portals(db, portal_a, 9202)
    db.commit()

    _, method, fn = next(item for item in _runtime_cases(portal_a) if item[0] == case_name)
    response = fn(client, {})

    assert response.status_code == 401, response.text


@pytest.mark.parametrize(
    "case_name,method,invoke",
    [pytest.param(name, method, fn, id=name) for name, method, fn in _runtime_cases(0)],
)
def test_runtime_own_tenant_not_denied(
    client: TestClient,
    db: Session,
    case_name: str,
    method: str,
    invoke: Callable,
) -> None:
    portal_a = 9203
    portal_b = 9204
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    headers = _auth_headers(user)
    _, _, fn = next(item for item in _runtime_cases(portal_a) if item[0] == case_name)
    response = fn(client, headers)

    assert response.status_code != 403, response.text


@pytest.mark.parametrize(
    "case_name,method,invoke",
    [pytest.param(name, method, fn, id=name) for name, method, fn in _runtime_cases(0)],
)
def test_runtime_foreign_tenant_returns_403(
    client: TestClient,
    db: Session,
    case_name: str,
    method: str,
    invoke: Callable,
) -> None:
    portal_a = 9205
    portal_b = 9206
    _ensure_portals(db, portal_a, portal_b)
    user = _create_tenant_user(db, portal_id=portal_a)
    db.commit()

    headers = _auth_headers(user)
    _, _, fn = next(item for item in _runtime_cases(portal_b) if item[0] == case_name)
    response = fn(client, headers)

    assert response.status_code == 403, response.text


def _resolve_platform_owner(db: Session) -> User | None:
    row = db.query(PlatformSettings).filter_by(id=PLATFORM_SETTINGS_SINGLETON_ID).first()
    if row is None or row.platform_owner_user_id is None:
        return None
    return db.query(User).filter(User.id == row.platform_owner_user_id).first()


def test_platform_owner_can_access_foreign_runtime_tenant(
    client: TestClient,
    db: Session,
) -> None:
    portal_a = 9207
    portal_b = 9208
    _ensure_portals(db, portal_a, portal_b)
    owner = _resolve_platform_owner(db)
    if owner is None:
        pytest.skip("Platform owner is not configured in test database")

    db.commit()
    headers = _auth_headers(owner)

    response = client.get(
        f"/runtime/entities/tenants/{portal_b}/{OBJECT_TYPE_KEY}",
        headers=headers,
    )

    assert response.status_code != 403, response.text
