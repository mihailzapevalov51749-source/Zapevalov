from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.users.bootstrap_owner_service import has_real_platform_owner, is_bootstrap_owner
from app.modules.control_plane.platform_profile.owner_service import (
    create_first_platform_owner,
    upsert_platform_owner,
)
from app.modules.control_plane.platform_profile.schemas import (
    PlatformOwnerFirstSetupResponse,
    PlatformOwnerRead,
    PlatformOwnerUpsert,
    PlatformSettingsGeneralUpdate,
    PlatformSettingsRead,
)
from app.modules.control_plane.platform_profile.service import (
    get_or_create_platform_settings,
    get_platform_settings,
    update_platform_settings_general,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/control-plane/platform-profile",
    tags=["Control Plane — Platform Profile"],
)


@router.get("/settings", response_model=PlatformSettingsRead)
def get_platform_profile_settings_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return get_platform_settings(db)


@router.patch("/settings", response_model=PlatformSettingsRead)
def patch_platform_profile_settings_endpoint(
    payload: PlatformSettingsGeneralUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    result = update_platform_settings_general(db, payload, current_user=current_user)
    db.commit()
    return result


@router.put("/owner", response_model=PlatformOwnerRead)
def upsert_platform_owner_endpoint(
    payload: PlatformOwnerUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    if is_bootstrap_owner(current_user):
        raise HTTPException(
            status_code=403,
            detail="Используйте мастер первичной настройки владельца платформы",
        )

    row = get_or_create_platform_settings(db)
    result = upsert_platform_owner(db, row, payload, current_user=current_user)
    db.commit()
    return result


@router.post("/owner/first-setup", response_model=PlatformOwnerFirstSetupResponse)
def create_first_platform_owner_endpoint(
    payload: PlatformOwnerUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if has_real_platform_owner(db):
        raise HTTPException(status_code=409, detail="Владелец платформы уже назначен")

    row = get_or_create_platform_settings(db)
    result = create_first_platform_owner(db, row, payload, current_user=current_user)
    db.commit()
    return result
