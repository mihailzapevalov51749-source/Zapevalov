"""Tests for tenant module configurations MVP."""

from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.portals.models import Portal
from app.modules.tenant_module_configurations.backfill import backfill_tenant_module_configurations
from app.modules.tenant_module_configurations.constants import MANIFEST_DEFAULTS_SOURCE
from app.modules.tenant_module_configurations.models import (
    TenantModuleConfigSnapshot,
    TenantModuleConfiguration,
)
from app.modules.tenant_module_configurations.validation import (
    validate_tenant_configuration_against_schema,
)
from app.modules.platform_modules.settings_schema import get_module_settings_schema
from app.modules.tenant_modules.backfill import backfill_tenant_modules
from app.modules.tenant_modules.models import TenantModule
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


def _create_user(db: Session, *, role_name: str, tenant_id: int | None = None) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"tenant_config_test_{role_name}_{_suffix()}@test.local",
        full_name=f"Tenant Config Test {role_name}",
        hashed_password="hash",
        is_active=True,
        role_id=role.id,
        tenant_id=tenant_id,
    )
    db.add(user)
    db.flush()
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def _cleanup_test_configuration(db: Session, tenant_id: int, module_key: str) -> None:
    if not str(module_key).startswith("test-"):
        return
    db.query(TenantModuleConfiguration).filter(
        TenantModuleConfiguration.tenant_id == tenant_id,
        TenantModuleConfiguration.module_key == module_key,
    ).delete(synchronize_session=False)
    db.query(TenantModule).filter(
        TenantModule.tenant_id == tenant_id,
        TenantModule.module_key == module_key,
    ).delete(synchronize_session=False)
    db.query(PlatformModule).filter(PlatformModule.module_key == module_key).delete(
        synchronize_session=False
    )
    db.flush()


def _prepare_registry(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)
    backfill_tenant_modules(db, commit=False, bypass_module_config_write_policy=True)


def test_tenant_module_configurations_table_exists(db: Session) -> None:
    inspector = inspect(db.get_bind())
    assert "tenant_module_configurations" in inspector.get_table_names()


def test_tenant_module_config_snapshots_table_exists(db: Session) -> None:
    inspector = inspect(db.get_bind())
    assert "tenant_module_config_snapshots" in inspector.get_table_names()


def test_unique_tenant_module_configuration(db: Session) -> None:
    portal = db.query(Portal).order_by(Portal.id.asc()).first()
    assert portal is not None

    module_key = "test-config-unique"
    _cleanup_test_configuration(db, portal.id, module_key)

    db.add(
        PlatformModule(
            module_key=module_key,
            title="Test Config Module",
            module_type="runtime",
            status="active",
            version="1.0.0",
            is_runtime=True,
            is_tenant_installable=True,
            is_enabled_by_default=False,
            is_core=False,
        )
    )
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
        TenantModuleConfiguration(
            tenant_id=portal.id,
            module_key=module_key,
            module_version="1.0.0",
            config_version="1.0.0",
            schema_version="1.0.0",
            settings={"enabled": True},
            permissions={},
            views={},
            rules={},
            templates={},
            source="test",
        )
    )
    db.flush()

    db.add(
        TenantModuleConfiguration(
            tenant_id=portal.id,
            module_key=module_key,
            module_version="1.0.0",
            config_version="1.0.0",
            schema_version="1.0.0",
            settings={},
            permissions={},
            views={},
            rules={},
            templates={},
            source="test",
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()

    db.rollback()
    _cleanup_test_configuration(db, portal.id, module_key)
    db.commit()


@pytest.mark.parametrize("module_key", ["runtime.chat", "runtime.calendar", "runtime.notifications"])
def test_backfill_creates_config_for_active_modules(db: Session, module_key: str) -> None:
    _prepare_registry(db)
    portal = db.query(Portal).order_by(Portal.id.asc()).first()
    assert portal is not None

    db.query(TenantModuleConfiguration).filter(
        TenantModuleConfiguration.tenant_id == portal.id,
        TenantModuleConfiguration.module_key == module_key,
    ).delete(synchronize_session=False)

    tenant_module = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.module_key == module_key,
        )
        .one_or_none()
    )
    if tenant_module is None:
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
        tenant_module = (
            db.query(TenantModule)
            .filter(
                TenantModule.tenant_id == portal.id,
                TenantModule.module_key == module_key,
            )
            .one()
        )

    result = backfill_tenant_module_configurations(db, tenant_ids=[portal.id], commit=False, bypass_module_config_write_policy=True)
    assert int(result["created"]) >= 1

    row = (
        db.query(TenantModuleConfiguration)
        .filter(
            TenantModuleConfiguration.tenant_id == portal.id,
            TenantModuleConfiguration.module_key == module_key,
        )
        .one_or_none()
    )
    assert row is not None
    assert row.source == MANIFEST_DEFAULTS_SOURCE
    assert row.settings
    assert row.permissions
    assert row.views
    assert row.rules
    assert isinstance(row.templates, dict)


