from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WorkspaceTabCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    route: str = Field(..., min_length=1, max_length=2048)
    module_key: str = Field(..., min_length=1, max_length=64)
    page_type: str = Field(..., min_length=1, max_length=64)
    tenant_id: int | None = Field(default=None, ge=1)
    icon_key: str | None = Field(default=None, max_length=64)
    context_json: dict[str, Any] = Field(default_factory=dict)
    is_pinned: bool = False
    is_minimized: bool = False
    sort_order: int = Field(default=100, ge=0)

    @field_validator("context_json")
    @classmethod
    def validate_context_json(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(value, dict):
            raise ValueError("context_json должен быть объектом")
        return value


class WorkspaceTabUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    icon_key: str | None = Field(default=None, max_length=64)
    context_json: dict[str, Any] | None = None
    is_pinned: bool | None = None
    is_minimized: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)
    last_opened_at: datetime | None = None

    @field_validator("context_json")
    @classmethod
    def validate_context_json(
        cls,
        value: dict[str, Any] | None,
    ) -> dict[str, Any] | None:
        if value is None:
            return value
        if not isinstance(value, dict):
            raise ValueError("context_json должен быть объектом")
        return value


class WorkspaceTabReorderItem(BaseModel):
    id: UUID
    sort_order: int = Field(..., ge=0)


class WorkspaceTabReorder(BaseModel):
    items: list[WorkspaceTabReorderItem] = Field(..., min_length=1)


class WorkspaceTabOpen(BaseModel):
    last_opened_at: datetime | None = None


class WorkspaceTabRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: int
    tenant_id: int | None = None
    title: str
    route: str
    module_key: str
    page_type: str
    icon_key: str | None = None
    context_json: dict[str, Any] = Field(default_factory=dict)
    is_pinned: bool
    is_minimized: bool
    sort_order: int
    last_opened_at: datetime
    created_at: datetime
    updated_at: datetime
