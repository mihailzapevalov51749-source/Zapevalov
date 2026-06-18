"""Tests for module configuration diff engine MVP."""

from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_modules.manifest_crud import get_active_manifest_for_module
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.platform_modules.version_seed import seed_platform_module_versions
from app.modules.platform_release.models import PlatformRelease
from app.modules.portals.models import Portal
from app.modules.tenant_module_configurations.backfill import backfill_tenant_module_configurations
from app.modules.tenant_module_configurations.models import TenantModuleConfiguration
from app.modules.tenant_module_configuration_diffs.constants import ConfigurationDiffRiskLevel
from app.modules.tenant_module_configuration_diffs.diff_generator import (
    build_target_configuration_from_schema,
    diff_flat_block,
    diff_permissions_block,
    diff_templates_block,
    generate_configuration_diff_payload,
)
from app.modules.tenant_module_configuration_diffs.generator import (
    generate_configuration_diff_for_offer,
)
from app.modules.tenant_module_configuration_diffs.models import TenantModuleConfigurationDiff
from app.modules.tenant_module_configuration_diffs.risk_analysis import compute_configuration_diff_risk_level
from app.modules.tenant_module_update_offers.generator import generate_offers_for_tenant
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews.constants import TenantModuleUpdatePreviewStatus
from app.modules.tenant_module_update_previews.generator import generate_preview_for_offer
from app.modules.tenant_module_update_previews.models import TenantModuleUpdatePreview
from app.modules.tenant_modules.backfill import backfill_tenant_modules_for_portal
from app.modules.tenant_modules.models import TenantModule
from app.modules.users.models import Role, User
from tests.support.test_versioning import unique_test_module_version


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
        email=f"module_config_diff_{role_name}_{_suffix()}@test.local",
        full_name=f"Module Config Diff Test {role_name}",
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


def _create_portal(db: Session) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"Module config diff {suffix}",
        code=f"module-config-diff-{suffix}",
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _seed_offer_scenario(db: Session, module_key: str = "runtime.calendar") -> tuple[Portal, TenantModuleUpdateOffer]:
    from app.modules.navigation.models import NavigationItem
    from app.modules.platform_modules.version_constants import PlatformModuleVersionStatus
    from app.modules.platform_modules.version_models import PlatformModuleVersion, PlatformReleaseModule

    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)
    seed_platform_module_versions(db, commit=False)

    portal = _create_portal(db)
    db.add(
        NavigationItem(
            portal_id=portal.id,
            type="page",
            title=f"Runtime {module_key}",
            menu_scope="runtime",
            system_key=module_key,
            is_visible=True,
        )
    )
    backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)
    backfill_tenant_module_configurations(db, tenant_ids=[portal.id], commit=False, bypass_module_config_write_policy=True)

    tenant_module = (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == portal.id, TenantModule.module_key == module_key)
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
        backfill_tenant_module_configurations(db, tenant_ids=[portal.id], commit=False, bypass_module_config_write_policy=True)
        tenant_module = (
            db.query(TenantModule)
            .filter(TenantModule.tenant_id == portal.id, TenantModule.module_key == module_key)
            .one()
        )
    tenant_module.installed_version = "1.0.0"

    latest_version = unique_test_module_version()
    release = PlatformRelease(
        version=f"test-release-{_suffix()}",
        title="Module config diff release",
        status="draft",
        source_tenant_id=portal.id,
    )
    db.add(release)
    db.flush()

    db.add(
        PlatformModuleVersion(
            module_key=module_key,
            version=latest_version,
            status=PlatformModuleVersionStatus.RELEASED,
            manifest_version=latest_version,
            release_id=release.id,
        )
    )
    db.add(
        PlatformReleaseModule(
            release_id=release.id,
            module_key=module_key,
            from_version="1.0.0",
            to_version=latest_version,
            change_summary="- Config defaults update",
        )
    )
    db.flush()

    generate_offers_for_tenant(db, portal.id, commit=False)
    offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(TenantModuleUpdateOffer.tenant_id == portal.id)
        .one()
    )
    return portal, offer


