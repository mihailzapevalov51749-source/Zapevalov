import re
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.platform.shared.constants import (
    VIEW_DEFINITION_KEY_MAX_LENGTH,
    VIEW_DEFINITION_NAME_MAX_LENGTH,
)
from app.modules.platform.shared.enums import ViewType

VIEW_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,63}$")


class ViewDefinitionCreate(BaseModel):
    """tenant_id и object_type_id только в URL."""

    key: str = Field(..., min_length=3, max_length=VIEW_DEFINITION_KEY_MAX_LENGTH)
    name: str = Field(..., min_length=1, max_length=VIEW_DEFINITION_NAME_MAX_LENGTH)
    description: str | None = None
    view_type: ViewType
    is_default: bool = False
    is_system: bool = False
    is_active: bool = True
    sort_order: int = 0
    settings_json: dict[str, Any] = Field(default_factory=dict)
    layout_json: dict[str, Any] = Field(default_factory=dict)
    filters_json: dict[str, Any] = Field(default_factory=dict)
    visibility_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        if not VIEW_KEY_PATTERN.match(value):
            raise ValueError(
                "key должен соответствовать шаблону ^[a-z][a-z0-9_]{2,63}$",
            )
        return value

    @field_validator("is_system")
    @classmethod
    def forbid_system_flag_on_create(cls, value: bool) -> bool:
        if value:
            raise ValueError("is_system нельзя устанавливать через API создания")
        return value


class ViewDefinitionUpdate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "name": "Основная таблица",
            },
        },
    )

    key: str | None = None
    name: str | None = None
    description: str | None = None
    view_type: ViewType | None = None
    is_default: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    settings_json: dict[str, Any] | None = None
    layout_json: dict[str, Any] | None = None
    filters_json: dict[str, Any] | None = None
    visibility_json: dict[str, Any] | None = None
    draft_revision: int | None = None

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not VIEW_KEY_PATTERN.match(value):
            raise ValueError(
                "key должен соответствовать шаблону ^[a-z][a-z0-9_]{2,63}$",
            )
        return value

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("name не может быть пустым")
        return value


class ViewDefinitionRead(BaseModel):
    id: UUID
    tenant_id: int
    object_type_id: UUID
    object_type_key: str
    object_type_name: str
    key: str
    name: str
    description: str | None = None
    view_type: str
    is_default: bool
    is_system: bool
    is_active: bool
    sort_order: int
    settings_json: dict[str, Any]
    layout_json: dict[str, Any]
    filters_json: dict[str, Any]
    visibility_json: dict[str, Any]
    draft_revision: int
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


class ViewDefinitionListItem(BaseModel):
    id: UUID
    tenant_id: int
    object_type_id: UUID
    object_type_key: str
    object_type_name: str
    key: str
    name: str
    description: str | None = None
    view_type: str
    is_default: bool
    is_system: bool
    is_active: bool
    sort_order: int
    settings_json: dict[str, Any]
    layout_json: dict[str, Any]
    filters_json: dict[str, Any]
    visibility_json: dict[str, Any]
    draft_revision: int
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


class ViewDefinitionReorderItem(BaseModel):
    id: UUID
    sort_order: int = Field(..., ge=0)


class ViewDefinitionReorderRequest(BaseModel):
    items: list[ViewDefinitionReorderItem] = Field(..., min_length=1)
