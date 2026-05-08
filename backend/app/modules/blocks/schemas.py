from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class BlockCreate(BaseModel):
    section_id: int
    type: str
    title: Optional[str] = None
    description: Optional[str] = None
    sort_order: int = 0
    is_visible: bool = True
    status: str = "draft"
    settings: dict[str, Any] = {}
    content: dict[str, Any] = {}


class BlockUpdate(BaseModel):
    section_id: Optional[int] = None
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    is_visible: Optional[bool] = None
    status: Optional[str] = None
    settings: Optional[dict[str, Any]] = None
    content: Optional[dict[str, Any]] = None


class BlockMove(BaseModel):
    id: int
    section_id: int
    sort_order: int


class BlockResponse(BaseModel):
    id: int
    section_id: int
    type: str
    title: Optional[str] = None
    description: Optional[str] = None
    sort_order: int
    is_visible: bool
    status: str
    settings: dict[str, Any] = {}
    content: dict[str, Any] = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True