def test_backfill_skips_modules_with_empty_schema(db: Session) -> None:
    _prepare_registry(db)
    portal = db.query(Portal).order_by(Portal.id.asc()).first()
    assert portal is not None

    from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module

    manifest = get_active_manifest_for_module(db, "runtime.chat")
    assert manifest is not None

    db.query(TenantModuleConfiguration).filter(
        TenantModuleConfiguration.tenant_id == portal.id,
        TenantModuleConfiguration.module_key == "runtime.chat",
    ).delete(synchronize_session=False)

    original_schema = dict(manifest.settings_schema or {})
    manifest.settings_schema = {}
    db.flush()

    result = backfill_tenant_module_configurations(db, tenant_ids=[portal.id], commit=False, bypass_module_config_write_policy=True)
    skipped_reasons = result["skipped_reasons"]
    assert isinstance(skipped_reasons, list)
    assert any("runtime.chat" in entry and "empty_schema" in entry for entry in skipped_reasons)

    row = (
        db.query(TenantModuleConfiguration)
        .filter(
            TenantModuleConfiguration.tenant_id == portal.id,
            TenantModuleConfiguration.module_key == "runtime.chat",
        )
        .one_or_none()
    )
    assert row is None

    manifest.settings_schema = original_schema
    db.rollback()


def test_config_blocks_populated_from_manifest_defaults(db: Session) -> None:
    schema = get_module_settings_schema("runtime.calendar")
    assert schema is not None
    settings_defaults = schema["blocks"]["settings"]["defaults"]
    permissions_defaults = schema["blocks"]["permissions"]["defaults"]

    validate_tenant_configuration_against_schema(
        schema,
        settings=settings_defaults,
        permissions=permissions_defaults,
        views=schema["blocks"]["views"]["defaults"],
        rules=schema["blocks"]["rules"]["defaults"],
        templates=schema["blocks"]["templates"]["defaults"],
    )


def test_get_all_configurations_api(client: TestClient, db: Session) -> None:
    _prepare_registry(db)
    backfill_tenant_module_configurations(db, commit=True, bypass_module_config_write_policy=True)

    portal = db.query(Portal).order_by(Portal.id.asc()).first()
    assert portal is not None

    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.commit()

    response = client.get(
        f"/tenants/{portal.id}/module-configurations",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert any(item["module_key"] == "runtime.calendar" for item in payload)


def test_get_module_configuration_api(client: TestClient, db: Session) -> None:
    _prepare_registry(db)
    backfill_tenant_module_configurations(db, commit=True, bypass_module_config_write_policy=True)

    portal = db.query(Portal).order_by(Portal.id.asc()).first()
    assert portal is not None

    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.commit()

    response = client.get(
        f"/tenants/{portal.id}/modules/runtime.chat/configuration",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["module_key"] == "runtime.chat"
    assert payload["settings"]
    assert payload["permissions"]


def test_get_snapshots_api(client: TestClient, db: Session) -> None:
    _prepare_registry(db)
    backfill_tenant_module_configurations(db, commit=True, bypass_module_config_write_policy=True)

    portal = db.query(Portal).order_by(Portal.id.asc()).first()
    assert portal is not None

    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.commit()

    response = client.get(
        f"/tenants/{portal.id}/modules/runtime.notifications/configuration/snapshots",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    assert response.json() == []


def test_configuration_api_is_read_only(client: TestClient, db: Session) -> None:
    _prepare_registry(db)
    backfill_tenant_module_configurations(db, commit=True, bypass_module_config_write_policy=True)

    portal = db.query(Portal).order_by(Portal.id.asc()).first()
    assert portal is not None

    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.commit()
    headers = _auth_headers(admin)

    assert client.post(f"/tenants/{portal.id}/module-configurations", json={}, headers=headers).status_code == 405
    assert (
        client.patch(
            f"/tenants/{portal.id}/modules/runtime.chat/configuration",
            json={},
            headers=headers,
        ).status_code
        == 405
    )
    assert (
        client.delete(
            f"/tenants/{portal.id}/modules/runtime.chat/configuration",
            headers=headers,
        ).status_code
        == 405
    )


def test_platform_configurations_overview_api(client: TestClient, db: Session) -> None:
    _prepare_registry(db)
    backfill_tenant_module_configurations(db, commit=True, bypass_module_config_write_policy=True)

    platform_admin = _create_user(db, role_name="admin", tenant_id=None)
    db.commit()

    response = client.get(
        "/platform/tenant-module-configurations",
        headers=_auth_headers(platform_admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) >= 1


def test_runtime_routing_contract_unchanged() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    portal_page_view = (
        repo_root / "frontend" / "src" / "portal" / "PortalPageView.jsx"
    ).read_text(encoding="utf-8")

    assert "CorporateChatPage" in portal_page_view
    assert "CorporateCalendarPage" in portal_page_view


def test_apply_rollback_endpoints_absent(client: TestClient, db: Session) -> None:
    portal = db.query(Portal).order_by(Portal.id.asc()).first()
    assert portal is not None
    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.commit()
    headers = _auth_headers(admin)

    assert client.post(f"/tenants/{portal.id}/modules/runtime.chat/apply", headers=headers).status_code == 404
    assert client.post(f"/tenants/{portal.id}/modules/runtime.chat/rollback", headers=headers).status_code == 404
