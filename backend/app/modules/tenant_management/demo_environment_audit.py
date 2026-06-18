"""Mandatory demo environment audit after cleanup."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_management.constants import DEMO_CLIENT_PORTAL_ID, SYSTEM_TENANT_ID
from app.modules.tenant_management.demo_test_leak_policy import (
    is_demo_test_leak_tenant_candidate,
    is_demo_test_leak_user_candidate,
)
from app.modules.tenant_management.tenant_write_policy import is_protected_tenant_portal
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.tenant_bootstrap.constants import PLATFORM_TEMPLATE_TENANT_ID
from app.modules.user_management.demo_user_inventory import list_visible_users
from app.modules.users.models import User


class DemoEnvironmentAuditError(AssertionError):
    pass


@dataclass(frozen=True)
class DemoEnvironmentMetrics:
    test_tenants_count: int
    test_users_count: int
    test_memberships_count: int
    test_profiles_count: int
    visible_test_objects_count: int
    archived_test_objects_count: int
    dev_exists: bool
    template_exists: bool
    rozetka_exists: bool
    platform_owner_exists: bool
    platform_owner_tenant_id_is_null: bool


def _protected_tenant_ids() -> set[int]:
    return {SYSTEM_TENANT_ID, PLATFORM_TEMPLATE_TENANT_ID, DEMO_CLIENT_PORTAL_ID}


def collect_demo_environment_metrics(db: Session) -> DemoEnvironmentMetrics:
    protected_ids = _protected_tenant_ids()
    portals = db.query(Portal).order_by(Portal.id.asc()).all()

    test_tenants = [portal for portal in portals if is_demo_test_leak_tenant_candidate(portal)]
    archived_test = [
        portal
        for portal in portals
        if is_demo_test_leak_tenant_candidate(portal)
        and str(portal.tenant_status or "").upper() == TenantStatus.ARCHIVED.value
    ]

    visible_users = list_visible_users(db)
    test_users = [user for user in visible_users if is_demo_test_leak_user_candidate(db, user)]

    test_memberships = (
        db.query(func.count())
        .select_from(TenantUserMembership)
        .filter(~TenantUserMembership.tenant_id.in_(protected_ids))
        .scalar()
        or 0
    )
    test_profiles = (
        db.query(func.count())
        .select_from(TenantUserProfile)
        .filter(~TenantUserProfile.tenant_id.in_(protected_ids))
        .scalar()
        or 0
    )

    settings = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    owner = None
    if settings is not None and settings.platform_owner_user_id is not None:
        owner = db.get(User, settings.platform_owner_user_id)

    dev = db.get(Portal, SYSTEM_TENANT_ID)
    template = db.get(Portal, PLATFORM_TEMPLATE_TENANT_ID)
    rozetka = db.get(Portal, DEMO_CLIENT_PORTAL_ID)

    return DemoEnvironmentMetrics(
        test_tenants_count=len(test_tenants),
        test_users_count=len(test_users),
        test_memberships_count=int(test_memberships),
        test_profiles_count=int(test_profiles),
        visible_test_objects_count=len(test_tenants) + len(test_users),
        archived_test_objects_count=len(archived_test),
        dev_exists=dev is not None and is_protected_tenant_portal(dev),
        template_exists=template is not None and is_protected_tenant_portal(template),
        rozetka_exists=rozetka is not None and is_protected_tenant_portal(rozetka),
        platform_owner_exists=owner is not None and bool(owner.is_active),
        platform_owner_tenant_id_is_null=owner is not None and owner.tenant_id is None,
    )


def assert_protected_objects_alive(db: Session) -> None:
    metrics = collect_demo_environment_metrics(db)
    missing: list[str] = []
    if not metrics.dev_exists:
        missing.append("DEV")
    if not metrics.template_exists:
        missing.append("Template")
    if not metrics.rozetka_exists:
        missing.append("Розетка")
    if missing:
        raise DemoEnvironmentAuditError(f"Protected tenants missing: {', '.join(missing)}")


def assert_platform_owner_global(db: Session) -> None:
    metrics = collect_demo_environment_metrics(db)
    if not metrics.platform_owner_exists:
        raise DemoEnvironmentAuditError("Platform Owner missing or inactive")
    if not metrics.platform_owner_tenant_id_is_null:
        raise DemoEnvironmentAuditError("Platform Owner tenant_id must be NULL")


def assert_demo_environment_clean(db: Session) -> DemoEnvironmentMetrics:
    metrics = collect_demo_environment_metrics(db)
    assert_protected_objects_alive(db)
    assert_platform_owner_global(db)

    if metrics.test_tenants_count:
        raise DemoEnvironmentAuditError(
            f"test_tenants_count={metrics.test_tenants_count} (expected 0)",
        )
    if metrics.test_users_count:
        raise DemoEnvironmentAuditError(
            f"test_users_count={metrics.test_users_count} (expected 0)",
        )
    if metrics.test_memberships_count:
        raise DemoEnvironmentAuditError(
            f"test_memberships_count={metrics.test_memberships_count} (expected 0)",
        )
    if metrics.test_profiles_count:
        raise DemoEnvironmentAuditError(
            f"test_profiles_count={metrics.test_profiles_count} (expected 0)",
        )
    if metrics.visible_test_objects_count:
        raise DemoEnvironmentAuditError(
            f"visible_test_objects_count={metrics.visible_test_objects_count} (expected 0)",
        )
    if metrics.archived_test_objects_count:
        raise DemoEnvironmentAuditError(
            f"archived_test_objects_count={metrics.archived_test_objects_count} (expected 0)",
        )
    return metrics
