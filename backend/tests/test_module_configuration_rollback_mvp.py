"""Tests for module configuration rollback MVP."""

from __future__ import annotations

import uuid
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.platform_modules.version_constants import PlatformModuleVersionStatus
from app.modules.platform_modules.version_models import PlatformModuleVersion, PlatformReleaseModule
from app.modules.platform_modules.version_seed import seed_platform_module_versions
from app.modules.platform_release.models import PlatformRelease
from app.modules.portals.models import Portal
from app.modules.tenant_module_configuration_applies.apply_service import apply_module_configuration_update
from app.modules.tenant_module_configuration_applies.constants import TenantModuleConfigurationApplyStatus
from app.modules.tenant_module_configuration_applies.models import TenantModuleConfigurationApply
from app.modules.tenant_module_configuration_diffs.generator import generate_configuration_diff_for_offer
from app.modules.tenant_module_configuration_rollbacks.exceptions import RollbackPreconditionError
from app.modules.tenant_module_configuration_rollbacks.models import TenantModuleConfigurationRollback
from app.modules.tenant_module_configuration_rollbacks.rollback_service import (
    rollback_module_configuration,
    validate_rollback_preconditions,
)
from app.modules.tenant_module_configurations.backfill import backfill_tenant_module_configurations
from app.modules.tenant_module_configurations.models import TenantModuleConfigSnapshot, TenantModuleConfiguration
from app.modules.tenant_module_update_offers.constants import TenantModuleUpdateOfferStatus
from app.modules.tenant_module_update_offers.generator import generate_offers_for_tenant
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews.constants import TenantModuleUpdatePreviewStatus
from app.modules.tenant_module_update_previews.generator import generate_preview_for_offer
from app.modules.tenant_module_update_previews.models import TenantModuleUpdatePreview
from app.modules.tenant_modules.backfill import backfill_tenant_modules_for_portal
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
        email=f"module_config_rollback_{role_name}_{_suffix()}@test.local",
        full_name=f"Module Config Rollback Test {role_name}",
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
        name=f"Module config rollback {suffix}",
        code=f"module-config-rollback-{suffix}",
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _seed_completed_apply(
    db: Session,
    module_key: str = "runtime.calendar",
) -> tuple[Portal, TenantModuleUpdateOffer, TenantModuleConfigurationApply, User, dict]:
    from app.modules.navigation.models import NavigationItem

    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)
    seed_platform_module_versions(db, commit=False)

    portal = _create_portal(db)
    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
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

    configuration = (
        db.query(TenantModuleConfiguration)
        .filter(
            TenantModuleConfiguration.tenant_id == portal.id,
            TenantModuleConfiguration.module_key == module_key,
        )
        .one()
    )
    configuration.settings = dict(configuration.settings or {})
    configuration.settings["default_view"] = "day"
    original_settings = dict(configuration.settings)

    tenant_module = (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == portal.id, TenantModule.module_key == module_key)
        .one()
    )
    tenant_module.installed_version = "1.0.0"

    latest_version = f"9.{_suffix()}.{_suffix()}"
    release = PlatformRelease(
        version=f"test-release-{_suffix()}",
        title="Module config rollback release",
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
    generate_preview_for_offer(db, offer, commit=False)
    generate_configuration_diff_for_offer(db, offer, commit=False)

    apply_result = apply_module_configuration_update(
        db,
        tenant_id=portal.id,
        offer_id=offer.id,
        applied_by=admin,
    )
    apply_row = db.query(TenantModuleConfigurationApply).filter_by(id=apply_result["apply_id"]).one()

    return portal, offer, apply_row, admin, {
        "original_settings": original_settings,
        "target_version": latest_version,
        "module_key": module_key,
    }


def _cleanup_test_data(db: Session, tenant_id: int) -> None:
    db.query(PlatformEventJournalEntry).filter(
        PlatformEventJournalEntry.tenant_id == tenant_id,
        PlatformEventJournalEntry.event_type.in_(
            ("module_configuration_applied", "module_configuration_rolled_back")
        ),
    ).delete(synchronize_session=False)
    db.query(TenantModuleConfigurationRollback).filter(
        TenantModuleConfigurationRollback.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModuleConfigurationApply).filter(
        TenantModuleConfigurationApply.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModuleConfigSnapshot).filter(
        TenantModuleConfigSnapshot.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    offer_ids = [
        row.id
        for row in db.query(TenantModuleUpdateOffer)
        .filter(TenantModuleUpdateOffer.tenant_id == tenant_id)
        .all()
    ]
    if offer_ids:
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


def test_rollback_table_created(db: Session) -> None:
    inspector = inspect(db.get_bind())
    assert "tenant_module_configuration_rollbacks" in inspector.get_table_names()


def test_rollback_requires_completed_apply(db: Session) -> None:
    portal, offer, apply_row, _admin, _ctx = _seed_completed_apply(db)
    apply_row.status = TenantModuleConfigurationApplyStatus.ROLLED_BACK
    db.flush()
    with pytest.raises(RollbackPreconditionError) as exc:
        validate_rollback_preconditions(db, tenant_id=portal.id, apply_id=apply_row.id)
    assert exc.value.reason == "apply_already_rolled_back"
    _cleanup_test_data(db, portal.id)
    db.commit()


def test_rollback_requires_snapshot(db: Session) -> None:
    portal, _offer, apply_row, _admin, _ctx = _seed_completed_apply(db)
    db.query(TenantModuleConfigSnapshot).filter(
        TenantModuleConfigSnapshot.tenant_id == portal.id
    ).delete(synchronize_session=False)
    db.flush()
    with pytest.raises(RollbackPreconditionError) as exc:
        validate_rollback_preconditions(db, tenant_id=portal.id, apply_id=apply_row.id)
    assert exc.value.reason == "snapshot_missing"
    _cleanup_test_data(db, portal.id)
    db.commit()


def test_rollback_restores_configuration_and_versions(db: Session) -> None:
    portal, offer, apply_row, admin, ctx = _seed_completed_apply(db)

    result = rollback_module_configuration(
        db,
        tenant_id=portal.id,
        apply_id=apply_row.id,
        rolled_back_by=admin,
    )
    assert result["status"] == "completed"

    db.expire_all()
    configuration = (
        db.query(TenantModuleConfiguration)
        .filter(
            TenantModuleConfiguration.tenant_id == portal.id,
            TenantModuleConfiguration.module_key == ctx["module_key"],
        )
        .one()
    )
    assert configuration.settings == ctx["original_settings"]
    assert configuration.module_version == offer.from_version
    assert configuration.config_version == configuration.schema_version

    tenant_module = (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == portal.id, TenantModule.module_key == ctx["module_key"])
        .one()
    )
    assert tenant_module.installed_version == offer.from_version

    apply_row = db.query(TenantModuleConfigurationApply).filter_by(id=apply_row.id).one()
    assert apply_row.status == TenantModuleConfigurationApplyStatus.ROLLED_BACK
    assert apply_row.rollback_id == result["rollback_id"]

    offer = db.query(TenantModuleUpdateOffer).filter_by(id=offer.id).one()
    assert offer.status == TenantModuleUpdateOfferStatus.AVAILABLE

    preview = (
        db.query(TenantModuleUpdatePreview)
        .filter(TenantModuleUpdatePreview.offer_id == offer.id)
        .order_by(TenantModuleUpdatePreview.id.desc())
        .first()
    )
    assert preview.preview_status == TenantModuleUpdatePreviewStatus.GENERATED

    journal = (
        db.query(PlatformEventJournalEntry)
        .filter(
            PlatformEventJournalEntry.tenant_id == portal.id,
            PlatformEventJournalEntry.event_type == "module_configuration_rolled_back",
        )
        .one()
    )
    assert journal.metadata_json["rollback_id"] == result["rollback_id"]

    _cleanup_test_data(db, portal.id)
    db.commit()


def test_rollback_history_endpoint(client: TestClient, db: Session) -> None:
    portal, _offer, apply_row, admin, _ctx = _seed_completed_apply(db)
    rollback_module_configuration(db, tenant_id=portal.id, apply_id=apply_row.id, rolled_back_by=admin)

    response = client.get(
        f"/tenants/{portal.id}/module-rollbacks",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) >= 1
    assert payload[0]["status"] == "completed"

    detail = client.get(
        f"/tenants/{portal.id}/module-rollbacks/{payload[0]['id']}",
        headers=_auth_headers(admin),
    )
    assert detail.status_code == 200

    _cleanup_test_data(db, portal.id)
    db.commit()


def test_rollback_api_endpoint(client: TestClient, db: Session) -> None:
    portal, _offer, apply_row, admin, _ctx = _seed_completed_apply(db)
    db.commit()

    response = client.post(
        f"/tenants/{portal.id}/module-applies/{apply_row.id}/rollback",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "completed"
    assert payload["rollback_id"] > 0

    _cleanup_test_data(db, portal.id)
    db.commit()


def test_double_rollback_forbidden(db: Session) -> None:
    portal, _offer, apply_row, admin, _ctx = _seed_completed_apply(db)
    rollback_module_configuration(db, tenant_id=portal.id, apply_id=apply_row.id, rolled_back_by=admin)
    with pytest.raises(RollbackPreconditionError) as exc:
        rollback_module_configuration(db, tenant_id=portal.id, apply_id=apply_row.id, rolled_back_by=admin)
    assert exc.value.reason == "apply_already_rolled_back"
    _cleanup_test_data(db, portal.id)
    db.commit()


def test_rollback_transaction_rollback_on_error(db: Session) -> None:
    portal, offer, apply_row, admin, ctx = _seed_completed_apply(db)
    db.commit()
    apply_id = int(apply_row.id)

    configuration = (
        db.query(TenantModuleConfiguration)
        .filter(
            TenantModuleConfiguration.tenant_id == portal.id,
            TenantModuleConfiguration.module_key == ctx["module_key"],
        )
        .one()
    )
    post_apply_version = str(configuration.module_version)

    with patch(
        "app.modules.tenant_module_configuration_rollbacks.rollback_service.record_tenant_event",
        side_effect=RuntimeError("journal failed"),
    ):
        with pytest.raises(RuntimeError):
            rollback_module_configuration(
                db,
                tenant_id=portal.id,
                apply_id=apply_id,
                rolled_back_by=admin,
            )
        db.rollback()

    assert (
        db.query(TenantModuleConfigurationRollback)
        .filter(TenantModuleConfigurationRollback.tenant_id == portal.id)
        .count()
        == 0
    )

    db.expire_all()
    configuration = (
        db.query(TenantModuleConfiguration)
        .filter(
            TenantModuleConfiguration.tenant_id == portal.id,
            TenantModuleConfiguration.module_key == ctx["module_key"],
        )
        .one()
    )
    assert configuration.module_version == post_apply_version

    apply_row = db.query(TenantModuleConfigurationApply).filter_by(id=apply_id).one()
    assert apply_row.status == TenantModuleConfigurationApplyStatus.COMPLETED

    offer = db.query(TenantModuleUpdateOffer).filter_by(id=offer.id).one()
    assert offer.status == TenantModuleUpdateOfferStatus.APPLIED

    _cleanup_test_data(db, portal.id)
    db.commit()


def test_runtime_routing_contract_unchanged() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    portal_page_view = (
        repo_root / "frontend" / "src" / "portal" / "PortalPageView.jsx"
    ).read_text(encoding="utf-8")
    assert "CorporateChatPage" in portal_page_view
    assert "CorporateCalendarPage" in portal_page_view


def test_code_rollback_absent(client: TestClient, db: Session) -> None:
    portal, _offer, apply_row, admin, _ctx = _seed_completed_apply(db)
    db.commit()
    headers = _auth_headers(admin)
    assert client.post(
        f"/tenants/{portal.id}/modules/runtime.calendar/code-rollback",
        headers=headers,
    ).status_code == 404

    _cleanup_test_data(db, portal.id)
    db.commit()
