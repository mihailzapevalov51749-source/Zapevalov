from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.workspaces.schemas import (
    DesignerWorkspaceCreate,
    DesignerWorkspaceRead,
    DesignerWorkspaceUpdate,
    WorkspaceMenuPlacementsRequest,
    WorkspaceMenuPlacementsResponse,
    WorkspaceTabCreate,
    WorkspaceTabRead,
    WorkspaceTabsResponse,
    WorkspaceTabUpdate,
)
from app.modules.platform.designer.workspaces.service import (
    archive_workspace,
    create_workspace,
    create_workspace_tab,
    delete_workspace,
    delete_workspace_tab,
    ensure_workspace_home_page,
    ensure_workspace_tabs,
    get_workspace_by_slug,
    list_workspace_tabs,
    list_workspaces,
    publish_workspace,
    publish_workspace_menu_placements,
    unpublish_workspace,
    list_workspace_placements,
    update_workspace,
    update_workspace_tab,
)


router = APIRouter(tags=["Designer Workspaces"])


def _to_read_model(workspace) -> DesignerWorkspaceRead:
    publication_status = "published" if workspace.navigation_item_id is not None else "draft"
    return DesignerWorkspaceRead(
        id=workspace.id,
        tenant_id=workspace.tenant_id,
        title=workspace.title,
        description=workspace.description,
        slug=workspace.slug,
        status=workspace.status,
        icon=workspace.icon,
        sort_order=workspace.sort_order,
        navigation_item_id=workspace.navigation_item_id,
        home_page_id=workspace.home_page_id,
        publication_status=publication_status,
        route=f"/designer/tenant/{workspace.tenant_id}/workspaces/{workspace.slug}",
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
    )


@router.get("/workspaces", response_model=list[DesignerWorkspaceRead])
def get_designer_workspaces(
    tenant_id: int,
    db: Session = Depends(get_db),
):
    return [_to_read_model(item) for item in list_workspaces(db, tenant_id=tenant_id)]


@router.post("/workspaces", response_model=DesignerWorkspaceRead)
def post_designer_workspace(
    tenant_id: int,
    payload: DesignerWorkspaceCreate,
    db: Session = Depends(get_db),
):
    workspace = create_workspace(db, tenant_id=tenant_id, payload=payload)
    return _to_read_model(workspace)


@router.get("/workspaces/{slug}", response_model=DesignerWorkspaceRead)
def get_designer_workspace(
    tenant_id: int,
    slug: str,
    db: Session = Depends(get_db),
):
    workspace = get_workspace_by_slug(db, tenant_id=tenant_id, slug=slug)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Рабочее пространство не найдено")
    return _to_read_model(workspace)


@router.post("/workspaces/{workspace_id}/publish", response_model=DesignerWorkspaceRead)
def post_designer_workspace_publish(
    tenant_id: int,
    workspace_id: int,
    db: Session = Depends(get_db),
):
    workspace = publish_workspace(db, tenant_id=tenant_id, workspace_id=workspace_id)
    return _to_read_model(workspace)


@router.post("/workspaces/{workspace_id}/menu-placements", response_model=WorkspaceMenuPlacementsResponse)
def post_designer_workspace_menu_placements(
    tenant_id: int,
    workspace_id: int,
    payload: WorkspaceMenuPlacementsRequest,
    db: Session = Depends(get_db),
):
    placements = publish_workspace_menu_placements(
        db,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        placements=payload.placements,
    )
    return WorkspaceMenuPlacementsResponse(workspace_id=workspace_id, placements=placements)


@router.get("/workspaces/{workspace_id}/menu-placements", response_model=WorkspaceMenuPlacementsResponse)
def get_designer_workspace_menu_placements(
    tenant_id: int,
    workspace_id: int,
    db: Session = Depends(get_db),
):
    placements = list_workspace_placements(db, tenant_id=tenant_id, workspace_id=workspace_id)
    payload = [
        {
            "navigation_item_id": item.id,
            "menu_scope": item.menu_scope,
            "parent_id": item.parent_id,
            "sort_order": item.sort_order,
            "is_visible": item.is_visible,
            "url": item.url,
        }
        for item in placements
    ]
    return WorkspaceMenuPlacementsResponse(workspace_id=workspace_id, placements=payload)


