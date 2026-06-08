from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.action_engine.action_forms import service
from app.modules.platform.action_engine.action_forms.schemas import (
    ActionFormCreate,
    ActionFormFieldCreate,
    ActionFormFieldRead,
    ActionFormFieldUpdate,
    ActionFormRead,
    ActionFormUpdate,
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

FormFieldIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор ActionFormField. Только path parameter."),
]

action_definition_form_router = APIRouter(tags=["action-forms"])


@action_definition_form_router.get(
    "",
    response_model=ActionFormRead | None,
)
def get_action_form(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    db: Session = Depends(get_db),
):
    return service.get_action_form(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )


@action_definition_form_router.post(
    "",
    response_model=ActionFormRead,
    status_code=status.HTTP_201_CREATED,
)
def create_action_form(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    payload: ActionFormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.create_action_form(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        payload,
        current_user=current_user,
    )


@action_definition_form_router.patch(
    "",
    response_model=ActionFormRead,
)
def update_action_form(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    payload: ActionFormUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.update_action_form(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        payload,
        current_user=current_user,
    )


@action_definition_form_router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_action_form(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    service.delete_action_form(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        current_user=current_user,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@action_definition_form_router.get(
    "/fields",
    response_model=list[ActionFormFieldRead],
)
def list_action_form_fields(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    db: Session = Depends(get_db),
):
    return service.list_action_form_fields(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )


@action_definition_form_router.post(
    "/fields",
    response_model=ActionFormFieldRead,
    status_code=status.HTTP_201_CREATED,
)
def create_action_form_field(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    payload: ActionFormFieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.create_action_form_field(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        payload,
        current_user=current_user,
    )


@action_definition_form_router.patch(
    "/fields/{field_id}",
    response_model=ActionFormFieldRead,
)
def update_action_form_field(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    field_id: FormFieldIdPath,
    payload: ActionFormFieldUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.update_action_form_field(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        field_id,
        payload,
        current_user=current_user,
    )


@action_definition_form_router.delete(
    "/fields/{field_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_action_form_field(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    action_definition_id: ActionDefinitionIdPath,
    field_id: FormFieldIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    service.delete_action_form_field(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        field_id,
        current_user=current_user,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
