import re
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.platform.shared.constants import (
    RELATION_DEFINITION_KEY_MAX_LENGTH,
    RELATION_DEFINITION_NAME_MAX_LENGTH,
)
from app.modules.platform.shared.enums import RelationType

RELATION_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,63}$")


class RelationDefinitionCreate(BaseModel):
    """tenant_id только в URL."""

    key: str = Field(..., min_length=3, max_length=RELATION_DEFINITION_KEY_MAX_LENGTH)
    name: str = Field(..., min_length=1, max_length=RELATION_DEFINITION_NAME_MAX_LENGTH)
    description: str | None = None
    source_object_type_id: UUID
    target_object_type_id: UUID
    relation_type: RelationType
    reverse_name: str | None = Field(default=None, max_length=RELATION_DEFINITION_NAME_MAX_LENGTH)
    sort_order: int = 0
    is_required: bool = False
    is_system: bool = False
    is_active: bool = True
    bidirectional: bool = True
    cascade_delete: bool = False
    settings_json: dict[str, Any] = Field(default_factory=dict)
    validation_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        if not RELATION_KEY_PATTERN.match(value):
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


class RelationDefinitionUpdate(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "name": "Новое имя связи",
            },
        },
    )

    key: str | None = None
    name: str | None = None
    description: str | None = None
    source_object_type_id: UUID | None = None
    target_object_type_id: UUID | None = None
    relation_type: RelationType | None = None
    reverse_name: str | None = None
    sort_order: int | None = None
    is_required: bool | None = None
    is_active: bool | None = None
    bidirectional: bool | None = None
    cascade_delete: bool | None = None
    settings_json: dict[str, Any] | None = None
    validation_json: dict[str, Any] | None = None
    draft_revision: int | None = None

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not RELATION_KEY_PATTERN.match(value):
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


class RelationDefinitionRead(BaseModel):
    id: UUID
    tenant_id: int
    key: str
    name: str
    description: str | None = None
    source_object_type_id: UUID
    target_object_type_id: UUID
    source_object_type_key: str
    source_object_type_name: str
    target_object_type_key: str
    target_object_type_name: str
    relation_type: str
    reverse_name: str | None = None
    sort_order: int
    is_required: bool
    is_system: bool
    is_active: bool
    bidirectional: bool
    cascade_delete: bool
    settings_json: dict[str, Any]
    validation_json: dict[str, Any]
    draft_revision: int
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


class RelationDefinitionListItem(BaseModel):
    id: UUID
    tenant_id: int
    key: str
    name: str
    description: str | None = None
    source_object_type_id: UUID
    target_object_type_id: UUID
    source_object_type_key: str
    source_object_type_name: str
    target_object_type_key: str
    target_object_type_name: str
    relation_type: str
    reverse_name: str | None = None
    sort_order: int
    is_required: bool
    is_system: bool
    is_active: bool
    bidirectional: bool
    cascade_delete: bool
    settings_json: dict[str, Any]
    validation_json: dict[str, Any]
    draft_revision: int
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


def validate_relation_business_rules(
    *,
    relation_type: RelationType,
    source_object_type_id: UUID,
    target_object_type_id: UUID,
    bidirectional: bool,
    reverse_name: str | None,
    cascade_delete: bool,
    source_is_system: bool,
    target_is_system: bool,
) -> None:
    if source_object_type_id == target_object_type_id:
        raise ValueError(
            "source_object_type_id и target_object_type_id не могут совпадать (MVP)",
        )

    if bidirectional and not (reverse_name and reverse_name.strip()):
        raise ValueError("reverse_name обязателен, если bidirectional = true")

    if relation_type == RelationType.MANY_TO_MANY and cascade_delete:
        raise ValueError("cascade_delete нельзя включать для many_to_many")

    if cascade_delete and (source_is_system or target_is_system):
        raise ValueError(
            "cascade_delete нельзя включать, если source или target — system ObjectType",
        )
