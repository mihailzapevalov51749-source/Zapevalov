from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.control_plane.platform_identity.principal.pilot import apply_principal_pilot_headers
from app.modules.control_plane.platform_identity.principal.resolver import get_current_principal
from app.modules.control_plane.platform_identity.principal.types import Principal
from app.modules.control_plane.platform_identity.session_bridge.dependencies import (
    require_platform_owner_principal,
)

from .environment_bridge_mint_service import mint_template_environment_bridge_ticket
from .schemas import (
    PlatformEnvironmentBridgeTicketResponse,
    PlatformEnvironmentDetail,
    PlatformEnvironmentListItem,
)
from .service import get_platform_environment, list_platform_environments

router = APIRouter(
    prefix="/control-plane/platform-environments",
    tags=["Control Plane — Platform Environments"],
)


@router.get("", response_model=list[PlatformEnvironmentListItem])
def list_platform_environments_endpoint(
    response: Response,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
    principal: Principal = Depends(get_current_principal),
):
    apply_principal_pilot_headers(response, principal)
    return list_platform_environments(db)


@router.post(
    "/{portal_id}/bridge-ticket",
    response_model=PlatformEnvironmentBridgeTicketResponse,
    status_code=status.HTTP_201_CREATED,
)
def mint_platform_environment_bridge_ticket_endpoint(
    portal_id: int,
    principal=Depends(require_platform_owner_principal),
):
    return mint_template_environment_bridge_ticket(
        principal=principal,
        portal_id=portal_id,
    )


@router.get("/{portal_id}", response_model=PlatformEnvironmentDetail)
def get_platform_environment_endpoint(
    portal_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    item = get_platform_environment(db, portal_id=portal_id)
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Среда не найдена",
        )
    return item
