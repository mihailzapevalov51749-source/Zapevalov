from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.system_menu_settings.schemas import (
    DesignerSystemMenuSettingRead,
    DesignerSystemMenuSettingUpsert,
    DesignerSystemMenuSettingsBulkUpsert,
    DesignerSystemMenuSettingsMapRead,
)
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.platform.designer.system_menu_settings.service import (
    bulk_upsert_designer_system_menu_settings,
    list_designer_system_menu_settings,
    upsert_designer_system_menu_setting,
)

router = APIRouter(prefix="/system-menu-settings", tags=["Designer System Menu Settings"])


@router.get("", response_model=DesignerSystemMenuSettingsMapRead)
def get_designer_system_menu_settings(
    tenant_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(require_designer_user),
):
    settings = list_designer_system_menu_settings(db, tenant_id)
    return DesignerSystemMenuSettingsMapRead(settings=settings)


@router.put("/{item_key}", response_model=DesignerSystemMenuSettingRead)
def put_designer_system_menu_setting(
    tenant_id: int,
    item_key: str,
    payload: DesignerSystemMenuSettingUpsert,
    db: Session = Depends(get_db),
    _current_user=Depends(require_designer_user),
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
    _current_user=Depends(require_designer_user),
):
    settings = bulk_upsert_designer_system_menu_settings(
        db,
        tenant_id=tenant_id,
        settings=payload.settings,
    )
    db.commit()
    return DesignerSystemMenuSettingsMapRead(settings=settings)
