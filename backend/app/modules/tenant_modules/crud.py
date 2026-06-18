"""CRUD helpers for tenant modules registry."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_modules.models import TenantModule


def list_tenant_modules(db: Session, tenant_id: int) -> list[TenantModule]:
    return (
        db.query(TenantModule)
        .filter(TenantModule.tenant_id == tenant_id)
        .order_by(TenantModule.module_key.asc())
        .all()
    )


def get_tenant_module(
    db: Session,
    *,
    tenant_id: int,
    module_key: str,
) -> TenantModule | None:
    normalized_key = str(module_key or "").strip()
    if not normalized_key:
        return None

    return (
        db.query(TenantModule)
        .filter(
            TenantModule.tenant_id == tenant_id,
            TenantModule.module_key == normalized_key,
        )
        .one_or_none()
    )
