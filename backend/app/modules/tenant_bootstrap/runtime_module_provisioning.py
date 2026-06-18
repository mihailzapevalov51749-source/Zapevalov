"""Canonical tenant runtime module provisioning after tenant creation or clone."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy.orm import Session

from app.modules.platform_modules.constants import PlatformModuleStatus
from app.modules.platform_modules.models import PlatformModule
from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap.exceptions import TenantRuntimeModuleInvariantError
from app.modules.tenant_management.tenant_write_policy import (
    assert_tenant_allows_direct_module_config_write,
)
from app.modules.tenant_module_configurations.backfill import (
    backfill_configuration_for_tenant_module,
)
from app.modules.tenant_module_configurations.constants import ACTIVE_CONFIGURATION_MODULE_KEYS
from app.modules.tenant_module_configurations.crud import get_configuration
from app.modules.tenant_modules.backfill import (
    backfill_tenant_modules_for_portal,
    resolve_platform_module_version,
)
from app.modules.tenant_modules.models import TenantModule

PROVISIONING_SOURCE = "provisioning"


@dataclass
class ProvisionResult:
    tenant_id: int
    created_modules: list[str] = field(default_factory=list)
    created_configurations: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def find_tenant_runtime_module_gaps(db: Session, tenant_id: int) -> list[str]:
    """Return gap descriptors for tenant_module / configuration invariant."""
    gaps: list[str] = []
    for module_key in sorted(ACTIVE_CONFIGURATION_MODULE_KEYS):
        tenant_module = (
            db.query(TenantModule)
            .filter(
                TenantModule.tenant_id == tenant_id,
                TenantModule.module_key == module_key,
            )
            .one_or_none()
        )
        if tenant_module is None:
            gaps.append(f"missing_module:{module_key}")
            continue

        configuration = get_configuration(db, tenant_id=tenant_id, module_key=module_key)
        if configuration is None:
            gaps.append(f"missing_configuration:{module_key}")

    return gaps


def verify_tenant_runtime_module_invariant(db: Session, tenant_id: int) -> None:
    gaps = find_tenant_runtime_module_gaps(db, tenant_id)
    if gaps:
        raise TenantRuntimeModuleInvariantError(
            f"Tenant {tenant_id} violates runtime module invariant: {', '.join(gaps)}",
        )


def _ensure_tenant_module(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
    now: datetime,
    bypass_module_config_write_policy: bool = False,
) -> tuple[str, TenantModule | None]:
    platform_module = (
        db.query(PlatformModule)
        .filter(
            PlatformModule.module_key == module_key,
            PlatformModule.status == PlatformModuleStatus.ACTIVE,
        )
        .one_or_none()
    )
    if platform_module is None:
        return "platform_module_missing", None

    existing = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == tenant_id,
            TenantModule.module_key == module_key,
        )
        .one_or_none()
    )
    if existing is not None:
        return "already_exists", existing

    if not bypass_module_config_write_policy:
        assert_tenant_allows_direct_module_config_write(
            db,
            tenant_id,
            operation_name="provision_tenant_runtime_modules:create_module",
        )

    installed_version = resolve_platform_module_version(db, module_key)
    tenant_module = TenantModule(
        tenant_id=tenant_id,
        portal_id=tenant_id,
        module_key=module_key,
        installed_version=installed_version,
        enabled=True,
        installed_at=now,
        updated_at=now,
        source=PROVISIONING_SOURCE,
        notes="Created during tenant runtime provisioning",
    )
    db.add(tenant_module)
    db.flush()
    return "created", tenant_module


def provision_tenant_runtime_modules(
    db: Session,
    tenant_id: int,
    *,
    commit: bool = False,
    enforce_invariant: bool = True,
    bypass_module_config_write_policy: bool = False,
) -> ProvisionResult:
    """
    Ensure runtime tenant_modules and tenant_module_configurations exist for a tenant.

    Idempotent: existing rows are preserved; configurations are not overwritten.
    """
    result = ProvisionResult(tenant_id=tenant_id)
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if portal is None:
        result.errors.append("tenant_not_found")
        return result

    now = datetime.utcnow()

    backfill_tenant_modules_for_portal(
        db,
        portal_id=tenant_id,
        commit=False,
        bypass_module_config_write_policy=bypass_module_config_write_policy,
    )

    for module_key in sorted(ACTIVE_CONFIGURATION_MODULE_KEYS):
        status, tenant_module = _ensure_tenant_module(
            db,
            tenant_id=tenant_id,
            module_key=module_key,
            now=now,
            bypass_module_config_write_policy=bypass_module_config_write_policy,
        )
        if status == "created" and tenant_module is not None:
            result.created_modules.append(module_key)
        elif status == "already_exists":
            result.skipped.append(f"module:{module_key}:already_exists")
        elif status == "platform_module_missing":
            result.errors.append(f"module:{module_key}:platform_module_missing")

    tenant_modules = (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == tenant_id,
            TenantModule.module_key.in_(ACTIVE_CONFIGURATION_MODULE_KEYS),
        )
        .order_by(TenantModule.module_key.asc())
        .all()
    )

    for tenant_module in tenant_modules:
        module_key = str(tenant_module.module_key)
        config_result = backfill_configuration_for_tenant_module(
            db,
            tenant_module=tenant_module,
            commit=False,
            bypass_module_config_write_policy=bypass_module_config_write_policy,
        )
        status = str(config_result.get("status") or "skipped")
        reason = str(config_result.get("reason") or "unknown")

        if status == "created":
            result.created_configurations.append(module_key)
        elif reason == "already_exists":
            result.skipped.append(f"configuration:{module_key}:already_exists")
        else:
            result.skipped.append(f"configuration:{module_key}:{reason}")

    if enforce_invariant:
        try:
            verify_tenant_runtime_module_invariant(db, tenant_id)
        except TenantRuntimeModuleInvariantError as exc:
            result.errors.append(str(exc))

    if commit:
        db.commit()

    return result
