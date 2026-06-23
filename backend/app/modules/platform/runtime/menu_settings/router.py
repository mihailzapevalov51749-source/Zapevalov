from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    require_runtime_actor,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    optional_runtime_bearer,
    resolve_login_user,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_read_access import (
    is_bridge_session_token,
    require_tenant_runtime_read,
)
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.platform.runtime.menu_settings import service
from app.modules.platform.runtime.menu_settings.schemas import (
    TenantRuntimeMenuSettingRead,
    TenantRuntimeMenuSettingUpsert,
    TenantRuntimeMenuSettingsBulkUpsert,
    TenantRuntimeMenuSettingsMapRead,
    UserMenuPreferenceRead,
    UserMenuPreferenceUpsert,
    UserMenuPreferencesBulkUpsert,
    UserMenuPreferencesMapRead,
)
from app.modules.tenant_management.dependencies import require_dev_direct_structure_write_tenant
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.users.models import User

TenantIdPath = Annotated[int, Path(..., ge=1)]

menu_settings_router = APIRouter(
    prefix="/menu-settings",
    tags=["runtime-menu-settings"],
)


def _require_tenant_menu_editor(
    current_actor=Depends(require_designer_user),
):
    return current_actor


@menu_settings_router.get(
    "/tenants/{tenant_id}",
    response_model=TenantRuntimeMenuSettingsMapRead,
)
def get_tenant_runtime_menu_settings(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_runtime_read),
):
    settings = service.list_tenant_runtime_menu_settings(db, tenant_id)
    return TenantRuntimeMenuSettingsMapRead(settings=settings)


@menu_settings_router.put(
    "/tenants/{tenant_id}/{item_key}",
    response_model=TenantRuntimeMenuSettingRead,
)
def put_tenant_runtime_menu_setting(
    tenant_id: TenantIdPath,
    item_key: str,
    payload: TenantRuntimeMenuSettingUpsert,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_dev_direct_structure_write_tenant),
    _current_user: User = Depends(_require_tenant_menu_editor),
):
    try:
        result = service.upsert_tenant_runtime_menu_setting(
            db,
            tenant_id=tenant_id,
            item_key=item_key,
            payload=payload,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    db.commit()
    return result


@menu_settings_router.put(
    "/tenants/{tenant_id}",
    response_model=TenantRuntimeMenuSettingsMapRead,
)
def put_tenant_runtime_menu_settings_bulk(
    tenant_id: TenantIdPath,
    payload: TenantRuntimeMenuSettingsBulkUpsert,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_dev_direct_structure_write_tenant),
    _current_user: User = Depends(_require_tenant_menu_editor),
):
    settings = service.bulk_upsert_tenant_runtime_menu_settings(
        db,
        tenant_id=tenant_id,
        settings=payload.settings,
    )
    db.commit()
    return TenantRuntimeMenuSettingsMapRead(settings=settings)


user_menu_preferences_router = APIRouter(
    prefix="/menu-preferences",
    tags=["runtime-menu-preferences"],
)


@user_menu_preferences_router.get(
    "/tenants/{tenant_id}",
    response_model=UserMenuPreferencesMapRead,
)
def get_user_menu_preferences(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_runtime_bearer),
    _tenant: int = Depends(require_tenant_runtime_read),
):
    token = str(credentials.credentials or "").strip() if credentials else ""
    if token and is_bridge_session_token(token):
        return UserMenuPreferencesMapRead(preferences={})

    user = resolve_login_user(db, token)
    preferences = service.list_user_menu_preferences(
        db,
        tenant_id=tenant_id,
        user_id=service.actor_user_id(user),
    )
    return UserMenuPreferencesMapRead(preferences=preferences)


@user_menu_preferences_router.put(
    "/tenants/{tenant_id}/{item_key}",
    response_model=UserMenuPreferenceRead,
)
def put_user_menu_preference(
    tenant_id: TenantIdPath,
    item_key: str,
    payload: UserMenuPreferenceUpsert,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    try:
        result = service.upsert_user_menu_preference(
            db,
            tenant_id=tenant_id,
            user_id=service.actor_user_id(current_actor),
            item_key=item_key,
            payload=payload,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    db.commit()
    return result


@user_menu_preferences_router.put(
    "/tenants/{tenant_id}",
    response_model=UserMenuPreferencesMapRead,
)
def put_user_menu_preferences_bulk(
    tenant_id: TenantIdPath,
    payload: UserMenuPreferencesBulkUpsert,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    preferences = service.bulk_upsert_user_menu_preferences(
        db,
        tenant_id=tenant_id,
        user_id=service.actor_user_id(current_actor),
        preferences=payload.preferences,
    )
    db.commit()
    return UserMenuPreferencesMapRead(preferences=preferences)


@user_menu_preferences_router.delete(
    "/tenants/{tenant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_user_menu_preferences(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    service.reset_user_menu_preferences(
        db,
        tenant_id=tenant_id,
        user_id=service.actor_user_id(current_actor),
    )
    db.commit()
