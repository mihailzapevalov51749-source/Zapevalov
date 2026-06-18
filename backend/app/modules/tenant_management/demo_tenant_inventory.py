"""Demo tenant inventory helpers — protected tenants and cleanup discipline."""

from __future__ import annotations

import os

from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus
from app.modules.tenant_management.archive_tenant import ArchiveTenantResult, archive_tenant
from app.modules.tenant_management.demo_test_leak_policy import is_demo_test_leak_tenant_archive_candidate
from app.modules.tenant_management.tenant_write_policy import is_protected_tenant_portal


def resolve_protected_tenant_ids(db: Session) -> dict[int, str]:
    """Return protected tenant ids keyed by stable reason (not display name/code)."""
    protected: dict[int, str] = {}
    for portal in db.query(Portal).order_by(Portal.id.asc()).all():
        if not is_protected_tenant_portal(portal):
            continue
        reason = "is_protected"
        if portal.environment_role:
            reason = f"environment_role:{portal.environment_role}"
        elif portal.tenant_type:
            reason = f"tenant_type:{portal.tenant_type}"
        protected[int(portal.id)] = reason
    return protected


def snapshot_portal_ids(db: Session) -> set[int]:
    return {int(row[0]) for row in db.query(Portal.id).all()}


def list_non_protected_active_portal_ids(db: Session) -> list[int]:
    protected = resolve_protected_tenant_ids(db)
    return [
        int(portal.id)
        for portal in db.query(Portal).order_by(Portal.id.asc()).all()
        if int(portal.id) not in protected
        and bool(portal.is_active)
        and str(portal.tenant_status or TenantStatus.ACTIVE.value) != TenantStatus.ARCHIVED.value
    ]


def archive_demo_test_leak_tenants(db: Session) -> list[ArchiveTenantResult]:
    archived: list[ArchiveTenantResult] = []
    for portal in db.query(Portal).order_by(Portal.id.asc()).all():
        if not is_demo_test_leak_tenant_archive_candidate(portal):
            continue
        archived.append(archive_tenant(db, portal.id))
    return archived


def archive_non_protected_tenants(db: Session) -> list[ArchiveTenantResult]:
    """Deprecated alias — archives only confirmed demo test leak tenants."""
    return archive_demo_test_leak_tenants(db)


def assert_demo_tenant_inventory(db: Session) -> None:
    from app.modules.tenant_management.demo_environment_audit import assert_demo_environment_clean

    assert_demo_environment_clean(db)


class DemoTenantInventoryError(RuntimeError):
    pass


def cleanup_test_tenant_leaks(
    db: Session,
    *,
    before_ids: set[int] | None = None,
) -> list[int]:
    """Archive then hard-purge confirmed demo test leak tenants."""
    from app.modules.tenant_management.demo_cleanup_service import (
        build_demo_cleanup_plan,
        execute_demo_cleanup,
    )

    _ = before_ids
    os.environ.setdefault("YASNOPRO_ALLOW_TENANT_HARD_DELETE", "1")
    archive_demo_test_leak_tenants(db)
    db.commit()
    plan = build_demo_cleanup_plan(db)
    if not plan.tenants:
        return []
    result = execute_demo_cleanup(db, confirm=True)
    if result.errors:
        raise DemoTenantInventoryError("; ".join(result.errors))
    return result.purged_tenant_ids


def cleanup_non_protected_tenants(db: Session) -> list[int]:
    return cleanup_test_tenant_leaks(db)
