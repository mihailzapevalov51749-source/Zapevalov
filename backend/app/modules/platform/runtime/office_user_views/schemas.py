from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OfficeUserTableViewCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    view_type: str = "table"
    is_default: bool = False
    is_visible: bool = True
    settings_json: dict[str, Any] = Field(default_factory=dict)
    filters_json: dict[str, Any] = Field(default_factory=dict)
    layout_json: dict[str, Any] = Field(default_factory=dict)
    visibility_json: dict[str, Any] = Field(default_factory=dict)


class OfficeUserTableViewUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    is_default: bool | None = None
    is_visible: bool | None = None
    settings_json: dict[str, Any] | None = None
    filters_json: dict[str, Any] | None = None
    layout_json: dict[str, Any] | None = None
    visibility_json: dict[str, Any] | None = None


class OfficeUserTableViewRead(BaseModel):
    id: UUID
    tenant_id: int
    owner_user_id: int
    object_type_key: str
    key: str
    name: str
    view_type: str
    is_default: bool
    is_visible: bool
    settings_json: dict[str, Any]
    filters_json: dict[str, Any]
    layout_json: dict[str, Any]
    visibility_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OfficeUserTableViewStateRead(BaseModel):
    default_view_id: UUID | None = None
    default_view_key: str | None = None
    views: list[OfficeUserTableViewRead]