@router.post("/workspaces/{workspace_id}/unpublish", response_model=DesignerWorkspaceRead)
def post_designer_workspace_unpublish(
    tenant_id: int,
    workspace_id: int,
    db: Session = Depends(get_db),
):
    workspace = unpublish_workspace(db, tenant_id=tenant_id, workspace_id=workspace_id)
    return _to_read_model(workspace)


@router.post("/workspaces/{workspace_id}/archive", response_model=DesignerWorkspaceRead)
def post_designer_workspace_archive(
    tenant_id: int,
    workspace_id: int,
    db: Session = Depends(get_db),
):
    workspace = archive_workspace(db, tenant_id=tenant_id, workspace_id=workspace_id)
    return _to_read_model(workspace)


@router.post("/workspaces/{workspace_id}/ensure-home-page", response_model=DesignerWorkspaceRead)
def post_designer_workspace_ensure_home_page(
    tenant_id: int,
    workspace_id: int,
    db: Session = Depends(get_db),
):
    workspace = ensure_workspace_home_page(db, tenant_id=tenant_id, workspace_id=workspace_id)
    return _to_read_model(workspace)


@router.post("/workspaces/{workspace_id}/ensure-tabs", response_model=WorkspaceTabsResponse)
def post_designer_workspace_ensure_tabs(
    tenant_id: int,
    workspace_id: int,
    db: Session = Depends(get_db),
):
    tabs = ensure_workspace_tabs(db, tenant_id=tenant_id, workspace_id=workspace_id)
    return WorkspaceTabsResponse(workspace_id=workspace_id, tabs=tabs)


@router.get("/workspaces/{workspace_id}/tabs", response_model=WorkspaceTabsResponse)
def get_designer_workspace_tabs(
    tenant_id: int,
    workspace_id: int,
    db: Session = Depends(get_db),
):
    tabs = list_workspace_tabs(db, tenant_id=tenant_id, workspace_id=workspace_id)
    return WorkspaceTabsResponse(workspace_id=workspace_id, tabs=tabs)


@router.post("/workspaces/{workspace_id}/tabs", response_model=WorkspaceTabRead)
def post_designer_workspace_tab(
    tenant_id: int,
    workspace_id: int,
    payload: WorkspaceTabCreate,
    db: Session = Depends(get_db),
):
    return create_workspace_tab(
        db,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        payload=payload,
    )


@router.patch("/workspaces/{workspace_id}/tabs/{tab_id}", response_model=WorkspaceTabRead)
def patch_designer_workspace_tab(
    tenant_id: int,
    workspace_id: int,
    tab_id: int,
    payload: WorkspaceTabUpdate,
    db: Session = Depends(get_db),
):
    return update_workspace_tab(
        db,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        tab_id=tab_id,
        payload=payload,
    )


@router.delete("/workspaces/{workspace_id}/tabs/{tab_id}")
def delete_designer_workspace_tab(
    tenant_id: int,
    workspace_id: int,
    tab_id: int,
    db: Session = Depends(get_db),
):
    delete_workspace_tab(
        db,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        tab_id=tab_id,
    )
    return {"ok": True}


@router.patch("/workspaces/{workspace_id}", response_model=DesignerWorkspaceRead)
def patch_designer_workspace(
    tenant_id: int,
    workspace_id: int,
    payload: DesignerWorkspaceUpdate,
    db: Session = Depends(get_db),
):
    workspace = update_workspace(
        db,
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        payload=payload,
    )
    return _to_read_model(workspace)


@router.delete("/workspaces/{workspace_id}")
def delete_designer_workspace(
    tenant_id: int,
    workspace_id: int,
    db: Session = Depends(get_db),
):
    delete_workspace(db, tenant_id=tenant_id, workspace_id=workspace_id)
    return {"ok": True}

