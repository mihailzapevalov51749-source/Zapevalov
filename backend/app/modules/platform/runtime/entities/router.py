from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.runtime.entities import service
from app.modules.platform.runtime.entities.schemas import EntityCreate, EntityRead, EntityUpdate
from app.modules.platform.shared.dependencies import require_tenant

TenantIdPath = Annotated[
    int,
    Path(..., description="Идентификатор tenant (portal).", ge=1),
]

ObjectTypeKeyPath = Annotated[
    str,
    Path(..., description="Ключ ObjectType из published catalog.", max_length=64),
]

EntityIdPath = Annotated[
    UUID,
    Path(..., description="Идентификатор runtime entity."),
]

entities_router = APIRouter(
    prefix="/entities",
    tags=["runtime-entities"],
)


@entities_router.post(
    "/tenants/{tenant_id}/{object_type_key}",
    response_model=EntityRead,
    status_code=status.HTTP_201_CREATED,
)
def create_entity(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    payload: EntityCreate,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.create_entity(db, tenant_id, object_type_key, payload)


@entities_router.get(
    "/tenants/{tenant_id}/{object_type_key}",
    response_model=list[EntityRead],
)
def list_entities(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.list_entities(db, tenant_id, object_type_key)


@entities_router.get(
    "/tenants/{tenant_id}/{object_type_key}/{entity_id}",
    response_model=EntityRead,
)
def get_entity(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    entity_id: EntityIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.get_entity(db, tenant_id, object_type_key, entity_id)


@entities_router.patch(
    "/tenants/{tenant_id}/{object_type_key}/{entity_id}",
    response_model=EntityRead,
)
def update_entity(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    entity_id: EntityIdPath,
    payload: EntityUpdate,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.update_entity(db, tenant_id, object_type_key, entity_id, payload)


@entities_router.delete(
    "/tenants/{tenant_id}/{object_type_key}/{entity_id}",
    response_model=EntityRead,
)
def delete_entity(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    entity_id: EntityIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
):
    return service.delete_entity(db, tenant_id, object_type_key, entity_id)
