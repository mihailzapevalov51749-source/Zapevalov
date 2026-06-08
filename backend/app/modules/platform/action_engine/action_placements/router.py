from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.action_engine.action_placements import service
from app.modules.platform.action_engine.action_placements.schemas import (
    ActionPlacementCreate,
    ActionPlacementRead,
    ActionPlacementUpdate,
)
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.users.models import User

TenantIdPath = Annotated[
    int,
    Path(
        ...,
        description="Идентификатор tenant (portal). Только path parameter.",
        ge=1,
    ),
]

ObjectTypeIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор ObjectType. Только path parameter."),
]

ActionDefinitionIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор ActionDefinition. Только path parameter."),
]

PlacementIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор ActionPlacement. Только path parameter."),
]

action_definition_placements_router = APIRouter(tags=["action-placements"])


@action_definition_placements_router.get(
    "",
    response_model=list[ActionPlacementRead],
)
def list_action_placements(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    db: Session = Depends(get_db),
):
    return service.list_action_placements(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )


@action_definition_placements_router.post(
    "",
    response_model=ActionPlacementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_action_placement(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    payload: ActionPlacementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.create_action_placement(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        payload,
        current_user=current_user,
    )


@action_definition_placements_router.patch(
    "/{placement_id}",
    response_model=ActionPlacementRead,
)
def update_action_placement(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    placement_id: PlacementIdPath,
    payload: ActionPlacementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.update_action_placement(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        placement_id,
        payload,
        current_user=current_user,
    )


@action_definition_placements_router.delete(
    "/{placement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_action_placement(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    placement_id: PlacementIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    service.delete_action_placement(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        placement_id,
        current_user=current_user,
    )
