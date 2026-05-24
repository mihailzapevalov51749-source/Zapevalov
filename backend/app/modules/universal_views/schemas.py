from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


UniversalViewType = Literal[
    "table",
    "tree",
    "composite",
    "cards",
    "kanban",
    "calendar",
    "org_structure",
    "bpmn",
]


class UniversalViewBase(BaseModel):
    table_id: int
    name: str
    type: UniversalViewType = "table"

    settings: dict[str, Any] = Field(default_factory=dict)
    layout: dict[str, Any] = Field(default_factory=dict)
    filters: list[dict[str, Any]] = Field(default_factory=list)
    sorting: list[dict[str, Any]] = Field(default_factory=list)
    grouping: dict[str, Any] = Field(default_factory=dict)
    visible_fields: list[Any] = Field(default_factory=list)

    is_default: bool = False
    is_visible: bool = True
    is_system: bool = False

    position: int = 0


class UniversalViewCreate(UniversalViewBase):
    pass


class UniversalViewUpdate(BaseModel):
    name: str | None = None
    type: UniversalViewType | None = None

    settings: dict[str, Any] | None = None
    layout: dict[str, Any] | None = None
    filters: list[dict[str, Any]] | None = None
    sorting: list[dict[str, Any]] | None = None
    grouping: dict[str, Any] | None = None
    visible_fields: list[Any] | None = None

    is_default: bool | None = None
    is_visible: bool | None = None
    is_system: bool | None = None

    position: int | None = None


class UniversalViewOut(UniversalViewBase):
    id: int

    created_by_id: int | None = None
    updated_by_id: int | None = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True