from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.platform.search import service
from app.modules.platform.search.schemas import PlatformSearchRequest, PlatformSearchResponse
from app.modules.platform.shared.dependencies import require_tenant
from app.modules.users.models import User

TenantIdPath = Annotated[
    int,
    Path(..., description="Идентификатор tenant (portal).", ge=1),
]

platform_search_router = APIRouter(
    prefix="/platform/search",
    tags=["platform-search"],
)


@platform_search_router.post(
    "/tenants/{tenant_id}",
    response_model=PlatformSearchResponse,
)
def platform_search(
    tenant_id: TenantIdPath,
    payload: PlatformSearchRequest,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant),
    user: User = Depends(get_current_user),
):
    return service.execute_platform_search(
        db,
        tenant_id=tenant_id,
        user=user,
        payload=payload,
    )
