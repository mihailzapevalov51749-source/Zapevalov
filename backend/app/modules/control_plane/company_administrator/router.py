from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.control_plane.company_administrator.schemas import (
    ChangeCompanyAdministratorRequest,
    CompanyAdministratorActionResponse,
    CompanyTenantUsersResponse,
    InviteCompanyAdministratorRequest,
)
from app.modules.control_plane.company_administrator.service import (
    change_company_administrator,
    invite_company_administrator,
    list_company_tenant_users,
)
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.users.models import User

router = APIRouter(
    prefix="/control-plane/tenants",
    tags=["Control Plane — Company Administrator"],
)


@router.get("/{tenant_id}/users", response_model=CompanyTenantUsersResponse)
def list_company_tenant_users_endpoint(
    tenant_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return list_company_tenant_users(db, tenant_id)


@router.post(
    "/{tenant_id}/administrator/change",
    response_model=CompanyAdministratorActionResponse,
    status_code=status.HTTP_200_OK,
)
def change_company_administrator_endpoint(
    tenant_id: int,
    payload: ChangeCompanyAdministratorRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    return change_company_administrator(
        db,
        tenant_id=tenant_id,
        payload=payload,
        current_user=current_user,
    )


@router.post(
    "/{tenant_id}/administrator/invite",
    response_model=CompanyAdministratorActionResponse,
    status_code=status.HTTP_201_CREATED,
)
def invite_company_administrator_endpoint(
    tenant_id: int,
    payload: InviteCompanyAdministratorRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    return invite_company_administrator(
        db,
        tenant_id=tenant_id,
        payload=payload,
        current_user=current_user,
    )
