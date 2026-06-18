"""CRUD helpers for tenant module configuration rollbacks."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_module_configuration_rollbacks.models import TenantModuleConfigurationRollback


def list_rollbacks_for_tenant(db: Session, tenant_id: int) -> list[TenantModuleConfigurationRollback]:
    return (
        db.query(TenantModuleConfigurationRollback)
        .filter(TenantModuleConfigurationRollback.tenant_id == tenant_id)
        .order_by(
            TenantModuleConfigurationRollback.started_at.desc(),
            TenantModuleConfigurationRollback.id.desc(),
        )
        .all()
    )


def list_all_rollbacks(db: Session) -> list[TenantModuleConfigurationRollback]:
    return (
        db.query(TenantModuleConfigurationRollback)
        .order_by(
            TenantModuleConfigurationRollback.started_at.desc(),
            TenantModuleConfigurationRollback.id.desc(),
        )
        .all()
    )


def get_rollback(
    db: Session,
    *,
    tenant_id: int,
    rollback_id: int,
) -> TenantModuleConfigurationRollback | None:
    return (
        db.query(TenantModuleConfigurationRollback)
        .filter(
            TenantModuleConfigurationRollback.tenant_id == tenant_id,
            TenantModuleConfigurationRollback.id == rollback_id,
        )
        .one_or_none()
    )


def get_rollback_for_apply(
    db: Session,
    *,
    tenant_id: int,
    apply_id: int,
) -> TenantModuleConfigurationRollback | None:
    return (
        db.query(TenantModuleConfigurationRollback)
        .filter(
            TenantModuleConfigurationRollback.tenant_id == tenant_id,
            TenantModuleConfigurationRollback.apply_id == apply_id,
        )
        .order_by(TenantModuleConfigurationRollback.id.desc())
        .first()
    )
