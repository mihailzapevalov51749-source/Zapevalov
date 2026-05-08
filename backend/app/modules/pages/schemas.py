from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.modules.sections.schemas import SectionResponse
from app.modules.blocks.schemas import BlockResponse


class PageCreate(BaseModel):
    portal_id: int
    title: str
    description: Optional[str] = None
    status: str = "draft"
    is_home: bool = False
    is_visible: bool = True
    sort_order: int = 0


class PageUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    is_home: Optional[bool] = None
    is_visible: Optional[bool] = None
    sort_order: Optional[int] = None


class PageResponse(BaseModel):
    id: int
    portal_id: int
    title: str
    description: Optional[str] = None
    status: str
    is_home: bool
    is_visible: bool
    sort_order: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ===== НОВОЕ (для full page) =====

class SectionWithBlocks(BaseModel):
    section: SectionResponse
    blocks: List[BlockResponse]


class PageFullResponse(BaseModel):
    page: PageResponse
    sections: List[SectionWithBlocks]