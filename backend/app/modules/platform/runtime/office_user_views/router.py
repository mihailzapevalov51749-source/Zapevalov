from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    require_runtime_tenant_actor,
    resolve_runtime_actor_user_id,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.platform.runtime.office_user_views import service
from app.modules.platform.runtime.office_user_views.schemas import (
    OfficeUserTableViewCreate,
    OfficeUserTableViewRead,
    OfficeUserTableViewStateRead,
    OfficeUserTableViewUpdate,
)
from app.modules.platform.shared.dependencies import require_tenant_membership

TenantIdPath = Annotated[int, Path(..., ge=1)]
ObjectTypeKeyPath = Annotated[str, Path(..., max_length=64)]
ViewIdPath = Annotated[UUID, Path(...)]

office_user_views_router = APIRouter(
    prefix="/office-user-views",
    tags=["runtime-office-user-views"],
)


@office_user_views_router.get(
    "/tenants/{tenant_id}/{object_type_key}",
    response_model=OfficeUserTableViewStateRead,
)
def list_office_user_table_views(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_tenant_actor),
):
    return service.list_user_table_views(
        db,
        tenant_id=tenant_id,
        owner_user_id=resolve_runtime_actor_user_id(current_actor),
        object_type_key=object_type_key,
    )


@office_user_views_router.post(
    "/tenants/{tenant_id}/{object_type_key}",
    response_model=OfficeUserTableViewRead,
    status_code=status.HTTP_201_CREATED,
)
def create_office_user_table_view(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    payload: OfficeUserTableViewCreate,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_tenant_actor),
):
    return service.create_user_table_view(
        db,
        tenant_id=tenant_id,
        owner_user_id=resolve_runtime_actor_user_id(current_actor),
        object_type_key=object_type_key,
        payload=payload,
    )


@office_user_views_router.patch(
    "/tenants/{tenant_id}/{object_type_key}/{view_id}",
    response_model=OfficeUserTableViewRead,
)
def update_office_user_table_view(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    view_id: ViewIdPath,
    payload: OfficeUserTableViewUpdate,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_tenant_actor),
):
    return service.update_user_table_view(
        db,
        tenant_id=tenant_id,
        owner_user_id=resolve_runtime_actor_user_id(current_actor),
        object_type_key=object_type_key,
        view_id=view_id,
        payload=payload,
    )


@office_user_views_router.delete(
    "/tenants/{tenant_id}/{object_type_key}/{view_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_office_user_table_view(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    view_id: ViewIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
    current_actor: RuntimeDesignerActor = Depends(require_runtime_tenant_actor),
):
    service.delete_user_table_view(
        db,
        tenant_id=tenant_id,
        owner_user_id=resolve_runtime_actor_user_id(current_actor),
        object_type_key=object_type_key,
        view_id=view_id,
    )
