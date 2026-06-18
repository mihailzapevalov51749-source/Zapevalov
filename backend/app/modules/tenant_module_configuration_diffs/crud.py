"""CRUD helpers for tenant module configuration diffs."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_module_configuration_diffs.models import TenantModuleConfigurationDiff


def list_all_diffs(db: Session) -> list[TenantModuleConfigurationDiff]:
    return (
        db.query(TenantModuleConfigurationDiff)
        .order_by(
            TenantModuleConfigurationDiff.generated_at.desc(),
            TenantModuleConfigurationDiff.id.desc(),
        )
        .all()
    )


def list_diffs_for_tenant(db: Session, tenant_id: int) -> list[TenantModuleConfigurationDiff]:
    return (
        db.query(TenantModuleConfigurationDiff)
        .filter(TenantModuleConfigurationDiff.tenant_id == tenant_id)
        .order_by(
            TenantModuleConfigurationDiff.generated_at.desc(),
            TenantModuleConfigurationDiff.id.desc(),
        )
        .all()
    )


def get_latest_diff_for_offer(
    db: Session,
    *,
    tenant_id: int,
    offer_id: int,
) -> TenantModuleConfigurationDiff | None:
    return (
        db.query(TenantModuleConfigurationDiff)
        .filter(
            TenantModuleConfigurationDiff.tenant_id == tenant_id,
            TenantModuleConfigurationDiff.offer_id == offer_id,
        )
        .order_by(
            TenantModuleConfigurationDiff.generated_at.desc(),
            TenantModuleConfigurationDiff.id.desc(),
        )
        .first()
    )


def get_latest_diff_for_module(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> TenantModuleConfigurationDiff | None:
    return (
        db.query(TenantModuleConfigurationDiff)
        .filter(
            TenantModuleConfigurationDiff.tenant_id == tenant_id,
            TenantModuleConfigurationDiff.module_key == module_key,
        )
        .order_by(
            TenantModuleConfigurationDiff.generated_at.desc(),
            TenantModuleConfigurationDiff.id.desc(),
        )
        .first()
    )


def get_diff_by_id(
    db: Session,
    *,
    diff_id: int,
    tenant_id: int | None = None,
) -> TenantModuleConfigurationDiff | None:
    query = db.query(TenantModuleConfigurationDiff).filter(
        TenantModuleConfigurationDiff.id == diff_id
    )
    if tenant_id is not None:
        query = query.filter(TenantModuleConfigurationDiff.tenant_id == tenant_id)
    return query.one_or_none()
