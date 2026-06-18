"""Read-only API for tenant modules registry."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.tenant_modules import service
from app.modules.tenant_modules.dependencies import require_tenant_modules_reader
from app.modules.tenant_modules.schemas import TenantModuleDetailOut, TenantModuleOut
from app.modules.tenant_module_update_offers import service as offer_service
from app.modules.tenant_module_update_offers.schemas import TenantModuleUpdateOfferOut

router = APIRouter(
    prefix="/tenants/{tenant_id}/modules",
    tags=["Tenant Modules"],
)


@router.get("", response_model=list[TenantModuleOut])
def list_tenant_modules_endpoint(
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    return service.list_tenant_modules(db, tenant_id)


@router.get("/{module_key}/offers", response_model=list[TenantModuleUpdateOfferOut])
def list_tenant_module_offers_endpoint(
    module_key: str,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    tenant_module = service.get_tenant_module(
        db,
        tenant_id=tenant_id,
        module_key=module_key,
    )
    if tenant_module is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Модуль компании не установлен",
        )
    return offer_service.list_module_offers(db, tenant_id=tenant_id, module_key=module_key)


@router.get("/{module_key}", response_model=TenantModuleDetailOut)
def get_tenant_module_endpoint(
    module_key: str,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    tenant_module = service.get_tenant_module(
        db,
        tenant_id=tenant_id,
        module_key=module_key,
    )
    if tenant_module is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Модуль компании не установлен",
        )
    return tenant_module
