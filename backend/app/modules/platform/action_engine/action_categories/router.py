from fastapi import APIRouter, Depends

from app.modules.platform.action_engine.action_categories import service
from app.modules.platform.action_engine.action_categories.schemas import (
    ActionCategoryListItem,
)
from app.modules.platform.shared.dependencies import (
    require_designer_user,
    require_tenant,
)

router = APIRouter(
    prefix="/action-categories",
    tags=["Action Categories"],
    dependencies=[
        Depends(require_tenant),
        Depends(require_designer_user),
    ],
)


@router.get("", response_model=list[ActionCategoryListItem])
def get_action_categories() -> list[ActionCategoryListItem]:
    return service.list_action_categories().items
