"""Backfill tenant_modules from existing runtime navigation."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.modules.navigation.models import NavigationItem
from app.modules.platform_modules.constants import PlatformModuleStatus
from app.modules.platform_modules.models import PlatformModule
from app.modules.portals.models import Portal
from app.modules.tenant_management.tenant_write_policy import (
    assert_tenant_allows_direct_module_config_write,
)
from app.modules.tenant_modules.constants import (
    BACKFILL_SOURCE,
    PLANNED_RUNTIME_MODULE_KEYS,
    RUNTIME_MODULE_KEYS_FOR_BACKFILL,
)
from app.modules.tenant_modules.models import TenantModule


def detect_installed_runtime_module_keys(db: Session, portal_id: int) -> set[str]:
    rows = (
        db.query(NavigationItem.system_key)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.system_key.in_(RUNTIME_MODULE_KEYS_FOR_BACKFILL),
        )
        .all()
    )

    installed: set[str] = set()
    for (system_key,) in rows:
        normalized = str(system_key or "").strip()
        if normalized in RUNTIME_MODULE_KEYS_FOR_BACKFILL:
            installed.add(normalized)
    return installed


def resolve_platform_module_version(db: Session, module_key: str) -> str:
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    if module is None:
        return "1.0.0"
    return str(module.version or "1.0.0")


def backfill_tenant_modules_for_portal(
    db: Session,
    *,
    portal_id: int,
    commit: bool = False,
    bypass_module_config_write_policy: bool = False,
) -> dict[str, int]:
    portal = db.query(Portal).filter(Portal.id == portal_id).one_or_none()
    if portal is None:
        return {"created": 0, "updated": 0, "skipped": 0}

    installed_keys = detect_installed_runtime_module_keys(db, portal_id)
    created = 0
    updated = 0
    skipped = 0
    now = datetime.utcnow()
    write_guard_checked = bypass_module_config_write_policy

    for module_key in sorted(installed_keys):
        if module_key in PLANNED_RUNTIME_MODULE_KEYS:
            continue

        platform_module = (
            db.query(PlatformModule)
            .filter(
                PlatformModule.module_key == module_key,
                PlatformModule.status == PlatformModuleStatus.ACTIVE,
            )
            .one_or_none()
        )
        if platform_module is None:
            continue

        installed_version = resolve_platform_module_version(db, module_key)
        existing = (
            db.query(TenantModule)
            .filter(
                TenantModule.tenant_id == portal_id,
                TenantModule.module_key == module_key,
            )
            .one_or_none()
        )

        if existing is None:
            if not write_guard_checked:
                assert_tenant_allows_direct_module_config_write(
                    db,
                    portal_id,
                    operation_name="backfill_tenant_modules_for_portal:create",
                )
                write_guard_checked = True
            db.add(
                TenantModule(
                    tenant_id=portal_id,
                    portal_id=portal_id,
                    module_key=module_key,
                    installed_version=installed_version,
                    enabled=True,
                    installed_at=now,
                    updated_at=now,
                    source=BACKFILL_SOURCE,
                    notes="Detected via navigation.system_key during backfill",
                )
            )
            created += 1
            continue

        changed = False
        if existing.portal_id != portal_id:
            existing.portal_id = portal_id
            changed = True
        if existing.installed_version != installed_version:
            existing.installed_version = installed_version
            changed = True
        if existing.enabled is not True:
            existing.enabled = True
            changed = True
        if existing.source != BACKFILL_SOURCE:
            existing.source = BACKFILL_SOURCE
            changed = True

        if changed:
            if not write_guard_checked:
                assert_tenant_allows_direct_module_config_write(
                    db,
                    portal_id,
                    operation_name="backfill_tenant_modules_for_portal:update",
                )
                write_guard_checked = True
            existing.updated_at = now
            updated += 1
        else:
            skipped += 1

    db.flush()

    if commit:
        db.commit()

    return {"created": created, "updated": updated, "skipped": skipped}


def backfill_tenant_modules(
    db: Session,
    *,
    tenant_ids: list[int] | None = None,
    commit: bool = True,
    bypass_module_config_write_policy: bool = False,
) -> dict[str, int]:
    query = db.query(Portal.id)
    if tenant_ids:
        query = query.filter(Portal.id.in_(tenant_ids))

    totals = {"created": 0, "updated": 0, "skipped": 0, "tenants": 0}

    for (portal_id,) in query.order_by(Portal.id.asc()).all():
        result = backfill_tenant_modules_for_portal(
            db,
            portal_id=portal_id,
            commit=False,
            bypass_module_config_write_policy=bypass_module_config_write_policy,
        )
        totals["created"] += result["created"]
        totals["updated"] += result["updated"]
        totals["skipped"] += result["skipped"]
        totals["tenants"] += 1

    if commit:
        db.commit()

    return totals
