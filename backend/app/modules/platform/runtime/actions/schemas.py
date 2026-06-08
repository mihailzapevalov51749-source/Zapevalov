from typing import Any

from uuid import UUID



from pydantic import BaseModel, ConfigDict, Field





class PublishedRuntimeActionFormField(BaseModel):

    field_key: str

    label_override: str | None = None

    placeholder: str | None = None

    help_text: str | None = None

    required: bool = False

    sort_order: int = Field(default=100, ge=0)

    is_visible: bool = True





class PublishedRuntimeActionForm(BaseModel):

    title: str

    description: str | None = None

    submit_label: str = "Создать"

    cancel_label: str = "Отмена"

    fields: list[PublishedRuntimeActionFormField] = Field(default_factory=list)





class PublishedRuntimeAction(BaseModel):

    """Flat runtime view of a published action resolved for a single placement."""



    model_config = ConfigDict(from_attributes=True)



    id: UUID

    key: str

    name: str

    description: str | None = None

    action_type_key: str

    placement_key: str

    sort_order: int = Field(default=100, ge=0)

    label_override: str | None = None

    icon_key: str | None = None

    config_json: dict[str, Any] = Field(default_factory=dict)

    target_object_type_id: UUID | None = None
    target_object_type_key: str | None = None
    target_object_type_name: str | None = None

    auto_link_enabled: bool = False
    auto_link_relation_id: UUID | None = None
    auto_link_relation_key: str | None = None

    form: PublishedRuntimeActionForm | None = None

