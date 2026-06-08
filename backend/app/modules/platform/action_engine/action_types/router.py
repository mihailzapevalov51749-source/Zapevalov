from fastapi import APIRouter, Depends

from app.modules.platform.action_engine.action_types import service
from app.modules.platform.action_engine.action_types.schemas import ActionTypeListItem
from app.modules.platform.shared.dependencies import (
    require_designer_user,
    require_tenant,
)

router = APIRouter(
    prefix="/action-types",
    tags=["Action Types"],
    dependencies=[
        Depends(require_tenant),
        Depends(require_designer_user),
    ],
)


@router.get("", response_model=list[ActionTypeListItem])
def get_action_types() -> list[ActionTypeListItem]:
    return service.list_action_types().items
