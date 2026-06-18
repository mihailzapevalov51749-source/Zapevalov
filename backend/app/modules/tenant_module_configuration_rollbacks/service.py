"""Service layer for tenant module configuration rollbacks."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules.models import PlatformModule
from app.modules.portals.models import Portal
from app.modules.tenant_module_configuration_rollbacks import crud
from app.modules.tenant_module_configuration_rollbacks.models import TenantModuleConfigurationRollback
from app.modules.tenant_module_configuration_rollbacks.schemas import (
    TenantModuleConfigurationRollbackListItemOut,
    TenantModuleConfigurationRollbackOut,
)


def _resolve_module_title(db: Session, module_key: str) -> str | None:
    module = (
        db.query(PlatformModule)
        .filter(PlatformModule.module_key == module_key)
        .one_or_none()
    )
    return module.title if module is not None else None


def _resolve_tenant_name(db: Session, tenant_id: int) -> str | None:
    portal = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    return portal.name if portal is not None else None


def serialize_rollback(
    db: Session,
    rollback_row: TenantModuleConfigurationRollback,
) -> TenantModuleConfigurationRollbackOut:
    return TenantModuleConfigurationRollbackOut(
        id=rollback_row.id,
        tenant_id=rollback_row.tenant_id,
        tenant_name=_resolve_tenant_name(db, rollback_row.tenant_id),
        module_key=rollback_row.module_key,
        module_title=_resolve_module_title(db, rollback_row.module_key),
        apply_id=rollback_row.apply_id,
        snapshot_id=rollback_row.snapshot_id,
        from_module_version=rollback_row.from_module_version,
        to_module_version=rollback_row.to_module_version,
        from_config_version=rollback_row.from_config_version,
        to_config_version=rollback_row.to_config_version,
        status=rollback_row.status,
        started_at=rollback_row.started_at,
        completed_at=rollback_row.completed_at,
        rolled_back_by=rollback_row.rolled_back_by,
        notes=rollback_row.notes,
    )


def serialize_rollback_list_item(
    db: Session,
    rollback_row: TenantModuleConfigurationRollback,
) -> TenantModuleConfigurationRollbackListItemOut:
    return TenantModuleConfigurationRollbackListItemOut(
        id=rollback_row.id,
        tenant_id=rollback_row.tenant_id,
        tenant_name=_resolve_tenant_name(db, rollback_row.tenant_id),
        module_key=rollback_row.module_key,
        module_title=_resolve_module_title(db, rollback_row.module_key),
        apply_id=rollback_row.apply_id,
        from_module_version=rollback_row.from_module_version,
        to_module_version=rollback_row.to_module_version,
        status=rollback_row.status,
        started_at=rollback_row.started_at,
        completed_at=rollback_row.completed_at,
    )


def list_tenant_rollbacks(db: Session, tenant_id: int) -> list[TenantModuleConfigurationRollbackOut]:
    return [serialize_rollback(db, row) for row in crud.list_rollbacks_for_tenant(db, tenant_id)]


def get_tenant_rollback(
    db: Session,
    *,
    tenant_id: int,
    rollback_id: int,
) -> TenantModuleConfigurationRollbackOut | None:
    row = crud.get_rollback(db, tenant_id=tenant_id, rollback_id=rollback_id)
    if row is None:
        return None
    return serialize_rollback(db, row)


def list_all_rollbacks(db: Session) -> list[TenantModuleConfigurationRollbackListItemOut]:
    return [serialize_rollback_list_item(db, row) for row in crud.list_all_rollbacks(db)]
