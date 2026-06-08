from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validate_json_object(value: Any, field_name: str) -> dict[str, Any] | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} должен быть объектом или null")
    return value


class ActionPlacementRegistryItem(BaseModel):
    key: str
    name: str
    description: str
    sort_order: int


class ActionPlacementCreate(BaseModel):
    placement_key: str = Field(..., min_length=1, max_length=64)
    is_active: bool = True
    sort_order: int = 100
    label_override: str | None = Field(default=None, max_length=255)
    icon_key: str | None = Field(default=None, max_length=64)
    config_json: dict[str, Any] | None = None
    visibility_condition_json: dict[str, Any] | None = None
    enabled_condition_json: dict[str, Any] | None = None

    @field_validator("config_json")
    @classmethod
    def validate_config_json(cls, value: Any) -> dict[str, Any] | None:
        return _validate_json_object(value, "config_json")

    @field_validator("visibility_condition_json", "enabled_condition_json")
    @classmethod
    def validate_condition_json(cls, value: Any) -> dict[str, Any] | None:
        return _validate_json_object(value, "condition_json")


class ActionPlacementUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool | None = None
    sort_order: int | None = None
    label_override: str | None = Field(default=None, max_length=255)
    icon_key: str | None = Field(default=None, max_length=64)
    config_json: dict[str, Any] | None = None
    visibility_condition_json: dict[str, Any] | None = None
    enabled_condition_json: dict[str, Any] | None = None

    @field_validator("config_json")
    @classmethod
    def validate_config_json(cls, value: Any) -> dict[str, Any] | None:
        return _validate_json_object(value, "config_json")

    @field_validator("visibility_condition_json", "enabled_condition_json")
    @classmethod
    def validate_condition_json(cls, value: Any) -> dict[str, Any] | None:
        return _validate_json_object(value, "condition_json")


class ActionPlacementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    object_type_id: UUID
    action_definition_id: UUID
    placement_key: str
    is_active: bool
    sort_order: int
    label_override: str | None = None
    icon_key: str | None = None
    config_json: dict[str, Any] | None = None
    visibility_condition_json: dict[str, Any] | None = None
    enabled_condition_json: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
