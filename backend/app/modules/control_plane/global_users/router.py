from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.control_plane.global_users.schemas import (
    GlobalUserActionResponse,
    GlobalUserListItemRead,
    GlobalUserRead,
    GlobalUserStatusUpdate,
)
from app.modules.control_plane.global_users.service import (
    get_global_user,
    list_global_users,
    reset_global_user_password,
    update_global_user_status,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/control-plane/global-users",
    tags=["Control Plane — Global Users"],
)


@router.get("", response_model=list[GlobalUserListItemRead])
def list_global_users_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return list_global_users(db)


@router.get("/{user_id}", response_model=GlobalUserRead)
def get_global_user_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return get_global_user(db, user_id)


@router.patch("/{user_id}/status", response_model=GlobalUserRead)
def update_global_user_status_endpoint(
    user_id: int,
    payload: GlobalUserStatusUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    result = update_global_user_status(db, user_id, is_active=payload.is_active)
    db.commit()
    return result


@router.post("/{user_id}/reset-password", response_model=GlobalUserActionResponse)
def reset_global_user_password_endpoint(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    result = reset_global_user_password(db, user_id)
    db.commit()
    return result
