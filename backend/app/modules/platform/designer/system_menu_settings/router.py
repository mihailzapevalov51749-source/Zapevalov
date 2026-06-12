from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.platform.designer.system_menu_settings.schemas import (
    DesignerSystemMenuSettingRead,
    DesignerSystemMenuSettingUpsert,
    DesignerSystemMenuSettingsBulkUpsert,
    DesignerSystemMenuSettingsMapRead,
)
from app.modules.platform.designer.system_menu_settings.service import (
    bulk_upsert_designer_system_menu_settings,
    list_designer_system_menu_settings,
    upsert_designer_system_menu_setting,
)
from app.modules.tenant_roles.access import can_access_designer
from app.modules.users.models import User

router = APIRouter(prefix="/system-menu-settings", tags=["Designer System Menu Settings"])


def _require_designer_menu_editor(current_user: User = Depends(get_current_user)) -> User:
    if not can_access_designer(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для изменения меню Studio",
        )
    return current_user


@router.get("", response_model=DesignerSystemMenuSettingsMapRead)
def get_designer_system_menu_settings(
    tenant_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    if not can_access_designer(_current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра меню Studio",
        )

    settings = list_designer_system_menu_settings(db, tenant_id)
    return DesignerSystemMenuSettingsMapRead(settings=settings)


@router.put("/{item_key}", response_model=DesignerSystemMenuSettingRead)
def put_designer_system_menu_setting(
    tenant_id: int,
    item_key: str,
    payload: DesignerSystemMenuSettingUpsert,
    db: Session = Depends(get_db),
    _current_user: User = Depends(_require_designer_menu_editor),
):
    try:
        result = upsert_designer_system_menu_setting(
            db,
            tenant_id=tenant_id,
            item_key=item_key,
            payload=payload,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    db.commit()
    return result


@router.put("", response_model=DesignerSystemMenuSettingsMapRead)
def put_designer_system_menu_settings_bulk(
    tenant_id: int,
    payload: DesignerSystemMenuSettingsBulkUpsert,
    db: Session = Depends(get_db),
    _current_user: User = Depends(_require_designer_menu_editor),
):
    settings = bulk_upsert_designer_system_menu_settings(
        db,
        tenant_id=tenant_id,
        settings=payload.settings,
    )
    db.commit()
    return DesignerSystemMenuSettingsMapRead(settings=settings)
