from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ChecklistEntityRef(BaseModel):
    type: str = Field(..., min_length=1, max_length=80)
    id: str = Field(..., min_length=1, max_length=120)


class ChecklistAuthorOut(BaseModel):
    id: int | None = None
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    avatar_settings: dict[str, Any] | None = None

    class Config:
        from_attributes = True


class ChecklistItemBase(BaseModel):
    title: str = Field(..., min_length=1)
    is_completed: bool = False
    position: int = 0


class ChecklistItemCreate(BaseModel):
    entity: ChecklistEntityRef
    title: str = Field(..., min_length=1)
    position: int | None = None


class ChecklistItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    is_completed: bool | None = None
    position: int | None = None


class ChecklistItemsReorder(BaseModel):
    ordered_ids: list[int] = Field(default_factory=list)


class ChecklistItemOut(BaseModel):
    id: int
    entity_type: str
    entity_id: str
    title: str
    is_completed: bool
    position: int
    created_by_id: int | None = None
    completed_by_id: int | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
    created_by: ChecklistAuthorOut | None = None
    completed_by: ChecklistAuthorOut | None = None

    class Config:
        from_attributes = True


class ChecklistListOut(BaseModel):
    entity: ChecklistEntityRef
    items: list[ChecklistItemOut]
    total: int
    completed: int
    progress: float