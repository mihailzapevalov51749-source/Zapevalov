from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.tenant_environment.constants import TenantStatus, TenantType

from .schemas import TenantRegistryDetail, TenantRegistryListItem, TenantRegistrySummary
from .service import get_tenant_registry_item, list_tenant_registry, summarize_tenant_registry

router = APIRouter(
    prefix="/control-plane/tenants",
    tags=["Control Plane — Tenant Registry"],
)


@router.get("", response_model=list[TenantRegistryListItem])
def list_tenants_registry_endpoint(
    tenant_type: TenantType | None = Query(default=None, alias="type"),
    tenant_status: TenantStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    return list_tenant_registry(
        db,
        tenant_type=tenant_type,
        tenant_status=tenant_status,
        search=search,
    )


@router.get("/summary", response_model=TenantRegistrySummary)
def tenant_registry_summary_endpoint(
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    return summarize_tenant_registry(db)


@router.get("/{tenant_id}", response_model=TenantRegistryDetail)
def get_tenant_registry_endpoint(
    tenant_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_platform_admin),
):
    item = get_tenant_registry_item(db, tenant_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant не найден",
        )

    return item
