from pydantic import BaseModel
from typing import Optional, List


class NavigationItemCreate(BaseModel):
    portal_id: int
    parent_id: Optional[int] = None
    type: str
    title: str
    page_id: Optional[int] = None
    library_id: Optional[int] = None
    url: Optional[str] = None
    route: Optional[str] = None
    path: Optional[str] = None
    sort_order: int = 0
    is_visible: bool = True

    icon: Optional[str] = None
    icon_type: Optional[str] = None
    icon_file_url: Optional[str] = None

    color: Optional[str] = None
    is_bold: bool = False
    is_italic: bool = False
    menu_scope: Optional[str] = None
    scope: Optional[str] = None
    mode: Optional[str] = None
    context: Optional[str] = None
    system_key: Optional[str] = None
    is_system: Optional[bool] = None
    is_protected: Optional[bool] = None


class NavigationItemUpdate(BaseModel):
    parent_id: Optional[int] = None
    title: Optional[str] = None
    page_id: Optional[int] = None
    library_id: Optional[int] = None
    url: Optional[str] = None
    route: Optional[str] = None
    path: Optional[str] = None
    sort_order: Optional[int] = None
    is_visible: Optional[bool] = None

    icon: Optional[str] = None
    icon_type: Optional[str] = None
    icon_file_url: Optional[str] = None

    color: Optional[str] = None
    is_bold: Optional[bool] = None
    is_italic: Optional[bool] = None
    system_key: Optional[str] = None
    is_system: Optional[bool] = None
    is_protected: Optional[bool] = None


class NavigationItemMove(BaseModel):
    id: int
    parent_id: Optional[int] = None
    sort_order: int


class NavigationItemResponse(BaseModel):
    id: int
    portal_id: int
    parent_id: Optional[int] = None
    type: str
    title: str

    page_id: Optional[int] = None
    library_id: Optional[int] = None
    url: Optional[str] = None
    route: Optional[str] = None
    path: Optional[str] = None

    sort_order: int
    is_visible: bool

    icon: Optional[str] = None
    icon_type: Optional[str] = None
    icon_file_url: Optional[str] = None

    color: Optional[str] = None
    is_bold: bool
    is_italic: bool
    menu_scope: str
    system_key: Optional[str] = None
    is_system: bool
    is_protected: bool

    class Config:
        from_attributes = True


class NavigationTreeItem(NavigationItemResponse):
    children: List["NavigationTreeItem"] = []


NavigationTreeItem.model_rebuild()