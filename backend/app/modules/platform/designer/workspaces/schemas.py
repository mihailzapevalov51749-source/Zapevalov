from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.platform.designer.object_types.menu_placements.schemas import (
    MenuPlacementInput,
)

WorkspaceStatus = Literal["active", "archived"]
WorkspaceTabType = Literal["object", "page", "link", "dashboard", "documents", "process", "group"]


class DesignerWorkspaceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    slug: str | None = None
    icon: str | None = None
    sort_order: int = 0
    status: WorkspaceStatus = "active"


class DesignerWorkspaceUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    slug: str | None = None
    icon: str | None = None
    sort_order: int = 0
    status: WorkspaceStatus = "active"


class DesignerWorkspaceRead(BaseModel):
    id: int
    tenant_id: int
    title: str
    description: str | None
    slug: str
    status: WorkspaceStatus
    icon: str | None
    sort_order: int
    navigation_item_id: int | None
    home_page_id: int | None
    publication_status: Literal["draft", "published"]
    route: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceMenuPlacementResult(BaseModel):
    navigation_item_id: int
    menu_scope: str
    parent_id: int | None
    sort_order: int
    is_visible: bool
    url: str | None = None


class WorkspaceMenuPlacementsRequest(BaseModel):
    placements: list[MenuPlacementInput] = Field(min_length=1)


class WorkspaceMenuPlacementsResponse(BaseModel):
    workspace_id: int
    placements: list[WorkspaceMenuPlacementResult]


class WorkspaceTabCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    slug: str | None = None
    icon: str | None = None
    sort_order: int = 0
    is_visible: bool = True
    tab_type: WorkspaceTabType = "object"
    object_type_id: UUID | None = None
    target_type: str | None = None
    target_id: str | None = None
    url: str | None = None
    open_in_new_tab: bool = False
    create_new_page: bool = False
    new_page_title: str | None = None


class WorkspaceTabUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    slug: str | None = None
    icon: str | None = None
    sort_order: int | None = None
    is_visible: bool | None = None
    object_type_id: UUID | None = None
    tab_type: WorkspaceTabType | None = None
    target_type: str | None = None
    target_id: str | None = None
    url: str | None = None
    open_in_new_tab: bool | None = None


class WorkspaceTabRead(BaseModel):
    id: int
    tenant_id: int
    workspace_id: int
    title: str
    description: str | None
    slug: str
    icon: str | None
    sort_order: int
    is_system: bool
    is_visible: bool
    slug_is_manual: bool
    tab_type: WorkspaceTabType
    object_type_id: UUID | None
    object_type_key: str | None = None
    object_type_name: str | None = None
    target_type: str | None = None
    target_id: str | None = None
    target_label: str | None = None
    url: str | None = None
    open_in_new_tab: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceTabsResponse(BaseModel):
    workspace_id: int
    tabs: list[WorkspaceTabRead]

