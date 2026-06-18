"""Tests for tenant protection, archive, restore Rozetka."""

from __future__ import annotations

import os
import uuid

import pytest
from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.portals.repository import create_portal
from app.modules.tenant_bootstrap.constants import PLATFORM_TEMPLATE_TENANT_ID
from app.modules.tenant_environment.constants import (
    TenantEnvironmentRole,
    TenantStatus,
    TenantType,
)
from app.modules.tenant_management.constants import (
    DEMO_CLIENT_TENANT_KEY,
    SYSTEM_TENANT_ID,
)
from app.modules.tenant_management.delete_tenant import delete_tenant, purge_tenant_hard
from app.modules.tenant_management.demo_tenant_inventory import (
    archive_non_protected_tenants,
    list_non_protected_active_portal_ids,
    resolve_protected_tenant_ids,
)
from app.modules.tenant_management.exceptions import (
    ProtectedTenantDeleteForbiddenError,
    SystemTenantDeleteForbiddenError,
)
from app.modules.tenant_management.restore_demo_rozetka import (
    RestoreDemoRozetkaPlan,
    plan_restore_demo_rozetka,
    restore_demo_rozetka,
)
from app.modules.tenant_management.tenant_write_policy import (
    PROTECTED_DELETE_MESSAGE,
    assert_tenant_allows_delete,
)


def _suffix() -> str:
    return uuid.uuid4().hex[:8]


def _create_leak_portal(db: Session) -> Portal:
    portal = Portal(
        name=f"Leak Tenant {_suffix()}",
        code=f"leak-tenant-{_suffix()}",
        tenant_type=TenantType.CLIENT.value,
        tenant_status=TenantStatus.ACTIVE.value,
        template_version="1.0.0",
        is_active=True,
        is_protected=False,
    )
    db.add(portal)
    db.flush()
    return portal


def test_restore_rozetka_dry_run(db: Session) -> None:
    before = db.query(Portal).count()
    plan = plan_restore_demo_rozetka(db)
    assert isinstance(plan, RestoreDemoRozetkaPlan)
    assert db.query(Portal).count() == before
    assert plan.audit.destructive_operation == "none"
    assert plan.audit.rows_to_delete["portals"] == 0


def test_restore_rozetka_confirm_sets_protection_fields(db: Session) -> None:
    before_users = db.execute(
        __import__("sqlalchemy").text("SELECT count(*) FROM users")
    ).scalar()
    before_memberships = db.execute(
        __import__("sqlalchemy").text("SELECT count(*) FROM tenant_user_memberships")
    ).scalar()

    result = restore_demo_rozetka(db, dry_run=False, confirm=True)
    portal = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).one()

    assert portal.name == "ООО Розетка"
    assert portal.short_name == "Розетка"
    assert portal.tenant_type == TenantType.CLIENT.value
    assert portal.is_protected is True
    assert portal.environment_role == TenantEnvironmentRole.DEMO_CLIENT.value
    assert portal.is_active is True
    assert portal.tenant_status == TenantStatus.ACTIVE.value
    assert result.portal_id == portal.id

    after_users = db.execute(
        __import__("sqlalchemy").text("SELECT count(*) FROM users")
    ).scalar()
    after_memberships = db.execute(
        __import__("sqlalchemy").text("SELECT count(*) FROM tenant_user_memberships")
    ).scalar()
    assert after_users == before_users
    assert after_memberships == before_memberships


def test_general_settings_can_change_short_name_without_code(db: Session) -> None:
    portal = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).one_or_none()
    if portal is None:
        restore_demo_rozetka(db, dry_run=False, confirm=True)
        portal = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).one()

    original_code = portal.code
    portal.short_name = "Розетка СПб"
    db.add(portal)
    db.commit()
    db.refresh(portal)

    assert portal.short_name == "Розетка СПб"
    assert portal.code == original_code
    assert portal.is_protected is True


def test_cleanup_dry_run_skips_protected_rozetka(db: Session) -> None:
    portal = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).one_or_none()
    if portal is None:
        restore_demo_rozetka(db, dry_run=False, confirm=True)

    protected = resolve_protected_tenant_ids(db)
    candidates = list_non_protected_active_portal_ids(db)
    rozetka = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).one()

    assert rozetka.id in protected
    assert rozetka.id not in candidates


def test_protected_tenant_delete_blocked(db: Session) -> None:
    portal = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).one_or_none()
    if portal is None:
        restore_demo_rozetka(db, dry_run=False, confirm=True)
        portal = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).one()

    with pytest.raises(ProtectedTenantDeleteForbiddenError, match=PROTECTED_DELETE_MESSAGE):
        assert_tenant_allows_delete(db, portal.id)

    with pytest.raises(SystemTenantDeleteForbiddenError, match=PROTECTED_DELETE_MESSAGE):
        delete_tenant(db, portal.id)


def test_non_protected_tenant_archived_not_removed(db: Session) -> None:
    leak = _create_leak_portal(db)
    db.commit()

    result = delete_tenant(db, leak.id)
    assert result.archived is True
    assert result.hard_deleted is False

    archived = db.query(Portal).filter(Portal.id == leak.id).one()
    assert archived.tenant_status == TenantStatus.ARCHIVED.value
    assert archived.is_active is False


def test_purge_hard_requires_guard(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    leak = _create_leak_portal(db)
    db.commit()
    leak_id = leak.id

    with pytest.raises(RuntimeError, match="YASNOPRO_ALLOW_TENANT_HARD_DELETE"):
        purge_tenant_hard(db, leak_id, confirm=True)

    monkeypatch.setenv("YASNOPRO_ALLOW_TENANT_HARD_DELETE", "1")
    purge_tenant_hard(db, leak_id, confirm=True)
    assert db.query(Portal).filter(Portal.id == leak_id).first() is None


def test_archive_non_protected_skips_demo_portals(db: Session) -> None:
    portal = db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).one_or_none()
    if portal is None:
        restore_demo_rozetka(db, dry_run=False, confirm=True)

    leak = _create_leak_portal(db)
    db.commit()
    archived_ids = [item.tenant_id for item in archive_non_protected_tenants(db)]
    assert leak.id in archived_ids
    assert db.query(Portal).filter(Portal.code == DEMO_CLIENT_TENANT_KEY).count() == 1


def test_system_and_template_protected(db: Session) -> None:
    if db.query(Portal).filter(Portal.id == SYSTEM_TENANT_ID).first() is None:
        pytest.skip("DEV tenant missing")

    with pytest.raises(ProtectedTenantDeleteForbiddenError):
        assert_tenant_allows_delete(db, SYSTEM_TENANT_ID)

    if db.query(Portal).filter(Portal.id == PLATFORM_TEMPLATE_TENANT_ID).first() is None:
        pytest.skip("TEMPLATE tenant missing")

    with pytest.raises(ProtectedTenantDeleteForbiddenError):
        assert_tenant_allows_delete(db, PLATFORM_TEMPLATE_TENANT_ID)
