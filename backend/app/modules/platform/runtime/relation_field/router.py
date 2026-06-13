from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.runtime.relation_field import service
from app.modules.platform.runtime.relation_field.schemas import (
    RelationFieldLinkMutation,
    RelationFieldLinkResult,
    RelationFieldMetadataRead,
    RelationFieldStateRead,
)
from app.modules.platform.shared.dependencies import require_tenant_membership

TenantIdPath = Annotated[
    int,
    Path(..., description="Идентификатор tenant (portal).", ge=1),
]

EntityIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор runtime entity."),
]

FieldKeyPath = Annotated[
    str,
    Path(..., description="Ключ relation field в published catalog.", max_length=64),
]

relation_fields_router = APIRouter(
    prefix="/relation-fields",
    tags=["runtime-relation-fields"],
)


@relation_fields_router.get(
    "/tenants/{tenant_id}/entities/{entity_id}/fields/{field_key}",
    response_model=RelationFieldStateRead,
)
def get_relation_field_state(
    tenant_id: TenantIdPath,
    entity_id: EntityIdPath,
    field_key: FieldKeyPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
):
    return service.get_relation_field_state(db, tenant_id, entity_id, field_key)


@relation_fields_router.get(
    "/tenants/{tenant_id}/entities/{entity_id}/fields/{field_key}/metadata",
    response_model=RelationFieldMetadataRead,
)
def get_relation_field_metadata(
    tenant_id: TenantIdPath,
    entity_id: EntityIdPath,
    field_key: FieldKeyPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
):
    return service.get_relation_field_metadata(db, tenant_id, entity_id, field_key)


@relation_fields_router.post(
    "/tenants/{tenant_id}/entities/{entity_id}/fields/{field_key}/links",
    response_model=RelationFieldLinkResult,
    status_code=status.HTTP_201_CREATED,
)
def create_relation_field_link(
    tenant_id: TenantIdPath,
    entity_id: EntityIdPath,
    field_key: FieldKeyPath,
    payload: RelationFieldLinkMutation,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
):
    return service.create_relation_field_link(
        db,
        tenant_id,
        entity_id,
        field_key,
        payload.target_entity_id,
    )


@relation_fields_router.delete(
    "/tenants/{tenant_id}/entities/{entity_id}/fields/{field_key}/links",
    response_model=RelationFieldLinkResult,
)
def delete_relation_field_link(
    tenant_id: TenantIdPath,
    entity_id: EntityIdPath,
    field_key: FieldKeyPath,
    payload: RelationFieldLinkMutation,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
):
    return service.delete_relation_field_link(
        db,
        tenant_id,
        entity_id,
        field_key,
        payload.target_entity_id,
    )
