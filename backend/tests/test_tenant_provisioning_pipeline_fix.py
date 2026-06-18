"""Tests for tenant provisioning pipeline fix."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform_modules.manifest_seed import seed_platform_module_manifests
from app.modules.platform_modules.seed import seed_platform_modules
from app.modules.portals.models import Portal
from app.modules.portals.schemas import CompanyFirstAdminCreate, PortalCreate, PortalCreateWithFirstAdmin
from app.modules.portals.service import create_portal
from app.modules.portals.create_with_first_admin import create_portal_with_first_admin
from app.modules.tenant_bootstrap.clone_tenant_structure import clone_tenant_structure
from app.modules.tenant_bootstrap.runtime_module_provisioning import (
    PROVISIONING_SOURCE,
    provision_tenant_runtime_modules,
)
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.tenant_module_configurations.constants import ACTIVE_CONFIGURATION_MODULE_KEYS
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_module_configurations.runtime.service import get_runtime_module_configuration
from app.modules.tenant_module_configurations.models import TenantModuleConfiguration
from app.modules.tenant_modules.models import TenantModule
from tests.test_module_configuration_apply_mvp import _create_user
from tests.test_publication_diff_generation_fix import test_publication_diff_created_on_publish


@pytest.fixture
def db() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _seed_platform_runtime(db: Session) -> None:
    seed_platform_modules(db, commit=False)
    seed_platform_module_manifests(db, commit=False)


def _create_portal_row(db: Session, *, tenant_type: str = TenantType.CLIENT.value) -> Portal:
    suffix = _suffix()
    portal = Portal(
        name=f"Provisioning test {suffix}",
        code=f"prov-{suffix}",
        tenant_type=tenant_type,
        tenant_status=TenantStatus.ACTIVE.value,
        is_active=True,
    )
    db.add(portal)
    db.flush()
    return portal


def _add_runtime_nav(db: Session, *, portal_id: int, system_key: str) -> None:
    db.add(
        NavigationItem(
            portal_id=portal_id,
            type="page",
            title=f"Runtime {system_key}",
            menu_scope="runtime",
            system_key=system_key,
            is_visible=True,
        )
    )
    db.flush()


def _seed_clone_source(db: Session) -> Portal:
    source = _create_portal_row(db, tenant_type=TenantType.TEMPLATE.value)
    db.add(
        Page(
            portal_id=source.id,
            title="Template home",
            status="published",
            is_home=True,
            is_visible=True,
        )
    )
    db.add(
        DesignerObjectType(
            tenant_id=source.id,
            key=f"prov_obj_{_suffix()}",
            name="Provisioning object",
            status="active",
        )
    )
    for module_key in ACTIVE_CONFIGURATION_MODULE_KEYS:
        _add_runtime_nav(db, portal_id=source.id, system_key=module_key)
    db.flush()
    return source


def _assert_runtime_modules_and_configurations(db: Session, tenant_id: int) -> None:
    for module_key in ACTIVE_CONFIGURATION_MODULE_KEYS:
        tenant_module = (
            db.query(TenantModule)
            .filter(
                TenantModule.tenant_id == tenant_id,
                TenantModule.module_key == module_key,
            )
            .one_or_none()
        )
        assert tenant_module is not None, f"missing tenant_module {module_key}"

        configuration = get_configuration(db, tenant_id=tenant_id, module_key=module_key)
        assert configuration is not None, f"missing configuration {module_key}"


def _cleanup_tenant_runtime_state(db: Session, tenant_id: int) -> None:
    db.query(TenantModuleConfiguration).filter(
        TenantModuleConfiguration.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModule).filter(TenantModule.tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    db.flush()


def test_create_portal_creates_modules(db: Session) -> None:
    _seed_platform_runtime(db)
    source = _seed_clone_source(db)
    db.commit()

    portal, _clone_result = create_portal(
        db,
        PortalCreate(name=f"Portal modules {_suffix()}", bootstrap_from_tenant_id=source.id),
    )

    modules = (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == portal.id)
        .order_by(TenantModule.module_key.asc())
        .all()
    )
    module_keys = {row.module_key for row in modules}
    assert ACTIVE_CONFIGURATION_MODULE_KEYS.issubset(module_keys)


def test_create_portal_creates_configurations(db: Session) -> None:
    _seed_platform_runtime(db)
    source = _seed_clone_source(db)
    db.commit()

    portal, _clone_result = create_portal(
        db,
        PortalCreate(name=f"Portal configs {_suffix()}", bootstrap_from_tenant_id=source.id),
    )

    _assert_runtime_modules_and_configurations(db, portal.id)


def test_create_portal_with_first_admin_creates_modules(db: Session) -> None:
    _seed_platform_runtime(db)
    source = _seed_clone_source(db)
    db.commit()
    actor = _create_user(db, role_name="platform_admin")

    with patch(
        "app.modules.portals.create_with_first_admin.send_company_welcome_email",
        return_value=False,
    ):
        response = create_portal_with_first_admin(
            db,
            PortalCreateWithFirstAdmin(
                name=f"Company modules {_suffix()}",
                tenant_type=TenantType.CLIENT,
                bootstrap_from_tenant_id=source.id,
                first_admin=CompanyFirstAdminCreate(
                    full_name="Owner Modules",
                    email=f"owner-modules-{_suffix()}@example.com",
                ),
            ),
            current_user=actor,
        )

    modules = db.query(TenantModule).filter(TenantModule.tenant_id == response.id).all()
    module_keys = {row.module_key for row in modules}
    assert ACTIVE_CONFIGURATION_MODULE_KEYS.issubset(module_keys)


def test_create_portal_with_first_admin_creates_configurations(db: Session) -> None:
    _seed_platform_runtime(db)
    source = _seed_clone_source(db)
    db.commit()
    actor = _create_user(db, role_name="platform_admin")

    with patch(
        "app.modules.portals.create_with_first_admin.send_company_welcome_email",
        return_value=False,
    ):
        response = create_portal_with_first_admin(
            db,
            PortalCreateWithFirstAdmin(
                name=f"Company configs {_suffix()}",
                tenant_type=TenantType.CLIENT,
                bootstrap_from_tenant_id=source.id,
                first_admin=CompanyFirstAdminCreate(
                    full_name="Owner Configs",
                    email=f"owner-configs-{_suffix()}@example.com",
                ),
            ),
            current_user=actor,
        )

    _assert_runtime_modules_and_configurations(db, response.id)


def test_clone_tenant_structure_creates_modules(db: Session) -> None:
    _seed_platform_runtime(db)
    source = _seed_clone_source(db)
    target = _create_portal_row(db)
    db.commit()

    clone_tenant_structure(db, source.id, target.id, auto_publish=False)

    modules = db.query(TenantModule).filter(TenantModule.tenant_id == target.id).all()
    module_keys = {row.module_key for row in modules}
    assert ACTIVE_CONFIGURATION_MODULE_KEYS.issubset(module_keys)


def test_clone_tenant_structure_creates_configurations(db: Session) -> None:
    _seed_platform_runtime(db)
    source = _seed_clone_source(db)
    target = _create_portal_row(db)
    db.commit()

    clone_tenant_structure(db, source.id, target.id, auto_publish=False)

    _assert_runtime_modules_and_configurations(db, target.id)


def test_repeated_provisioning_is_safe(db: Session) -> None:
    _seed_platform_runtime(db)
    portal = _create_portal_row(db)
    for module_key in ACTIVE_CONFIGURATION_MODULE_KEYS:
        _add_runtime_nav(db, portal_id=portal.id, system_key=module_key)
    db.commit()

    first = provision_tenant_runtime_modules(db, portal.id, commit=True, bypass_module_config_write_policy=True)
    second = provision_tenant_runtime_modules(db, portal.id, commit=True, bypass_module_config_write_policy=True)

    assert first.created_configurations
    assert second.created_modules == []
    assert second.created_configurations == []
    assert second.errors == []


def test_schema_validation_passes_for_provisioned_configurations(db: Session) -> None:
    _seed_platform_runtime(db)
    portal = _create_portal_row(db)
    for module_key in ACTIVE_CONFIGURATION_MODULE_KEYS:
        _add_runtime_nav(db, portal_id=portal.id, system_key=module_key)
    db.commit()

    result = provision_tenant_runtime_modules(db, portal.id, commit=True, bypass_module_config_write_policy=True)
    assert result.errors == []

    for module_key in ACTIVE_CONFIGURATION_MODULE_KEYS:
        runtime = get_runtime_module_configuration(
            db,
            tenant_id=portal.id,
            module_key=module_key,
            use_cache=False,
        )
        assert runtime.module_key == module_key
        assert runtime.settings is not None


def test_runtime_reads_tenant_module_configuration_not_manifest_fallback(db: Session) -> None:
    _seed_platform_runtime(db)
    portal = _create_portal_row(db)
    for module_key in ACTIVE_CONFIGURATION_MODULE_KEYS:
        _add_runtime_nav(db, portal_id=portal.id, system_key=module_key)
    db.commit()

    provision_tenant_runtime_modules(db, portal.id, commit=True, bypass_module_config_write_policy=True)

    for module_key in ACTIVE_CONFIGURATION_MODULE_KEYS:
        row = get_configuration(db, tenant_id=portal.id, module_key=module_key)
        assert row is not None
        runtime = get_runtime_module_configuration(
            db,
            tenant_id=portal.id,
            module_key=module_key,
            use_cache=False,
        )
        assert runtime.configuration_version == row.config_version
        assert runtime.source == row.source


def test_provisioning_does_not_create_duplicate_rows(db: Session) -> None:
    _seed_platform_runtime(db)
    portal = _create_portal_row(db)
    for module_key in ACTIVE_CONFIGURATION_MODULE_KEYS:
        _add_runtime_nav(db, portal_id=portal.id, system_key=module_key)
    db.commit()

    provision_tenant_runtime_modules(db, portal.id, commit=True, bypass_module_config_write_policy=True)
    module_count = db.query(TenantModule).filter(TenantModule.tenant_id == portal.id).count()
    config_count = (
        db.query(TenantModuleConfiguration)
        .filter(TenantModuleConfiguration.tenant_id == portal.id)
        .count()
    )

    provision_tenant_runtime_modules(db, portal.id, commit=True, bypass_module_config_write_policy=True)

    assert db.query(TenantModule).filter(TenantModule.tenant_id == portal.id).count() == module_count
    assert (
        db.query(TenantModuleConfiguration)
        .filter(TenantModuleConfiguration.tenant_id == portal.id)
        .count()
        == config_count
    )


def test_existing_tenant_configuration_is_not_overwritten(db: Session) -> None:
    _seed_platform_runtime(db)
    portal = _create_portal_row(db)
    for module_key in ACTIVE_CONFIGURATION_MODULE_KEYS:
        _add_runtime_nav(db, portal_id=portal.id, system_key=module_key)
    db.commit()

    provision_tenant_runtime_modules(db, portal.id, commit=True, bypass_module_config_write_policy=True)
    row = get_configuration(db, tenant_id=portal.id, module_key="runtime.chat")
    assert row is not None
    original_settings = dict(row.settings or {})
    original_settings["attachments_enabled"] = False
    row.settings = original_settings
    db.commit()

    provision_tenant_runtime_modules(db, portal.id, commit=True, bypass_module_config_write_policy=True)
    db.refresh(row)

    assert row.settings.get("attachments_enabled") is False


def test_publication_pipeline_still_works(db: Session) -> None:
    test_publication_diff_created_on_publish(db)


def test_provisioned_modules_use_provisioning_source_when_created_directly(db: Session) -> None:
    _seed_platform_runtime(db)
    portal = _create_portal_row(db)
    db.commit()

    result = provision_tenant_runtime_modules(db, portal.id, commit=True, bypass_module_config_write_policy=True)
    assert result.errors == []
    assert set(result.created_modules) == set(ACTIVE_CONFIGURATION_MODULE_KEYS)

    created = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == portal.id,
            TenantModule.source == PROVISIONING_SOURCE,
        )
        .all()
    )
    assert len(created) == len(ACTIVE_CONFIGURATION_MODULE_KEYS)
