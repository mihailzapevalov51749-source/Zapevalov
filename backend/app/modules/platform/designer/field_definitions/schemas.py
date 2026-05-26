import re
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.platform.shared.constants import (
    FIELD_DEFINITION_KEY_MAX_LENGTH,
    FIELD_DEFINITION_NAME_MAX_LENGTH,
)
from app.modules.platform.shared.enums import FieldType

FIELD_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,63}$")
CHOICE_FIELD_TYPES = {FieldType.CHOICE, FieldType.MULTI_CHOICE}


class FieldDefinitionCreate(BaseModel):
    """Создание поля. tenant_id и object_type_id только в URL."""

    key: str = Field(..., min_length=3, max_length=FIELD_DEFINITION_KEY_MAX_LENGTH)
    name: str = Field(..., min_length=1, max_length=FIELD_DEFINITION_NAME_MAX_LENGTH)
    description: str | None = None
    field_type: FieldType
    sort_order: int = 0
    is_required: bool = False
    is_unique: bool = False
    is_system: bool = False
    default_value_json: Any | None = None
    settings_json: dict[str, Any] = Field(default_factory=dict)
    validation_json: dict[str, Any] = Field(default_factory=dict)
    visibility_json: dict[str, Any] = Field(default_factory=dict)

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        if not FIELD_KEY_PATTERN.match(value):
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

    @model_validator(mode="after")
    def validate_field_type_payload(self) -> "FieldDefinitionCreate":
        _validate_field_type_payload(
            field_type=self.field_type,
            default_value_json=self.default_value_json,
            settings_json=self.settings_json,
        )
        return self


class FieldDefinitionUpdate(BaseModel):
    """Partial update (PATCH)."""

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "name": "Новое имя поля",
            },
        },
    )

    key: str | None = None
    name: str | None = None
    description: str | None = None
    field_type: FieldType | None = None
    sort_order: int | None = None
    is_required: bool | None = None
    is_unique: bool | None = None
    default_value_json: Any | None = None
    settings_json: dict[str, Any] | None = None
    validation_json: dict[str, Any] | None = None
    visibility_json: dict[str, Any] | None = None
    draft_revision: int | None = None

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not FIELD_KEY_PATTERN.match(value):
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


class FieldDefinitionRead(BaseModel):
    id: UUID
    tenant_id: int
    object_type_id: UUID
    key: str
    name: str
    description: str | None = None
    field_type: str
    sort_order: int
    is_required: bool
    is_unique: bool
    is_system: bool
    default_value_json: Any | None = None
    settings_json: dict[str, Any]
    validation_json: dict[str, Any]
    visibility_json: dict[str, Any]
    draft_revision: int
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


class FieldDefinitionListItem(BaseModel):
    id: UUID
    tenant_id: int
    object_type_id: UUID
    key: str
    name: str
    description: str | None = None
    field_type: str
    sort_order: int
    is_required: bool
    is_unique: bool
    is_system: bool
    default_value_json: Any | None = None
    settings_json: dict[str, Any]
    validation_json: dict[str, Any]
    visibility_json: dict[str, Any]
    draft_revision: int
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True


class FieldDefinitionReorderItem(BaseModel):
    id: UUID
    sort_order: int = Field(..., ge=0)


class FieldDefinitionReorderRequest(BaseModel):
    items: list[FieldDefinitionReorderItem] = Field(..., min_length=1)


def _validate_choice_options(settings_json: dict[str, Any]) -> None:
    options = settings_json.get("options")
    if not isinstance(options, list) or len(options) == 0:
        raise ValueError(
            "settings_json.options обязателен для choice/multi_choice "
            "и должен быть непустым массивом",
        )

    seen_keys: set[str] = set()
    for index, option in enumerate(options):
        if not isinstance(option, dict):
            raise ValueError(f"settings_json.options[{index}] должен быть объектом")

        option_key = option.get("key")
        if not option_key or not isinstance(option_key, str):
            raise ValueError(f"settings_json.options[{index}].key обязателен")

        if option_key in seen_keys:
            raise ValueError(
                f"settings_json.options[].key должны быть уникальны: дубликат '{option_key}'",
            )
        seen_keys.add(option_key)


def _validate_field_type_payload(
    *,
    field_type: FieldType,
    default_value_json: Any | None,
    settings_json: dict[str, Any],
) -> None:
    if field_type in CHOICE_FIELD_TYPES:
        _validate_choice_options(settings_json or {})

    if field_type == FieldType.BOOLEAN:
        if default_value_json is not None and not isinstance(default_value_json, bool):
            raise ValueError("default_value_json для boolean должен быть true/false или null")

    if field_type in {FieldType.DATE, FieldType.DATETIME}:
        if default_value_json is not None and not isinstance(default_value_json, str):
            raise ValueError(
                "default_value_json для date/datetime должен быть ISO string или null",
            )

    if field_type == FieldType.UUID and default_value_json is not None:
        if not isinstance(default_value_json, str):
            raise ValueError("default_value_json для uuid должен быть string или null")


def validate_field_update_payload(
    *,
    field_type: FieldType,
    default_value_json: Any | None,
    settings_json: dict[str, Any],
) -> None:
    _validate_field_type_payload(
        field_type=field_type,
        default_value_json=default_value_json,
        settings_json=settings_json,
    )
