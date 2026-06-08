from fastapi import APIRouter, Depends

from app.modules.platform.action_engine.action_placements import service
from app.modules.platform.action_engine.action_placements.schemas import (
    ActionPlacementRegistryItem,
)
from app.modules.platform.shared.dependencies import (
    require_designer_user,
    require_tenant,
)

router = APIRouter(
    prefix="/action-placements",
    tags=["Action Placements"],
    dependencies=[
        Depends(require_tenant),
        Depends(require_designer_user),
    ],
)


@router.get("", response_model=list[ActionPlacementRegistryItem])
def get_action_placements_catalog() -> list[ActionPlacementRegistryItem]:
    return service.list_placement_catalog()
