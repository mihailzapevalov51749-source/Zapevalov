"""Tenant module update previews registry MVP tests."""

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
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.platform_modules.version_constants import PlatformModuleVersionStatus
from app.modules.platform_modules.version_models import PlatformModuleVersion, PlatformReleaseModule
from app.modules.platform_modules.version_seed import seed_platform_module_versions
from app.modules.platform_release.models import PlatformRelease
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_module_update_offers.constants import TenantModuleUpdateOfferStatus
from app.modules.tenant_module_update_offers.generator import (
    generate_offer_for_tenant_module,
    generate_offers_for_tenant,
)
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews.constants import (
    TenantModuleUpdatePreviewRiskLevel,
    TenantModuleUpdatePreviewStatus,
)
from app.modules.tenant_module_update_previews.generator import (
    build_preview_payload_from_offer,
    generate_preview_for_offer,
)
from app.modules.tenant_module_update_previews.models import TenantModuleUpdatePreview
from app.modules.tenant_modules.backfill import backfill_tenant_modules_for_portal
from app.modules.tenant_modules.models import TenantModule
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import Role, User
from tests.support.portal_test_commit import commit_portal_test_session
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


def _create_user(
    db: Session,
    *,
    role_name: str,
    tenant_id: int | None = None,
) -> User:
    role = _ensure_role(db, role_name)
    user = User(
        email=f"module_previews_{role_name}_{_suffix()}@test.local",
        full_name=f"Module Previews Test {role_name}",
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
        name=f"Module previews {suffix}",
        code=f"module-previews-{suffix}",
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _commit_test(
    db: Session,
    *,
    portal: Portal | None = None,
    release: PlatformRelease | None = None,
    user: User | None = None,
) -> None:
    commit_portal_test_session(
        db,
        portal_id=int(portal.id) if portal is not None else None,
        release_id=int(release.id) if release is not None else None,
        user_id=int(user.id) if user is not None else None,
    )


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


def _ensure_module_version(
    db: Session,
    *,
    module_key: str,
    version: str,
    release_id: int | None = None,
) -> PlatformModuleVersion:
    existing = (
        db.query(PlatformModuleVersion)
        .filter(
            PlatformModuleVersion.module_key == module_key,
            PlatformModuleVersion.version == version,
        )
        .one_or_none()
    )
    if existing is not None:
        return existing

    row = PlatformModuleVersion(
        module_key=module_key,
        version=version,
        status=PlatformModuleVersionStatus.RELEASED,
        manifest_version=version,
        release_id=release_id,
    )
    db.add(row)
    db.flush()
    return row


def _cleanup_test_data(db: Session, tenant_id: int) -> None:
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
    db.flush()


def _seed_upgrade_scenario(
    db: Session,
    *,
    module_key: str = "runtime.calendar",
    installed_version: str = "1.0.0",
    latest_version: str | None = None,
) -> tuple[Portal, PlatformRelease]:
    resolved_latest = latest_version or unique_test_module_version(major=1)

    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)
    seed_platform_module_versions(db, commit=False)

    portal = _create_portal(db)
    _add_runtime_nav(db, portal_id=portal.id, system_key=module_key)
    backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)

    tenant_module = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.module_key == module_key,
        )
        .one()
    )
    tenant_module.installed_version = installed_version

    release = PlatformRelease(
        version=f"test-release-{_suffix()}",
        title="Calendar module upgrade",
        status="draft",
        source_tenant_id=portal.id,
    )
    db.add(release)
    db.flush()

    _ensure_module_version(
        db,
        module_key=module_key,
        version=resolved_latest,
        release_id=release.id,
    )

    db.add(
        PlatformReleaseModule(
            release_id=release.id,
            module_key=module_key,
            from_version=installed_version,
            to_version=resolved_latest,
            change_summary="- Drag & Drop событий\n- Sticky Headers\n- Контекстное меню",
        )
    )
    db.flush()
    return portal, release


