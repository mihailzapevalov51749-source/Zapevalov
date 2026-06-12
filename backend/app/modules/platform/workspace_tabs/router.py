from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
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
    current_user: User = Depends(get_current_user),
):
    return service.list_workspace_tabs(db, current_user, tenant_id=tenant_id)


@workspace_tabs_router.post(
    "",
    response_model=WorkspaceTabRead,
    status_code=status.HTTP_201_CREATED,
)
def create_workspace_tab(
    payload: WorkspaceTabCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.create_workspace_tab(db, current_user, payload)


@workspace_tabs_router.patch(
    "/{tab_id}",
    response_model=WorkspaceTabRead,
)
def update_workspace_tab(
    tab_id: TabIdPath,
    payload: WorkspaceTabUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.update_workspace_tab(db, current_user, tab_id, payload)


@workspace_tabs_router.delete(
    "/{tab_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_workspace_tab(
    tab_id: TabIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service.delete_workspace_tab(db, current_user, tab_id)


@workspace_tabs_router.post(
    "/reorder",
    response_model=list[WorkspaceTabRead],
)
def reorder_workspace_tabs(
    payload: WorkspaceTabReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.reorder_workspace_tabs(db, current_user, payload)


@workspace_tabs_router.post(
    "/{tab_id}/open",
    response_model=WorkspaceTabRead,
)
def open_workspace_tab(
    tab_id: TabIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.open_workspace_tab(db, current_user, tab_id)
