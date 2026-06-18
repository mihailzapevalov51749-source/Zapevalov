"""Tests for platform version registry (Phase 1)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_version_registry.constants import (
    DEFAULT_DEV_PLATFORM_VERSION,
    PlatformEnvironmentKey,
)
from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)
from app.modules.platform_version_registry.seed import seed_platform_version_registry
from app.modules.platform_version_registry.service import record_environment_version
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
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
        email=f"version_registry_{role_name}_{_suffix()}@test.local",
        full_name=f"Version Registry {role_name}",
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


def _create_portal(db: Session, *, tenant_type: str) -> Portal:
    portal = Portal(
        name=f"Version Registry {tenant_type} {_suffix()}",
        code=f"version_registry_{tenant_type.lower()}_{_suffix()}",
        tenant_type=tenant_type,
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def test_platform_version_registry_tables_exist(db: Session) -> None:
    inspector = inspect(db.bind)
    names = set(inspector.get_table_names())
    assert "platform_environment_versions" in names
    assert "platform_version_history" in names


def test_record_environment_version_creates_history(db: Session) -> None:
    portal = _create_portal(db, tenant_type=TenantType.DEV.value)
    record_environment_version(
        db,
        tenant_id=portal.id,
        platform_version=DEFAULT_DEV_PLATFORM_VERSION,
        change_description="Initial DEV version",
        commit=False,
    )

    current = (
        db.query(PlatformEnvironmentVersion)
        .filter(PlatformEnvironmentVersion.tenant_id == portal.id)
        .one()
    )
    assert current.platform_version == DEFAULT_DEV_PLATFORM_VERSION
    assert current.environment_key == PlatformEnvironmentKey.DEV.value

    history = (
        db.query(PlatformVersionHistory)
        .filter(PlatformVersionHistory.tenant_id == portal.id)
        .all()
    )
    assert len(history) == 1
    assert history[0].change_description == "Initial DEV version"


def test_record_environment_version_supersedes_previous(db: Session) -> None:
    portal = _create_portal(db, tenant_type=TenantType.TEMPLATE.value)
    record_environment_version(
        db,
        tenant_id=portal.id,
        platform_version="1.0.0",
        change_description="v1",
        commit=False,
    )
    record_environment_version(
        db,
        tenant_id=portal.id,
        platform_version="1.1.0",
        change_description="v2",
        commit=False,
    )

    current = (
        db.query(PlatformEnvironmentVersion)
        .filter(PlatformEnvironmentVersion.tenant_id == portal.id)
        .one()
    )
    assert current.platform_version == "1.1.0"

    history = (
        db.query(PlatformVersionHistory)
        .filter(PlatformVersionHistory.tenant_id == portal.id)
        .order_by(PlatformVersionHistory.id.asc())
        .all()
    )
    assert len(history) == 3
    assert history[0].platform_version == "1.0.0"
    assert history[0].status == "active"
    assert history[1].platform_version == "1.0.0"
    assert history[1].status == "superseded"
    assert history[2].platform_version == "1.1.0"
    assert history[2].status == "active"


def test_version_registry_api_read_only(client: TestClient, db: Session) -> None:
    from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
    from app.modules.control_plane.platform_profile.models import PlatformSettings

    settings = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings is None or settings.platform_owner_user_id is None:
        pytest.skip("platform owner is not configured")

    owner = db.get(User, settings.platform_owner_user_id)
    if owner is None:
        pytest.skip("platform owner user is missing")

    headers = _auth_headers(owner)
    current_response = client.get("/platform/version-registry/current", headers=headers)
    assert current_response.status_code == 200
    assert isinstance(current_response.json(), list)

    summary_response = client.get("/platform/version-registry/summary", headers=headers)
    assert summary_response.status_code == 200
    payload = summary_response.json()
    assert isinstance(payload["current_versions"], list)
    assert isinstance(payload["history"], list)


def test_seed_platform_version_registry_is_idempotent(db: Session) -> None:
    first = seed_platform_version_registry(db, commit=True)
    second = seed_platform_version_registry(db, commit=True)
    assert first["created"] >= 0
    assert second["created"] == 0
