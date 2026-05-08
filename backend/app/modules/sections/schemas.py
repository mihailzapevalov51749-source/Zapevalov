from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class SectionCreate(BaseModel):
    page_id: int
    title: str
    description: Optional[str] = None
    layout: str = "one_column"
    sort_order: int = 0
    is_visible: bool = True
    settings: dict[str, Any] = {}


class SectionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[str] = None
    sort_order: Optional[int] = None
    is_visible: Optional[bool] = None
    settings: Optional[dict[str, Any]] = None


class SectionMove(BaseModel):
    id: int
    sort_order: int


class SectionResponse(BaseModel):
    id: int
    page_id: int
    title: str
    description: Optional[str] = None
    layout: str
    sort_order: int
    is_visible: bool
    settings: dict[str, Any] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True