def _create_offer_with_preview(db: Session, portal: Portal) -> TenantModuleUpdateOffer:
    generate_offers_for_tenant(db, portal.id, commit=False)
    offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(TenantModuleUpdateOffer.tenant_id == portal.id)
        .one()
    )
    preview = (
        db.query(TenantModuleUpdatePreview)
        .filter(
            TenantModuleUpdatePreview.offer_id == offer.id,
            TenantModuleUpdatePreview.preview_status == TenantModuleUpdatePreviewStatus.GENERATED,
        )
        .one()
    )
    assert preview is not None
    return offer


def test_tenant_module_update_previews_table_exists(db: Session) -> None:
    inspector = inspect(db.get_bind())
    assert "tenant_module_update_previews" in inspector.get_table_names()


def test_preview_fk_offer_works(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    portal = _create_portal(db)
    db.add(
        TenantModuleUpdatePreview(
            tenant_id=portal.id,
            offer_id=999999999,
            module_key="runtime.chat",
            from_version="1.0.0",
            to_version="1.1.0",
            preview_status=TenantModuleUpdatePreviewStatus.GENERATED,
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_preview_fk_module_key_works(db: Session) -> None:
    portal, _release = _seed_upgrade_scenario(db)
    generate_offers_for_tenant(db, portal.id, commit=False)
    offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(TenantModuleUpdateOffer.tenant_id == portal.id)
        .one()
    )

    db.add(
        TenantModuleUpdatePreview(
            tenant_id=portal.id,
            offer_id=offer.id,
            module_key=f"test-invalid-module-{_suffix()}",
            from_version="1.0.0",
            to_version="1.1.0",
            preview_status=TenantModuleUpdatePreviewStatus.GENERATED,
        )
    )
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()
    _cleanup_test_data(db, portal.id)


def test_preview_generated_from_offer(db: Session) -> None:
    portal, _release = _seed_upgrade_scenario(db)
    offer = _create_offer_with_preview(db, portal)

    preview = (
        db.query(TenantModuleUpdatePreview)
        .filter(
            TenantModuleUpdatePreview.offer_id == offer.id,
            TenantModuleUpdatePreview.preview_status == TenantModuleUpdatePreviewStatus.GENERATED,
        )
        .one()
    )
    assert preview.from_version == offer.from_version
    assert preview.to_version == offer.to_version
    assert preview.release_id == offer.release_id
    assert preview.risk_level == TenantModuleUpdatePreviewRiskLevel.LOW

    _cleanup_test_data(db, portal.id)


def test_preview_includes_manifest_data(db: Session) -> None:
    portal, _release = _seed_upgrade_scenario(db)
    offer = _create_offer_with_preview(db, portal)

    preview = (
        db.query(TenantModuleUpdatePreview)
        .filter(TenantModuleUpdatePreview.offer_id == offer.id)
        .one()
    )
    assert "CorporateCalendarPage" in preview.affected_components
    assert "runtime.calendar" in preview.affected_routes
    assert "calendar_events" in preview.affected_tables
    assert "runtime.notifications" in preview.affected_dependencies
    assert preview.affected_permissions == []
    assert preview.affected_settings == []

    _cleanup_test_data(db, portal.id)


def test_preview_release_aggregation_works(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)
    seed_platform_module_versions(db, commit=False)

    portal = _create_portal(db)
    module_key = "runtime.calendar"
    _add_runtime_nav(db, portal_id=portal.id, system_key=module_key)
    backfill_tenant_modules_for_portal(db, portal_id=portal.id, commit=False, bypass_module_config_write_policy=True)

    unique = _suffix()
    version_base = f"90.0.{unique}"
    version_mid = f"90.1.{unique}"
    version_latest = f"90.2.{unique}"

    tenant_module = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.module_key == module_key,
        )
        .one()
    )
    tenant_module.installed_version = version_base

    for version in (version_mid, version_latest):
        _ensure_module_version(db, module_key=module_key, version=version)

    release_a = PlatformRelease(
        version=f"test-release-a-{_suffix()}",
        title="Step one",
        status="draft",
        source_tenant_id=portal.id,
    )
    release_b = PlatformRelease(
        version=f"test-release-b-{_suffix()}",
        title="Step two",
        status="draft",
        source_tenant_id=portal.id,
    )
    db.add_all([release_a, release_b])
    db.flush()

    db.add_all(
        [
            PlatformReleaseModule(
                release_id=release_a.id,
                module_key=module_key,
                from_version=version_base,
                to_version=version_mid,
                change_summary="- Step one change",
            ),
            PlatformReleaseModule(
                release_id=release_b.id,
                module_key=module_key,
                from_version=version_mid,
                to_version=version_latest,
                change_summary="- Step two change",
            ),
        ]
    )
    db.flush()

    offer = TenantModuleUpdateOffer(
        tenant_id=portal.id,
        module_key=module_key,
        from_version=version_base,
        to_version=version_latest,
        release_id=release_b.id,
        status=TenantModuleUpdateOfferStatus.AVAILABLE,
        change_summary="- Step one change\n- Step two change",
    )
    db.add(offer)
    db.flush()

    payload = build_preview_payload_from_offer(db, offer)
    change_items = payload["impact_analysis"]["change_items"]
    assert "Step one change" in change_items
    assert "Step two change" in change_items
    assert len(payload["impact_analysis"]["release_steps"]) == 2

    _cleanup_test_data(db, portal.id)


