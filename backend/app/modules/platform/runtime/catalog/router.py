from typing import Annotated

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.platform.runtime.catalog import service
from app.modules.platform.runtime.catalog.schemas import (
    RuntimeCatalogPayload,
    RuntimeCatalogVersionInfo,
)

TenantIdPath = Annotated[
    int,
    Path(
        ...,
        description="Идентификатор tenant (portal).",
        ge=1,
    ),
]

catalog_router = APIRouter(tags=["runtime-platform-metadata"])

@catalog_router.get("/tenants/{tenant_id}/catalog", response_model=RuntimeCatalogPayload)
def get_published_catalog(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
):
    return service.get_latest_catalog(db, tenant_id)


@catalog_router.get(
    "/tenants/{tenant_id}/catalog/version",
    response_model=RuntimeCatalogVersionInfo,
)
def get_published_catalog_version(
    tenant_id: TenantIdPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
):
    return service.get_catalog_version_info(db, tenant_id)
