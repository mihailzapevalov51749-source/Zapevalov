from pydantic import BaseModel, ConfigDict, Field


class ActionCategoryListItem(BaseModel):
    key: str
    name: str
    description: str = ""
    sort_order: int = 0
    is_active: bool = True
    is_system: bool = True

    model_config = ConfigDict(from_attributes=True)


class ActionCategoryListResponse(BaseModel):
    items: list[ActionCategoryListItem] = Field(default_factory=list)
