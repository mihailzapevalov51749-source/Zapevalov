from uuid import UUID

from pydantic import BaseModel, Field, field_validator

DESIGNER_MENU_SCOPE = "designer"
RUNTIME_MENU_SCOPE = "runtime"
ALLOWED_MENU_SCOPES = frozenset({DESIGNER_MENU_SCOPE, RUNTIME_MENU_SCOPE})


class MenuPlacementInput(BaseModel):
    menu_scope: str = Field(default=DESIGNER_MENU_SCOPE)
    parent_id: int | None = None
    sort_order: int = 0
    is_visible: bool = True

    @field_validator("menu_scope")
    @classmethod
    def validate_menu_scope(cls, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized not in ALLOWED_MENU_SCOPES:
            raise ValueError("menu_scope должен быть designer или runtime")
        return normalized


class MenuPlacementsRequest(BaseModel):
    placements: list[MenuPlacementInput] = Field(min_length=1)


class MenuPlacementResult(BaseModel):
    navigation_item_id: int
    menu_scope: str
    parent_id: int | None
    sort_order: int
    is_visible: bool
    object_type_id: UUID
    url: str | None = None
    display_title: str | None = None
    display_icon_type: str | None = None
    display_icon_file_url: str | None = None
    display_color: str | None = None


class MenuPlacementsResponse(BaseModel):
    placements: list[MenuPlacementResult]
