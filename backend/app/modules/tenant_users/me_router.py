"""Tenant-scoped current user profile API."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.platform.shared.dependencies import require_tenant
from app.modules.tenant_users.me_service import get_tenant_me_user, update_tenant_me_user
from app.modules.users.models import User

router = APIRouter(prefix="/tenants/{tenant_id}", tags=["Tenant User Me"])


@router.get("/users/me")
def tenant_get_me(
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_tenant_me_user(db, tenant_id=tenant_id, user=current_user)


@router.patch("/users/me")
def tenant_update_me(
    payload: dict,
    tenant_id: int = Depends(require_tenant),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_tenant_me_user(
        db,
        tenant_id=tenant_id,
        user=current_user,
        payload=payload,
    )
