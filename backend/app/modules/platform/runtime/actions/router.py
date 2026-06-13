from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.runtime.actions import service
from app.modules.platform.runtime.actions.schemas import PublishedRuntimeAction
from app.modules.platform.shared.dependencies import require_tenant_membership

TenantIdPath = Annotated[
    int,
    Path(..., description="Идентификатор tenant (portal).", ge=1),
]

ObjectTypeKeyPath = Annotated[
    str,
    Path(..., description="Ключ ObjectType из published catalog.", max_length=64),
]

PlacementKeyPath = Annotated[
    str,
    Path(..., description="Ключ placement из published catalog.", max_length=64),
]

actions_router = APIRouter(
    prefix="/actions",
    tags=["runtime-actions"],
)


@actions_router.get(
    "/tenants/{tenant_id}/{object_type_key}/{placement_key}",
    response_model=list[PublishedRuntimeAction],
)
def list_actions_for_placement(
    tenant_id: TenantIdPath,
    object_type_key: ObjectTypeKeyPath,
    placement_key: PlacementKeyPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
):
    return service.get_actions_for_placement(
        db,
        tenant_id,
        object_type_key,
        placement_key,
    )
