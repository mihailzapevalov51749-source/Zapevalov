"""Tenant administration API (users, roles)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.tenant_users.administration_service import (
    create_tenant_user,
    delete_tenant_user,
    dismiss_tenant_user,
    list_tenant_system_roles,
    list_tenant_users,
    lookup_tenant_user_email,
    restore_tenant_user,
    send_tenant_user_invite,
    update_tenant_user,
)
from app.modules.tenant_users.dependencies import require_tenant_users_manager
from app.modules.users.models import User

router = APIRouter(prefix="/administration", tags=["Tenant Administration"])


@router.get("/users")
def tenant_list_users(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_users_manager),
):
    return list_tenant_users(db, tenant_id)


@router.get("/roles")
def tenant_list_roles(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_users_manager),
):
    roles = list_tenant_system_roles(db)
    return [
        {
            "id": role.id,
            "name": role.name,
            "description": role.description,
        }
        for role in roles
    ]


@router.post("/users/lookup-email")
def tenant_lookup_user_email(
    tenant_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_users_manager),
):
    return lookup_tenant_user_email(
        db,
        tenant_id=tenant_id,
        email=str(payload.get("email") or ""),
    )


@router.post("/users")
def tenant_create_user(
    tenant_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_users_manager),
):
    user, temp_password = create_tenant_user(db, tenant_id=tenant_id, payload=payload)
    if temp_password:
        user["temp_password"] = temp_password
    return user


@router.patch("/users/{user_id}")
def tenant_update_user(
    tenant_id: int,
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_users_manager),
):
    return update_tenant_user(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        payload=payload,
    )


@router.delete("/users/{user_id}")
def tenant_delete_user(
    tenant_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_users_manager),
):
    return dismiss_tenant_user(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        current_user=current_user,
    )


@router.post("/users/{user_id}/restore")
def tenant_restore_user(
    tenant_id: int,
    user_id: int,
    payload: dict | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_users_manager),
):
    role_id = (payload or {}).get("role_id")
    return restore_tenant_user(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        role_id=role_id,
    )


@router.post("/users/{user_id}/invite")
def tenant_send_user_invite(
    tenant_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant_users_manager),
):
    return send_tenant_user_invite(db, tenant_id=tenant_id, user_id=user_id)
