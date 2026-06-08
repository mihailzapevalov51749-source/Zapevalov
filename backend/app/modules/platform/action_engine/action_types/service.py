from app.modules.platform.action_engine.action_types.registry import action_type_registry
from app.modules.platform.action_engine.action_types.schemas import (
    ActionTypeListItem,
    ActionTypeListResponse,
)


def list_action_types(*, active_only: bool = True) -> ActionTypeListResponse:
    items = [
        ActionTypeListItem.model_validate(action_type)
        for action_type in action_type_registry.list(active_only=active_only)
    ]
    return ActionTypeListResponse(items=items)
