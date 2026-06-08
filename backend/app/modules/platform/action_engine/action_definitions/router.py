from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.action_engine.action_definitions import service
from app.modules.platform.action_engine.action_definitions.schemas import (
    ActionDefinitionCreate,
    ActionDefinitionListItem,
    ActionDefinitionRead,
    ActionDefinitionUpdate,
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

object_type_action_definitions_router = APIRouter(tags=["action-definitions"])


@object_type_action_definitions_router.get(
    "",
    response_model=list[ActionDefinitionListItem],
)
def list_action_definitions(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    db: Session = Depends(get_db),
):
    return service.list_action_definitions(db, tenant_id, object_type_id)


@object_type_action_definitions_router.get(
    "/{action_definition_id}",
    response_model=ActionDefinitionRead,
)
def get_action_definition(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    db: Session = Depends(get_db),
):
    return service.get_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )


@object_type_action_definitions_router.post(
    "",
    response_model=ActionDefinitionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_action_definition(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    payload: ActionDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.create_action_definition(
        db,
        tenant_id,
        object_type_id,
        payload,
        current_user=current_user,
    )


@object_type_action_definitions_router.patch(
    "/{action_definition_id}",
    response_model=ActionDefinitionRead,
)
def update_action_definition(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    payload: ActionDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.update_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        payload,
        current_user=current_user,
    )


@object_type_action_definitions_router.delete(
    "/{action_definition_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_action_definition(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    service.delete_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        current_user=current_user,
    )
