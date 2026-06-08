from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ActionFormFieldCreate(BaseModel):
    field_definition_id: UUID
    label_override: str | None = Field(default=None, max_length=255)
    placeholder: str | None = Field(default=None, max_length=255)
    help_text: str | None = None
    required: bool = False
    sort_order: int = 100
    is_visible: bool = True


class ActionFormFieldUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label_override: str | None = Field(default=None, max_length=255)
    placeholder: str | None = Field(default=None, max_length=255)
    help_text: str | None = None
    required: bool | None = None
    sort_order: int | None = None
    is_visible: bool | None = None


class ActionFormFieldRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    action_form_id: UUID
    field_definition_id: UUID
    field_key: str | None = None
    field_name: str | None = None
    label_override: str | None = None
    placeholder: str | None = None
    help_text: str | None = None
    required: bool
    sort_order: int
    is_visible: bool
    created_at: datetime
    updated_at: datetime


class ActionFormCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    submit_label: str = Field(default="Создать", min_length=1, max_length=128)
    cancel_label: str = Field(default="Отмена", min_length=1, max_length=128)
    is_active: bool = True


class ActionFormUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    submit_label: str | None = Field(default=None, min_length=1, max_length=128)
    cancel_label: str | None = Field(default=None, min_length=1, max_length=128)
    is_active: bool | None = None


class ActionFormRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: int
    object_type_id: UUID
    action_definition_id: UUID
    title: str
    description: str | None = None
    submit_label: str
    cancel_label: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    fields: list[ActionFormFieldRead] = Field(default_factory=list)
