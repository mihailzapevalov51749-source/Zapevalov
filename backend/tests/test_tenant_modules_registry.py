"""Tenant modules registry MVP tests."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.navigation.models import NavigationItem
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_modules.backfill import (
    backfill_tenant_modules_for_portal,
    detect_installed_runtime_module_keys,
)
from app.modules.tenant_modules.constants import (
    BACKFILL_SOURCE,
    PLANNED_RUNTIME_MODULE_KEYS,
    RUNTIME_MODULE_KEYS_FOR_BACKFILL,
)
from app.modules.tenant_modules.models import TenantModule
from app.modules.tenant_users.models import TenantUserMembership
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


def _create_user(
    db: Session,
    *,
    role_name: str,
    tenant_id: int | None = None,
) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"tenant_modules_{role_name}_{_suffix()}@test.local",
        full_name=f"Tenant Modules Test {role_name}",
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


def _create_portal(db: Session) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"Tenant modules {suffix}",
        code=f"tenant-modules-{suffix}",
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _add_runtime_nav(db: Session, *, portal_id: int, system_key: str) -> NavigationItem:
    nav = NavigationItem(
        portal_id=portal_id,
        type="page",
        title=f"Runtime {system_key}",
        menu_scope="runtime",
        system_key=system_key,
        is_visible=True,
    )
    db.add(nav)
    db.flush()
    return nav


def _cleanup_test_tenant_modules(db: Session, tenant_id: int) -> None:
    db.query(TenantModule).filter(TenantModule.tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    db.flush()


def test_tenant_modules_table_exists(db: Session) -> None:
    inspector = inspect(db.get_bind())
    assert "tenant_modules" in inspector.get_table_names()


def test_tenant_modules_fk_to_platform_modules(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)

    db.add(
        TenantModule(
            tenant_id=portal.id,
            portal_id=portal.id,
            module_key="test-invalid-fk-" + _suffix(),
            installed_version="1.0.0",
            enabled=True,
            source="test",
        )
    )

    with pytest.raises(IntegrityError):
        db.flush()

    db.rollback()


def test_tenant_modules_unique_tenant_module_key(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    module_key = "runtime.chat"

    db.add(
        TenantModule(
            tenant_id=portal.id,
            portal_id=portal.id,
            module_key=module_key,
            installed_version="1.0.0",
            enabled=True,
            source="test",
        )
    )
    db.flush()

    db.add(
        TenantModule(
            tenant_id=portal.id,
            portal_id=portal.id,
            module_key=module_key,
            installed_version="1.0.0",
            enabled=True,
            source="test",
        )
    )

    with pytest.raises(IntegrityError):
        db.flush()

    db.rollback()
    _cleanup_test_tenant_modules(db, portal.id)


def test_runtime_chat_backfill(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    _add_runtime_nav(db, portal_id=portal.id, system_key="runtime.chat")

    result = backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)
    assert result["created"] == 1

    row = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.module_key == "runtime.chat",
        )
        .one()
    )
    assert row.enabled is True
    assert row.source == BACKFILL_SOURCE
    assert row.installed_version == "1.0.0"

    _cleanup_test_tenant_modules(db, portal.id)


def test_runtime_calendar_backfill(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    _add_runtime_nav(db, portal_id=portal.id, system_key="runtime.calendar")

    result = backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)
    assert result["created"] == 1

    row = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.module_key == "runtime.calendar",
        )
        .one()
    )
    assert row.enabled is True
    assert row.source == BACKFILL_SOURCE

    _cleanup_test_tenant_modules(db, portal.id)


def test_runtime_notifications_backfill(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    _add_runtime_nav(db, portal_id=portal.id, system_key="runtime.notifications")

    result = backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)
    assert result["created"] == 1

    row = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.module_key == "runtime.notifications",
        )
        .one()
    )
    assert row.enabled is True
    assert row.source == BACKFILL_SOURCE

    _cleanup_test_tenant_modules(db, portal.id)


def test_planned_modules_not_installed_without_navigation(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    _add_runtime_nav(db, portal_id=portal.id, system_key="runtime.chat")

    backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)

    installed_keys = {
        row.module_key
        for row in db.query(TenantModule.module_key)
        .filter(TenantModule.tenant_id == portal.id)
        .all()
    }

    assert "runtime.chat" in installed_keys
    for planned_key in PLANNED_RUNTIME_MODULE_KEYS:
        assert planned_key not in installed_keys

    detected = detect_installed_runtime_module_keys(db, portal.id)
    assert detected == {"runtime.chat"}

    _cleanup_test_tenant_modules(db, portal.id)


def test_get_tenant_modules_list(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    _add_runtime_nav(db, portal_id=portal.id, system_key="runtime.chat")
    backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)

    tenant_admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.add(
        TenantUserMembership(
            tenant_id=portal.id,
            user_id=tenant_admin.id,
            role_key="admin",
            is_active=True,
        )
    )
    db.commit()

    response = client.get(
        f"/tenants/{portal.id}/modules",
        headers=_auth_headers(tenant_admin),
    )
    assert response.status_code == 200

    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 1
    assert payload[0]["module_key"] == "runtime.chat"
    assert payload[0]["title"] == "Чат"
    assert payload[0]["enabled"] is True
    assert payload[0]["state"] == "installed"
    assert "platform_version" in payload[0]

    _cleanup_test_tenant_modules(db, portal.id)
    db.commit()


def test_get_single_tenant_module(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    _add_runtime_nav(db, portal_id=portal.id, system_key="runtime.calendar")
    backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)

    platform_admin = _create_user(db, role_name="admin", tenant_id=None)
    db.commit()

    response = client.get(
        f"/tenants/{portal.id}/modules/runtime.calendar",
        headers=_auth_headers(platform_admin),
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["module_key"] == "runtime.calendar"
    assert payload["tenant_id"] == portal.id
    assert payload["portal_id"] == portal.id
    assert payload["installed_version"]
    assert payload["platform_version"]

    _cleanup_test_tenant_modules(db, portal.id)
    db.commit()


def test_tenant_modules_api_is_read_only(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    _add_runtime_nav(db, portal_id=portal.id, system_key="runtime.chat")
    backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)

    admin = _create_user(db, role_name="admin", tenant_id=None)
    db.commit()

    headers = _auth_headers(admin)
    base = f"/tenants/{portal.id}/modules"

    assert client.post(base, headers=headers, json={}).status_code == 405
    assert client.put(f"{base}/runtime.chat", headers=headers, json={}).status_code == 405
    assert client.patch(f"{base}/runtime.chat", headers=headers, json={}).status_code == 405
    assert client.delete(f"{base}/runtime.chat", headers=headers).status_code == 405

    _cleanup_test_tenant_modules(db, portal.id)
    db.commit()


def test_existing_platform_routing_unchanged(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    admin = _create_user(db, role_name="admin")
    db.commit()

    modules_response = client.get("/platform/modules", headers=_auth_headers(admin))
    manifests_response = client.get(
        "/platform/module-manifests",
        headers=_auth_headers(admin),
    )

    assert modules_response.status_code == 200
    assert manifests_response.status_code == 200


def test_existing_navigation_seed_unchanged(db: Session) -> None:
    before_count = db.query(NavigationItem).count()
    seed_platform_modules(db, commit=False)
    after_count = db.query(NavigationItem).count()
    assert before_count == after_count


def test_platform_module_manifest_link_available_for_tenant_module(
    db: Session,
) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    _add_runtime_nav(db, portal_id=portal.id, system_key="runtime.notifications")
    backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)

    tenant_module = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.module_key == "runtime.notifications",
        )
        .one()
    )
    platform_module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == tenant_module.module_key)
        .one()
    )

    assert platform_module.module_key == "runtime.notifications"
    assert tenant_module.module_key in RUNTIME_MODULE_KEYS_FOR_BACKFILL

    _cleanup_test_tenant_modules(db, portal.id)
