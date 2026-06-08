from pydantic import BaseModel, ConfigDict, Field


class ActionTypeListItem(BaseModel):
    key: str
    name: str
    description: str = ""
    category_key: str
    is_active: bool = True
    is_system: bool = True

    model_config = ConfigDict(from_attributes=True)


class ActionTypeListResponse(BaseModel):
    items: list[ActionTypeListItem] = Field(default_factory=list)
