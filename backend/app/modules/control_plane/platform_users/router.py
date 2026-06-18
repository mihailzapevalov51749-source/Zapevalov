from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.control_plane.platform_identity.principal.pilot import apply_principal_pilot_headers
from app.modules.control_plane.platform_identity.principal.resolver import get_current_principal
from app.modules.control_plane.platform_identity.principal.types import Principal
from app.modules.control_plane.platform_users.registry_service import list_platform_users
from app.modules.control_plane.platform_users.schemas import PlatformRegistryUserRead
from app.modules.users.models import User

router = APIRouter(
    prefix="/control-plane/platform-users",
    tags=["Control Plane — Platform Users"],
)


@router.get("", response_model=list[PlatformRegistryUserRead])
def get_platform_users_endpoint(
    response: Response,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
    principal: Principal = Depends(get_current_principal),
):
    apply_principal_pilot_headers(response, principal)
    return list_platform_users(db, sync_owner=True)