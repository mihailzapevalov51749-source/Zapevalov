from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.runtime.relation_instances import service
from app.modules.platform.runtime.relation_instances.schemas import (
    RelationInstanceCreate,
    RelationInstanceListItem,
    RelationInstanceRead,
)
from app.modules.platform.shared.dependencies import require_tenant

TenantIdPath = Annotated[
    int,
    Path(..., description="Идентификатор tenant (portal).", ge=1),
]

RelationKeyPath = Annotated[
    str,
    Path(..., description="Ключ Relation из published catalog.", max_length=64),
]

EntityIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор runtime entity."),
]

RelationInstanceIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор runtime relation instance."),
]

relations_router = APIRouter(
    prefix="/relations",
    tags=["runtime-relations"],
)


@relations_router.get(
    "/tenants/{tenant_id}/entities/{entity_id}/outgoing",
    response_model=list[RelationInstanceListItem],
)
def list_outgoing_relations(
    tenant_id: TenantIdPath,
    entity_id: EntityIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.list_outgoing(db, tenant_id, entity_id)


@relations_router.get(
    "/tenants/{tenant_id}/entities/{entity_id}/incoming",
    response_model=list[RelationInstanceListItem],
)
def list_incoming_relations(
    tenant_id: TenantIdPath,
    entity_id: EntityIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.list_incoming(db, tenant_id, entity_id)


@relations_router.get(
    "/tenants/{tenant_id}/entities/{entity_id}",
    response_model=list[RelationInstanceListItem],
)
def list_entity_relations(
    tenant_id: TenantIdPath,
    entity_id: EntityIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.list_for_entity(db, tenant_id, entity_id)


@relations_router.post(
    "/tenants/{tenant_id}/{relation_key}",
    response_model=RelationInstanceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_relation_instance(
    tenant_id: TenantIdPath,
    relation_key: RelationKeyPath,
    payload: RelationInstanceCreate,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.create_relation_instance(db, tenant_id, relation_key, payload)


@relations_router.get(
    "/tenants/{tenant_id}/{relation_key}",
    response_model=list[RelationInstanceListItem],
)
def list_relation_instances(
    tenant_id: TenantIdPath,
    relation_key: RelationKeyPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.list_by_relation_key(db, tenant_id, relation_key)


@relations_router.delete(
    "/tenants/{tenant_id}/{relation_instance_id}",
    response_model=RelationInstanceRead,
)
def delete_relation_instance(
    tenant_id: TenantIdPath,
    relation_instance_id: RelationInstanceIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.delete_relation_instance(db, tenant_id, relation_instance_id)
