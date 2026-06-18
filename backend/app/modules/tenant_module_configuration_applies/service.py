"""Service layer for tenant module configuration applies."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules.models import PlatformModule
from app.modules.portals.models import Portal
from app.modules.tenant_module_configuration_applies import crud
from app.modules.tenant_module_configuration_applies.models import TenantModuleConfigurationApply
from app.modules.tenant_module_configuration_applies.schemas import (
    TenantModuleConfigurationApplyListItemOut,
    TenantModuleConfigurationApplyOut,
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


def serialize_apply(db: Session, apply_row: TenantModuleConfigurationApply) -> TenantModuleConfigurationApplyOut:
    return TenantModuleConfigurationApplyOut(
        id=apply_row.id,
        tenant_id=apply_row.tenant_id,
        tenant_name=_resolve_tenant_name(db, apply_row.tenant_id),
        module_key=apply_row.module_key,
        module_title=_resolve_module_title(db, apply_row.module_key),
        offer_id=apply_row.offer_id,
        preview_id=apply_row.preview_id,
        diff_id=apply_row.diff_id,
        from_module_version=apply_row.from_module_version,
        to_module_version=apply_row.to_module_version,
        from_config_version=apply_row.from_config_version,
        to_config_version=apply_row.to_config_version,
        status=apply_row.status,
        started_at=apply_row.started_at,
        completed_at=apply_row.completed_at,
        applied_by=apply_row.applied_by,
        rollback_id=apply_row.rollback_id,
        notes=apply_row.notes,
    )


def serialize_apply_list_item(
    db: Session,
    apply_row: TenantModuleConfigurationApply,
) -> TenantModuleConfigurationApplyListItemOut:
    return TenantModuleConfigurationApplyListItemOut(
        id=apply_row.id,
        tenant_id=apply_row.tenant_id,
        tenant_name=_resolve_tenant_name(db, apply_row.tenant_id),
        module_key=apply_row.module_key,
        module_title=_resolve_module_title(db, apply_row.module_key),
        from_module_version=apply_row.from_module_version,
        to_module_version=apply_row.to_module_version,
        status=apply_row.status,
        started_at=apply_row.started_at,
        completed_at=apply_row.completed_at,
    )


def list_tenant_applies(db: Session, tenant_id: int) -> list[TenantModuleConfigurationApplyOut]:
    return [serialize_apply(db, row) for row in crud.list_applies_for_tenant(db, tenant_id)]


def get_tenant_apply(
    db: Session,
    *,
    tenant_id: int,
    apply_id: int,
) -> TenantModuleConfigurationApplyOut | None:
    row = crud.get_apply(db, tenant_id=tenant_id, apply_id=apply_id)
    if row is None:
        return None
    return serialize_apply(db, row)


def list_all_applies(db: Session) -> list[TenantModuleConfigurationApplyListItemOut]:
    return [serialize_apply_list_item(db, row) for row in crud.list_all_applies(db)]
