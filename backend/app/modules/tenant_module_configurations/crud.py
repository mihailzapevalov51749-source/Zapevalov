"""CRUD helpers for tenant module configurations."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_module_configurations.models import (
    TenantModuleConfigSnapshot,
    TenantModuleConfiguration,
)


def list_configurations_for_tenant(
    db: Session,
    tenant_id: int,
) -> list[TenantModuleConfiguration]:
    return (
        db.query(TenantModuleConfiguration)
        .filter(TenantModuleConfiguration.tenant_id == tenant_id)
        .order_by(TenantModuleConfiguration.module_key.asc())
        .all()
    )


def list_all_configurations(db: Session) -> list[TenantModuleConfiguration]:
    return (
        db.query(TenantModuleConfiguration)
        .order_by(
            TenantModuleConfiguration.tenant_id.asc(),
            TenantModuleConfiguration.module_key.asc(),
        )
        .all()
    )


def get_configuration(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> TenantModuleConfiguration | None:
    return (
        db.query(TenantModuleConfiguration)
        .filter(
            TenantModuleConfiguration.tenant_id == tenant_id,
            TenantModuleConfiguration.module_key == module_key,
        )
        .one_or_none()
    )


def list_snapshots_for_module(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> list[TenantModuleConfigSnapshot]:
    return (
        db.query(TenantModuleConfigSnapshot)
        .filter(
            TenantModuleConfigSnapshot.tenant_id == tenant_id,
            TenantModuleConfigSnapshot.module_key == module_key,
        )
        .order_by(TenantModuleConfigSnapshot.created_at.desc(), TenantModuleConfigSnapshot.id.desc())
        .all()
    )
