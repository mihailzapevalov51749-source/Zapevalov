import re
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.platform.shared.constants import (
    OBJECT_TYPE_KEY_MAX_LENGTH,
    OBJECT_TYPE_NAME_MAX_LENGTH,
)
from app.modules.platform.shared.enums import ObjectTypeStatus

OBJECT_TYPE_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,63}$")
HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class DependencyCounts(BaseModel):
    fields: int = 0
    relations: int = 0
    views: int = 0
    layouts: int = 0


class ObjectTypeCreate(BaseModel):
    """Тело запроса создания ObjectType. tenant_id задаётся только в URL."""

    key: str = Field(..., min_length=3, max_length=OBJECT_TYPE_KEY_MAX_LENGTH)
    name: str = Field(..., min_length=1, max_length=OBJECT_TYPE_NAME_MAX_LENGTH)
    description: str | None = None
    icon: str | None = Field(default=None, max_length=64)
    icon_type: str | None = Field(default=None, max_length=50)
    icon_file_url: str | None = Field(default=None, max_length=1000)
    color: str | None = Field(default=None, max_length=7)
    sort_order: int = 0
    status: ObjectTypeStatus = ObjectTypeStatus.ACTIVE
    is_system: bool = False
    is_default_entity: bool = False
    settings_json: dict[str, Any] = Field(default_factory=dict)
    governance_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        if not OBJECT_TYPE_KEY_PATTERN.match(value):
            raise ValueError(
                "key должен соответствовать шаблону ^[a-z][a-z0-9_]{2,63}$",
            )
        return value

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not HEX_COLOR_PATTERN.match(value):
            raise ValueError("color должен быть в формате #RRGGBB")
        return value

    @field_validator("is_system")
    @classmethod
    def forbid_system_flag_on_create(cls, value: bool) -> bool:
        if value:
            raise ValueError("is_system нельзя устанавливать через API создания")
        return value


class ObjectTypeUpdate(BaseModel):
    """
    Partial update (PATCH). Все поля опциональны.
    Обновляются только поля, переданные в JSON body.
    """

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "name": "Новое имя",
            },
        },
    )

    key: str | None = None
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    icon_type: str | None = Field(default=None, max_length=50)
    icon_file_url: str | None = Field(default=None, max_length=1000)
    color: str | None = None
    sort_order: int | None = None
    status: ObjectTypeStatus | None = None
    is_default_entity: bool | None = None
    settings_json: dict[str, Any] | None = None
    governance_json: dict[str, Any] | None = None
    draft_revision: int | None = None

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not OBJECT_TYPE_KEY_PATTERN.match(value):
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
        if len(value) > OBJECT_TYPE_NAME_MAX_LENGTH:
            raise ValueError(
                f"name не длиннее {OBJECT_TYPE_NAME_MAX_LENGTH} символов",
            )
        return value

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not HEX_COLOR_PATTERN.match(value):
            raise ValueError("color должен быть в формате #RRGGBB")
        return value

    @field_validator("icon")
    @classmethod
    def validate_icon(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if len(value) > 64:
            raise ValueError("icon не длиннее 64 символов")
        return value


class ObjectTypeRead(BaseModel):
    id: UUID
    tenant_id: int
    key: str
    name: str
    description: str | None = None
    icon: str | None = None
    icon_type: str | None = None
    icon_file_url: str | None = None
    color: str | None = None
    sort_order: int
    status: str
    is_system: bool
    is_default_entity: bool
    settings_json: dict[str, Any]
    governance_json: dict[str, Any]
    draft_revision: int
    last_published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    dependency_counts: DependencyCounts

    class Config:
        from_attributes = True


class ObjectTypeListItem(BaseModel):
    id: UUID
    tenant_id: int
    key: str
    name: str
    description: str | None = None
    icon: str | None = None
    icon_type: str | None = None
    icon_file_url: str | None = None
    color: str | None = None
    sort_order: int
    status: str
    is_system: bool
    is_default_entity: bool
    settings_json: dict[str, Any]
    governance_json: dict[str, Any]
    draft_revision: int
    last_published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None
    dependency_counts: DependencyCounts

    class Config:
        from_attributes = True
