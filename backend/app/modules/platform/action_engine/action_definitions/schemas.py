import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

ACTION_DEFINITION_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,63}$")


class ActionDefinitionCreate(BaseModel):
    key: str = Field(..., min_length=3, max_length=64)
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    action_type_key: str = Field(..., min_length=1, max_length=64)
    target_object_type_id: UUID | None = None
    auto_link_enabled: bool = False
    auto_link_relation_id: UUID | None = None
    is_active: bool = True

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        if not ACTION_DEFINITION_KEY_PATTERN.match(value):
            raise ValueError(
                "key должен соответствовать шаблону ^[a-z][a-z0-9_]{2,63}$",
            )
        return value

    @field_validator("is_system", check_fields=False)
    @classmethod
    def forbid_system_on_create(cls, value: bool) -> bool:
        if value:
            raise ValueError("is_system нельзя устанавливать через API создания")
        return value


class ActionDefinitionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str | None = Field(default=None, min_length=3, max_length=64)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    action_type_key: str | None = Field(default=None, min_length=1, max_length=64)
    target_object_type_id: UUID | None = None
    auto_link_enabled: bool | None = None
    auto_link_relation_id: UUID | None = None
    is_active: bool | None = None

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not ACTION_DEFINITION_KEY_PATTERN.match(value):
            raise ValueError(
                "key должен соответствовать шаблону ^[a-z][a-z0-9_]{2,63}$",
            )
        return value


class ActionDefinitionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    object_type_id: UUID
    key: str
    name: str
    description: str | None = None
    action_type_key: str
    target_object_type_id: UUID | None = None
    auto_link_enabled: bool = False
    auto_link_relation_id: UUID | None = None
    is_active: bool
    is_system: bool
    created_at: datetime
    updated_at: datetime


class ActionDefinitionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    key: str
    name: str
    description: str | None = None
    action_type_key: str
    target_object_type_id: UUID | None = None
    auto_link_enabled: bool = False
    auto_link_relation_id: UUID | None = None
    is_active: bool
    is_system: bool