def _get_configuration(db: Session, portal: Portal, module_key: str = "runtime.calendar") -> TenantModuleConfiguration:
    return (
        db.query(TenantModuleConfiguration)
        .filter(
            TenantModuleConfiguration.tenant_id == portal.id,
            TenantModuleConfiguration.module_key == module_key,
        )
        .one()
    )


def _cleanup_test_data(db: Session, tenant_id: int) -> None:
    offer_ids = [
        row.id
        for row in db.query(TenantModuleUpdateOffer)
        .filter(TenantModuleUpdateOffer.tenant_id == tenant_id)
        .all()
    ]
    if offer_ids:
        db.query(TenantModuleConfigurationDiff).filter(
            TenantModuleConfigurationDiff.offer_id.in_(offer_ids)
        ).delete(synchronize_session=False)
        db.query(TenantModuleUpdatePreview).filter(
            TenantModuleUpdatePreview.offer_id.in_(offer_ids)
        ).delete(synchronize_session=False)
    db.query(TenantModuleUpdateOffer).filter(
        TenantModuleUpdateOffer.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModuleConfiguration).filter(
        TenantModuleConfiguration.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.flush()


def test_configuration_diff_table_exists(db: Session) -> None:
    inspector = inspect(db.get_bind())
    assert "tenant_module_configuration_diffs" in inspector.get_table_names()


def test_settings_diff_works() -> None:
    diff = diff_flat_block({"invite_policy": "creator_only"}, {"invite_policy": "notify_all"})
    assert diff["changed"][0]["key"] == "invite_policy"
    assert diff["added"] == []
    assert diff["removed"] == []


def test_permissions_diff_works() -> None:
    current = {"user": {"create_event": True}}
    target = {"user": {"create_event": True, "manage_recurring_events": True}}
    diff = diff_permissions_block(current, target)
    assert diff["added"] == ["manage_recurring_events"]


def test_views_diff_works() -> None:
    diff = diff_flat_block({"default_view": "day"}, {"default_view": "week"})
    assert diff["changed"][0]["key"] == "default_view"


def test_rules_diff_works() -> None:
    diff = diff_flat_block({"allow_overlap": False}, {"allow_overlap": True})
    assert diff["changed"][0]["key"] == "allow_overlap"


def test_templates_diff_works() -> None:
    current = {"seed_catalog": [{"seed_key": "calendar.meeting", "payload": {"a": 1}}]}
    target = {
        "seed_catalog": [
            {"seed_key": "calendar.meeting", "payload": {"a": 1}},
            {"seed_key": "calendar.weekly_review", "payload": {"a": 2}},
        ]
    }
    diff = diff_templates_block(current, target)
    assert diff["added_seeds"] == ["calendar.weekly_review"]


def test_risk_low_works() -> None:
    payload = {"settings": {"added": ["new_setting"]}, "templates": {"added_seeds": ["calendar.meeting"]}}
    assert compute_configuration_diff_risk_level(payload) == ConfigurationDiffRiskLevel.LOW


def test_risk_medium_works() -> None:
    payload = {"settings": {"changed": [{"key": "invite_policy", "from": "a", "to": "b"}]}}
    assert compute_configuration_diff_risk_level(payload) == ConfigurationDiffRiskLevel.MEDIUM


def test_risk_high_works() -> None:
    payload = {"permissions": {"changed": [{"key": "create_event", "from": {}, "to": {}}]}}
    assert compute_configuration_diff_risk_level(payload) == ConfigurationDiffRiskLevel.HIGH


def test_risk_critical_works() -> None:
    payload = {"permissions": {"removed": ["create_event"]}}
    assert compute_configuration_diff_risk_level(payload) == ConfigurationDiffRiskLevel.CRITICAL


def test_diff_generated_from_offer(db: Session) -> None:
    portal, offer = _seed_offer_scenario(db)
    configuration = _get_configuration(db, portal)
    configuration.settings = dict(configuration.settings or {})
    configuration.settings["invite_policy"] = "creator_only"

    db.query(TenantModuleConfigurationDiff).filter(
        TenantModuleConfigurationDiff.offer_id == offer.id
    ).delete(synchronize_session=False)
    db.flush()

    result = generate_configuration_diff_for_offer(db, offer, commit=False)
    assert result["status"] == "created"
    diff = result["diff"]
    assert diff is not None
    assert diff.offer_id == offer.id
    assert diff.diff_payload["settings"]["changed"]

    _cleanup_test_data(db, portal.id)
    db.commit()


def test_preview_uses_diff(db: Session) -> None:
    portal, offer = _seed_offer_scenario(db)
    configuration = _get_configuration(db, portal)
    configuration.settings = dict(configuration.settings or {})
    configuration.settings["invite_policy"] = "creator_only"
    flag_modified(configuration, "settings")
    db.flush()

    db.query(TenantModuleConfigurationDiff).filter(
        TenantModuleConfigurationDiff.offer_id == offer.id
    ).delete(synchronize_session=False)
    db.query(TenantModuleUpdatePreview).filter(
        TenantModuleUpdatePreview.offer_id == offer.id
    ).delete(synchronize_session=False)
    db.flush()

    generate_preview_for_offer(db, offer, commit=False)
    preview = (
        db.query(TenantModuleUpdatePreview)
        .filter(
            TenantModuleUpdatePreview.offer_id == offer.id,
            TenantModuleUpdatePreview.preview_status == TenantModuleUpdatePreviewStatus.GENERATED,
        )
        .one()
    )
    assert preview.affected_settings
    assert isinstance(preview.impact_analysis, dict)
    assert isinstance(preview.impact_analysis.get("configuration_diff"), dict)

    _cleanup_test_data(db, portal.id)
    db.commit()


def test_api_returns_diff(client: TestClient, db: Session) -> None:
    portal, offer = _seed_offer_scenario(db)
    configuration = _get_configuration(db, portal)
    configuration.settings = dict(configuration.settings or {})
    configuration.settings["invite_policy"] = "creator_only"
    db.flush()

    db.query(TenantModuleConfigurationDiff).filter(
        TenantModuleConfigurationDiff.offer_id == offer.id
    ).delete(synchronize_session=False)
    db.flush()

    generate_configuration_diff_for_offer(db, offer, commit=True)

    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.commit()

    response = client.get(
        f"/tenants/{portal.id}/module-update-offers/{offer.id}/configuration-diff",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["offer_id"] == offer.id
    assert payload["diff_payload"]["settings"]["changed"]

    _cleanup_test_data(db, portal.id)
    db.commit()


def test_configuration_diff_api_is_read_only(client: TestClient, db: Session) -> None:
    portal, offer = _seed_offer_scenario(db)
    generate_configuration_diff_for_offer(db, offer, commit=True)
    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.commit()
    headers = _auth_headers(admin)

    assert (
        client.post(
            f"/tenants/{portal.id}/module-update-offers/{offer.id}/configuration-diff",
            json={},
            headers=headers,
        ).status_code
        == 405
    )

    _cleanup_test_data(db, portal.id)
    db.commit()


def test_runtime_routing_contract_unchanged() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    portal_page_view = (
        repo_root / "frontend" / "src" / "portal" / "PortalPageView.jsx"
    ).read_text(encoding="utf-8")
    assert "CorporateChatPage" in portal_page_view
    assert "CorporateCalendarPage" in portal_page_view


def test_apply_still_absent(client: TestClient, db: Session) -> None:
    portal, offer = _seed_offer_scenario(db)
    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.commit()
    headers = _auth_headers(admin)
    assert client.post(f"/tenants/{portal.id}/modules/runtime.calendar/apply", headers=headers).status_code == 404
    _cleanup_test_data(db, portal.id)
    db.commit()


def test_rollback_still_absent(client: TestClient, db: Session) -> None:
    portal, offer = _seed_offer_scenario(db)
    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.commit()
    headers = _auth_headers(admin)
    assert client.post(f"/tenants/{portal.id}/modules/runtime.calendar/rollback", headers=headers).status_code == 404
    _cleanup_test_data(db, portal.id)
    db.commit()
