"""Tenant update offers API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.platform_release import service
from app.modules.platform_release.schemas import (
    ApplyUpdateResult,
    TenantUpdateOfferOut,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/tenants/{tenant_id}/updates",
    tags=["Tenant Updates"],
)


@router.get("", response_model=list[TenantUpdateOfferOut])
def list_tenant_updates_endpoint(
    tenant_id: int = Depends(require_tenant_membership),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return service.list_tenant_updates(db, tenant_id, status=status)


@router.post("/{offer_id}/apply", response_model=ApplyUpdateResult)
def apply_tenant_update_endpoint(
    offer_id: int,
    tenant_id: int = Depends(require_tenant_membership),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.apply_tenant_update(
        db,
        tenant_id=tenant_id,
        offer_id=offer_id,
        actor=current_user,
    )


@router.post("/{offer_id}/skip", response_model=TenantUpdateOfferOut)
def skip_tenant_update_endpoint(
    offer_id: int,
    tenant_id: int = Depends(require_tenant_membership),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.skip_tenant_update(
        db,
        tenant_id=tenant_id,
        offer_id=offer_id,
        actor=current_user,
    )