def test_get_tenant_previews_api(client: TestClient, db: Session) -> None:
    portal, release = _seed_upgrade_scenario(db)
    _create_offer_with_preview(db, portal)

    admin = _create_user(db, role_name="admin", tenant_id=portal.id)
    db.add(
        TenantUserMembership(
            tenant_id=portal.id,
            user_id=admin.id,
            role_key="admin",
            is_active=True,
        )
    )
    _commit_test(db, portal=portal, release=release, user=admin)

    response = client.get(
        f"/tenants/{portal.id}/module-update-previews",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 1
    assert payload[0]["module_key"] == "runtime.calendar"

    _cleanup_test_data(db, portal.id)
    _commit_test(db, portal=portal, release=release)


def test_get_single_preview_api(client: TestClient, db: Session) -> None:
    portal, release = _seed_upgrade_scenario(db)
    _create_offer_with_preview(db, portal)
    preview = (
        db.query(TenantModuleUpdatePreview)
        .filter(TenantModuleUpdatePreview.tenant_id == portal.id)
        .one()
    )

    admin = _create_user(db, role_name="admin")
    _commit_test(db, portal=portal, release=release, user=admin)

    response = client.get(
        f"/tenants/{portal.id}/module-update-previews/{preview.id}",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == preview.id
    assert payload["change_items"]
    assert payload["affected_components"]

    _cleanup_test_data(db, portal.id)
    _commit_test(db, portal=portal, release=release)


def test_get_preview_by_offer_api(client: TestClient, db: Session) -> None:
    portal, release = _seed_upgrade_scenario(db)
    offer = _create_offer_with_preview(db, portal)

    admin = _create_user(db, role_name="admin")
    _commit_test(db, portal=portal, release=release, user=admin)

    response = client.get(
        f"/tenants/{portal.id}/module-update-offers/{offer.id}/preview",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["offer_id"] == offer.id
    assert payload["affected_dependencies"]

    _cleanup_test_data(db, portal.id)
    _commit_test(db, portal=portal, release=release)


def test_previews_api_is_read_only(client: TestClient, db: Session) -> None:
    portal, release = _seed_upgrade_scenario(db)
    _create_offer_with_preview(db, portal)

    admin = _create_user(db, role_name="admin")
    _commit_test(db, portal=portal, release=release, user=admin)

    headers = _auth_headers(admin)
    base = f"/tenants/{portal.id}/module-update-previews"
    assert client.post(base, headers=headers, json={}).status_code == 405
    assert client.patch(f"{base}/1", headers=headers, json={}).status_code == 405
    assert client.delete(f"{base}/1", headers=headers).status_code == 405

    _cleanup_test_data(db, portal.id)
    _commit_test(db, portal=portal, release=release)


def test_existing_module_offers_unchanged(client: TestClient, db: Session) -> None:
    portal, release = _seed_upgrade_scenario(db)
    offer = _create_offer_with_preview(db, portal)

    admin = _create_user(db, role_name="admin")
    _commit_test(db, portal=portal, release=release, user=admin)

    response = client.get(
        f"/tenants/{portal.id}/module-update-offers/{offer.id}",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    assert response.json()["id"] == offer.id

    _cleanup_test_data(db, portal.id)
    _commit_test(db, portal=portal, release=release)


def test_existing_tenant_modules_unchanged(client: TestClient, db: Session) -> None:
    portal, release = _seed_upgrade_scenario(db)
    _create_offer_with_preview(db, portal)

    admin = _create_user(db, role_name="admin")
    _commit_test(db, portal=portal, release=release, user=admin)

    response = client.get(
        f"/tenants/{portal.id}/modules",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    assert len(response.json()) == 1

    _cleanup_test_data(db, portal.id)
    _commit_test(db, portal=portal, release=release)


def test_existing_release_pipeline_unchanged(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    admin = _create_user(db, role_name="admin")
    commit_portal_test_session(db, user_id=int(admin.id))
    headers = _auth_headers(admin)

    assert client.get("/platform/releases", headers=headers).status_code == 200
    assert client.get("/platform/module-versions", headers=headers).status_code == 200


def test_existing_routing_unchanged(client: TestClient, db: Session) -> None:
    seed_platform_modules(db, commit=True)
    admin = _create_user(db, role_name="admin")
    commit_portal_test_session(db, user_id=int(admin.id))
    headers = _auth_headers(admin)

    assert client.get("/platform/modules", headers=headers).status_code == 200
    assert client.get("/platform/module-update-offers", headers=headers).status_code == 200


def test_existing_runtime_behavior_unchanged(db: Session) -> None:
    before_count = db.query(NavigationItem).count()
    seed_platform_modules(db, commit=False)
    seed_platform_module_versions(db, commit=False)
    after_count = db.query(NavigationItem).count()
    assert before_count == after_count


def test_preview_regeneration_marks_old_superseded(db: Session) -> None:
    portal, release = _seed_upgrade_scenario(db)
    tenant_module = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.module_key == "runtime.calendar",
        )
        .one()
    )
    generate_offer_for_tenant_module(db, tenant_module, commit=False)
    offer = (
        db.query(TenantModuleUpdateOffer)
        .filter(TenantModuleUpdateOffer.tenant_id == portal.id)
        .one()
    )
    first_preview = (
        db.query(TenantModuleUpdatePreview)
        .filter(TenantModuleUpdatePreview.offer_id == offer.id)
        .one()
    )

    offer.to_version = "9.9.9"
    offer.change_summary = "- Forced update"
    generate_preview_for_offer(db, offer, commit=False)

    db.refresh(first_preview)
    assert first_preview.preview_status == TenantModuleUpdatePreviewStatus.SUPERSEDED

    current = (
        db.query(TenantModuleUpdatePreview)
        .filter(
            TenantModuleUpdatePreview.offer_id == offer.id,
            TenantModuleUpdatePreview.preview_status == TenantModuleUpdatePreviewStatus.GENERATED,
        )
        .one()
    )
    assert current.id != first_preview.id

    _cleanup_test_data(db, portal.id)


def test_platform_module_update_previews_list_api(client: TestClient, db: Session) -> None:
    portal, release = _seed_upgrade_scenario(db)
    _create_offer_with_preview(db, portal)

    admin = _create_user(db, role_name="admin")
    _commit_test(db, portal=portal, release=release, user=admin)

    response = client.get(
        "/platform/module-update-previews",
        headers=_auth_headers(admin),
    )
    assert response.status_code == 200
    assert any(item["tenant_id"] == portal.id for item in response.json())

    _cleanup_test_data(db, portal.id)
    _commit_test(db, portal=portal, release=release)
