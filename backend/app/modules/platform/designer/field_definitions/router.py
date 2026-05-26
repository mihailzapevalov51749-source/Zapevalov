from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.field_definitions import service
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.users.models import User
from app.modules.platform.designer.field_definitions.schemas import (
    FieldDefinitionCreate,
    FieldDefinitionListItem,
    FieldDefinitionRead,
    FieldDefinitionReorderRequest,
    FieldDefinitionUpdate,
)

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

FieldIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор FieldDefinition. Только path parameter."),
]

object_type_fields_router = APIRouter(tags=["designer-field-definitions"])

tenant_fields_router = APIRouter(tags=["designer-field-definitions"])


@object_type_fields_router.get("", response_model=list[FieldDefinitionListItem])
def list_fields(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    db: Session = Depends(get_db),
):
    return service.list_fields(db, tenant_id, object_type_id)


@object_type_fields_router.post(
    "",
    response_model=FieldDefinitionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_field(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    payload: FieldDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.create_field(
        db,
        tenant_id,
        object_type_id,
        payload,
        current_user=current_user,
    )


@object_type_fields_router.post("/reorder", response_model=list[FieldDefinitionListItem])
def reorder_fields(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    payload: FieldDefinitionReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.reorder_fields(
        db,
        tenant_id,
        object_type_id,
        payload,
        current_user=current_user,
    )


@tenant_fields_router.get("/{field_id}", response_model=FieldDefinitionRead)
def get_field(
    tenant_id: TenantIdPath,
    field_id: FieldIdPath,
    db: Session = Depends(get_db),
):
    return service.get_field(db, tenant_id, field_id)


@tenant_fields_router.patch("/{field_id}", response_model=FieldDefinitionRead)
def update_field(
    tenant_id: TenantIdPath,
    field_id: FieldIdPath,
    payload: FieldDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.update_field(
        db,
        tenant_id,
        field_id,
        payload,
        current_user=current_user,
    )


@tenant_fields_router.delete("/{field_id}", response_model=FieldDefinitionRead)
def delete_field(
    tenant_id: TenantIdPath,
    field_id: FieldIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.delete_field(
        db,
        tenant_id,
        field_id,
        current_user=current_user,
    )
