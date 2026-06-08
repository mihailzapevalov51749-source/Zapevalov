from app.modules.platform.action_engine.action_categories.registry import (
    action_category_registry,
)
from app.modules.platform.action_engine.action_categories.schemas import (
    ActionCategoryListItem,
    ActionCategoryListResponse,
)


def list_action_categories(*, active_only: bool = True) -> ActionCategoryListResponse:
    items = [
        ActionCategoryListItem.model_validate(action_category)
        for action_category in action_category_registry.list(active_only=active_only)
    ]
    return ActionCategoryListResponse(items=items)
