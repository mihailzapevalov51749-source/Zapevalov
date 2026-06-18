"""Tests for runtime configuration integration MVP."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.portals.models import Portal
from app.modules.tenant_module_configuration_applies.apply_service import apply_module_configuration_update
from app.modules.tenant_module_configuration_rollbacks.rollback_service import rollback_module_configuration
from app.modules.tenant_module_configurations.backfill import backfill_tenant_module_configurations
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.runtime.cache import (
    clear_runtime_module_configuration_cache,
    get_cached_runtime_configuration,
    invalidate_runtime_module_configuration_cache,
)
from app.modules.tenant_module_configurations.runtime.service import get_runtime_module_configuration
from app.modules.tenant_module_configurations.models import TenantModuleConfiguration
from app.modules.tenant_modules.models import TenantModule
from app.modules.users.models import Role, User
from tests.test_module_configuration_apply_mvp import (
    _auth_headers,
    _create_portal,
    _create_user,
    _seed_apply_scenario,
)


def _ensure_tenant_module_configuration(
    db: Session,
    *,
    portal: Portal,
    module_key: str,
) -> TenantModuleConfiguration:
    tenant_module = (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == portal.id, TenantModule.module_key == module_key)
        .one_or_none()
    )
    if tenant_module is None:
        tenant_module = TenantModule(
            tenant_id=portal.id,
            portal_id=portal.id,
            module_key=module_key,
            installed_version="1.0.0",
            enabled=True,
            source="test",
        )
        db.add(tenant_module)
        db.flush()

    backfill_tenant_module_configurations(
        db,
        tenant_ids=[portal.id],
        commit=False,
        bypass_module_config_write_policy=True,
    )

    configuration = get_configuration(
        db,
        tenant_id=portal.id,
        module_key=module_key,
    )
    if configuration is None:
        from app.modules.tenant_module_configurations.backfill import (
            backfill_configuration_for_tenant_module,
        )

        backfill_configuration_for_tenant_module(
            db,
            tenant_module=tenant_module,
            commit=False,
            bypass_module_config_write_policy=True,
        )
        db.flush()
        configuration = get_configuration(
            db,
            tenant_id=portal.id,
            module_key=module_key,
        )

    assert configuration is not None
    return configuration


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


@pytest.fixture(autouse=True)
def clear_runtime_cache():
    clear_runtime_module_configuration_cache()
    yield
    clear_runtime_module_configuration_cache()


def test_runtime_service_reads_tenant_configuration_and_caches(db: Session):
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    portal = _create_portal(db)
    _ensure_tenant_module_configuration(db, portal=portal, module_key="runtime.calendar")

    configuration = get_configuration(
        db,
        tenant_id=portal.id,
        module_key="runtime.calendar",
    )
    assert configuration is not None

    configuration.settings = {
        **dict(configuration.settings or {}),
        "default_view": "month",
        "enabled_event_types": ["meeting", "deadline"],
    }
    db.flush()

    first = get_runtime_module_configuration(
        db,
        tenant_id=portal.id,
        module_key="runtime.calendar",
    )
    assert first.cache_status == "miss"
    assert first.settings["default_view"] == "month"
    assert first.settings["enabled_event_types"] == ["meeting", "deadline"]

    cached = get_cached_runtime_configuration(portal.id, "runtime.calendar")
    assert cached is not None

    second = get_runtime_module_configuration(
        db,
        tenant_id=portal.id,
        module_key="runtime.calendar",
    )
    assert second.cache_status == "hit"
    assert second.settings["default_view"] == "month"


def test_apply_and_rollback_invalidate_runtime_cache(db: Session):
    portal, offer, admin = _seed_apply_scenario(db, module_key="runtime.calendar")

    configuration = get_configuration(
        db,
        tenant_id=portal.id,
        module_key="runtime.calendar",
    )
    assert configuration is not None
    configuration.settings = {
        **dict(configuration.settings or {}),
        "default_view": "week",
    }
    db.commit()

    warmed = get_runtime_module_configuration(
        db,
        tenant_id=portal.id,
        module_key="runtime.calendar",
    )
    assert warmed.settings["default_view"] == "week"
    assert get_cached_runtime_configuration(portal.id, "runtime.calendar") is not None

    apply_result = apply_module_configuration_update(
        db,
        tenant_id=portal.id,
        offer_id=int(offer.id),
        applied_by=admin,
    )
    assert apply_result["status"] == "completed"
    assert get_cached_runtime_configuration(portal.id, "runtime.calendar") is None

    refreshed = get_runtime_module_configuration(
        db,
        tenant_id=portal.id,
        module_key="runtime.calendar",
    )
    assert refreshed.cache_status == "miss"

    invalidate_runtime_module_configuration_cache(portal.id, "runtime.calendar")
    get_runtime_module_configuration(
        db,
        tenant_id=portal.id,
        module_key="runtime.calendar",
    )

    rollback_result = rollback_module_configuration(
        db,
        tenant_id=portal.id,
        apply_id=int(apply_result["apply_id"]),
        rolled_back_by=admin,
    )
    assert rollback_result["status"] == "completed"
    assert get_cached_runtime_configuration(portal.id, "runtime.calendar") is None


def test_calendar_rejects_disabled_event_type(db: Session, client: TestClient):
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    portal = _create_portal(db)
    user = _create_user(db, role_name="admin", tenant_id=portal.id)
    configuration = _ensure_tenant_module_configuration(
        db,
        portal=portal,
        module_key="runtime.calendar",
    )
    configuration.settings = {
        **dict(configuration.settings or {}),
        "enabled_event_types": ["meeting"],
    }
    db.commit()
    invalidate_runtime_module_configuration_cache(portal.id, "runtime.calendar")

    response = client.post(
        f"/tenants/{portal.id}/calendar/events",
        headers=_auth_headers(user),
        json={
            "title": "Test",
            "event_type": "deadline",
            "start_at": "2026-06-14T10:00:00",
            "end_at": "2026-06-14T11:00:00",
        },
    )
    assert response.status_code == 400


def test_runtime_configuration_api_endpoint(db: Session, client: TestClient):
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)

    portal = _create_portal(db)
    user = _create_user(db, role_name="admin", tenant_id=portal.id)
    configuration = _ensure_tenant_module_configuration(
        db,
        portal=portal,
        module_key="runtime.notifications",
    )
    configuration.settings = {
        **dict(configuration.settings or {}),
        "overlay_enabled": False,
        "bell_enabled": False,
        "enabled_categories": ["system"],
    }
    db.commit()
    invalidate_runtime_module_configuration_cache(portal.id, "runtime.notifications")

    response = client.get(
        f"/runtime/tenants/{portal.id}/modules/runtime.notifications/configuration",
        headers=_auth_headers(user),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["settings"]["overlay_enabled"] is False
    assert payload["settings"]["bell_enabled"] is False
    assert payload["settings"]["enabled_categories"] == ["system"]
