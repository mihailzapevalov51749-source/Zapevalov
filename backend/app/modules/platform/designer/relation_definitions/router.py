from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.designer.relation_definitions import service
from app.modules.platform.shared.dependencies import require_designer_user
from app.modules.users.models import User
from app.modules.platform.designer.relation_definitions.schemas import (
    RelationDefinitionCreate,
    RelationDefinitionListItem,
    RelationDefinitionRead,
    RelationDefinitionUpdate,
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

RelationIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор RelationDefinition. Только path parameter."),
]

relations_router = APIRouter(tags=["designer-relation-definitions"])

object_type_relations_router = APIRouter(tags=["designer-relation-definitions"])


@relations_router.get("", response_model=list[RelationDefinitionListItem])
def list_relations(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
):
    return service.list_relations(db, tenant_id)


@relations_router.post(
    "",
    response_model=RelationDefinitionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_relation(
    tenant_id: TenantIdPath,
    payload: RelationDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.create_relation(db, tenant_id, payload, current_user=current_user)


@relations_router.get("/{relation_id}", response_model=RelationDefinitionRead)
def get_relation(
    tenant_id: TenantIdPath,
    relation_id: RelationIdPath,
    db: Session = Depends(get_db),
):
    return service.get_relation(db, tenant_id, relation_id)


@relations_router.patch("/{relation_id}", response_model=RelationDefinitionRead)
def update_relation(
    tenant_id: TenantIdPath,
    relation_id: RelationIdPath,
    payload: RelationDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.update_relation(
        db,
        tenant_id,
        relation_id,
        payload,
        current_user=current_user,
    )


@relations_router.delete("/{relation_id}", response_model=RelationDefinitionRead)
def delete_relation(
    tenant_id: TenantIdPath,
    relation_id: RelationIdPath,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_designer_user),
):
    return service.delete_relation(
        db,
        tenant_id,
        relation_id,
        current_user=current_user,
    )


@object_type_relations_router.get("", response_model=list[RelationDefinitionListItem])
def list_relations_for_object_type(
    tenant_id: TenantIdPath,
    object_type_id: ObjectTypeIdPath,
    db: Session = Depends(get_db),
):
    return service.list_relations_for_object_type(db, tenant_id, object_type_id)
