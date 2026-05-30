from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.object_types.menu_placements import service
from app.modules.platform.designer.object_types.menu_placements.schemas import (
    MenuPlacementsRequest,
    MenuPlacementsResponse,
)
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.users.models import User

router = APIRouter(tags=["designer-object-type-menu"])


@router.post(
    "/{object_type_id}/menu-placements",
    response_model=MenuPlacementsResponse,
)
def publish_object_type_menu_placements(
    tenant_id: int,
    object_type_id: UUID,
    payload: MenuPlacementsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    del current_user
    return service.publish_menu_placements(
        db,
        tenant_id,
        object_type_id,
        payload.placements,
    )
