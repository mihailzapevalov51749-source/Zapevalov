from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    require_runtime_actor,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    BridgeSessionJWTError,
    decode_bridge_session_token,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    optional_runtime_bearer,
    resolve_login_user,
)
from app.modules.platform.workspace_tabs import service
from app.modules.platform.workspace_tabs.schemas import (
    WorkspaceTabCreate,
    WorkspaceTabRead,
    WorkspaceTabReorder,
    WorkspaceTabUpdate,
)
from app.modules.users.models import User

TabIdPath = Annotated[UUID, Path(..., description="Идентификатор workspace tab")]

workspace_tabs_router = APIRouter(
    prefix="/workspace-tabs",
    tags=["workspace-tabs"],
)


@workspace_tabs_router.get("", response_model=list[WorkspaceTabRead])
def list_workspace_tabs(
    tenant_id: int | None = Query(
        default=None,
        description="Фильтр вкладок по tenant (portal id)",
    ),
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_runtime_bearer),
):
    if credentials is None or not str(credentials.credentials or "").strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = str(credentials.credentials).strip()
    try:
        bridge = decode_bridge_session_token(token)
        if tenant_id is not None and int(bridge.portal_id) != int(tenant_id):
            return []
        return []
    except BridgeSessionJWTError:
        pass

    user = resolve_login_user(db, token)
    return service.list_workspace_tabs(db, user, tenant_id=tenant_id)


@workspace_tabs_router.post(
    "",
    response_model=WorkspaceTabRead,
    status_code=status.HTTP_201_CREATED,
)
def create_workspace_tab(
    payload: WorkspaceTabCreate,
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    return service.create_workspace_tab(db, current_actor, payload)


@workspace_tabs_router.patch(
    "/{tab_id}",
    response_model=WorkspaceTabRead,
)
def update_workspace_tab(
    tab_id: TabIdPath,
    payload: WorkspaceTabUpdate,
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    return service.update_workspace_tab(db, current_actor, tab_id, payload)


@workspace_tabs_router.delete(
    "/{tab_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_workspace_tab(
    tab_id: TabIdPath,
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    service.delete_workspace_tab(db, current_actor, tab_id)


@workspace_tabs_router.post(
    "/reorder",
    response_model=list[WorkspaceTabRead],
)
def reorder_workspace_tabs(
    payload: WorkspaceTabReorder,
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    return service.reorder_workspace_tabs(db, current_actor, payload)


@workspace_tabs_router.post(
    "/{tab_id}/open",
    response_model=WorkspaceTabRead,
)
def open_workspace_tab(
    tab_id: TabIdPath,
    db: Session = Depends(get_db),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    return service.open_workspace_tab(db, current_actor, tab_id)
