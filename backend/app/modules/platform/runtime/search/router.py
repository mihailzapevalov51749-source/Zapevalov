from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    require_runtime_actor,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.platform.runtime.search import service
from app.modules.platform.runtime.search.schemas import RuntimeSearchRequest, RuntimeSearchResponse
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.users.models import User

TenantIdPath = Annotated[
    int,
    Path(..., description="Идентификатор tenant (portal).", ge=1),
]

search_router = APIRouter(
    prefix="/search",
    tags=["runtime-search"],
)


@search_router.post(
    "/tenants/{tenant_id}",
    response_model=RuntimeSearchResponse,
)
def runtime_search(
    tenant_id: TenantIdPath,
    payload: RuntimeSearchRequest,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
    _actor: RuntimeDesignerActor = Depends(require_runtime_actor),
):
    return service.execute_runtime_search(
        db,
        tenant_id=tenant_id,
        payload=payload,
    )
