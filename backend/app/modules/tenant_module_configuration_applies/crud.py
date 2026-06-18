"""CRUD helpers for tenant module configuration applies."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_module_configuration_applies.models import TenantModuleConfigurationApply


def list_applies_for_tenant(db: Session, tenant_id: int) -> list[TenantModuleConfigurationApply]:
    return (
        db.query(TenantModuleConfigurationApply)
        .filter(TenantModuleConfigurationApply.tenant_id == tenant_id)
        .order_by(
            TenantModuleConfigurationApply.started_at.desc(),
            TenantModuleConfigurationApply.id.desc(),
        )
        .all()
    )


def list_all_applies(db: Session) -> list[TenantModuleConfigurationApply]:
    return (
        db.query(TenantModuleConfigurationApply)
        .order_by(
            TenantModuleConfigurationApply.started_at.desc(),
            TenantModuleConfigurationApply.id.desc(),
        )
        .all()
    )


def get_apply(
    db: Session,
    *,
    tenant_id: int,
    apply_id: int,
) -> TenantModuleConfigurationApply | None:
    return (
        db.query(TenantModuleConfigurationApply)
        .filter(
            TenantModuleConfigurationApply.tenant_id == tenant_id,
            TenantModuleConfigurationApply.id == apply_id,
        )
        .one_or_none()
    )


def get_apply_by_id(db: Session, apply_id: int) -> TenantModuleConfigurationApply | None:
    return (
        db.query(TenantModuleConfigurationApply)
        .filter(TenantModuleConfigurationApply.id == apply_id)
        .one_or_none()
    )
