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
    sort_order: int = 0
    is_visible: bool = True

    icon: Optional[str] = None
    icon_type: Optional[str] = None
    icon_file_url: Optional[str] = None

    color: Optional[str] = None
    is_bold: bool = False
    is_italic: bool = False


class NavigationItemUpdate(BaseModel):
    parent_id: Optional[int] = None
    title: Optional[str] = None
    page_id: Optional[int] = None
    library_id: Optional[int] = None
    url: Optional[str] = None
    sort_order: Optional[int] = None
    is_visible: Optional[bool] = None

    icon: Optional[str] = None
    icon_type: Optional[str] = None
    icon_file_url: Optional[str] = None

    color: Optional[str] = None
    is_bold: Optional[bool] = None
    is_italic: Optional[bool] = None


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

    sort_order: int
    is_visible: bool

    icon: Optional[str] = None
    icon_type: Optional[str] = None
    icon_file_url: Optional[str] = None

    color: Optional[str] = None
    is_bold: bool
    is_italic: bool

    class Config:
        from_attributes = True


class NavigationTreeItem(NavigationItemResponse):
    children: List["NavigationTreeItem"] = []


NavigationTreeItem.model_rebuild()