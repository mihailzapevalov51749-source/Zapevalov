"""Read-only API for tenant module update offers."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.tenant_module_update_offers import service
from app.modules.tenant_module_update_offers import crud as offers_crud
from app.modules.tenant_module_update_offers.schemas import (
    TenantModuleUpdateOfferDetailOut,
    TenantModuleUpdateOfferOut,
)
from app.modules.tenant_module_update_previews import service as preview_service
from app.modules.tenant_module_update_previews.schemas import TenantModuleUpdatePreviewDetailOut
from app.modules.tenant_modules.dependencies import require_tenant_modules_reader
from app.modules.users.models import User

tenant_offers_router = APIRouter(
    prefix="/tenants/{tenant_id}/module-update-offers",
    tags=["Tenant Module Update Offers"],
)

platform_offers_router = APIRouter(
    prefix="/platform/module-update-offers",
    tags=["Tenant Module Update Offers"],
)


@platform_offers_router.get("", response_model=list[TenantModuleUpdateOfferOut])
def list_all_module_update_offers_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_all_offers(db)


@tenant_offers_router.get("", response_model=list[TenantModuleUpdateOfferOut])
def list_tenant_module_update_offers_endpoint(
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    return service.list_tenant_offers(db, tenant_id)


@tenant_offers_router.get("/{offer_id}", response_model=TenantModuleUpdateOfferDetailOut)
def get_tenant_module_update_offer_endpoint(
    offer_id: int,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    offer = service.get_tenant_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Предложение обновления модуля не найдено",
        )
    return offer


@tenant_offers_router.get("/{offer_id}/preview", response_model=TenantModuleUpdatePreviewDetailOut)
def get_tenant_module_update_offer_preview_endpoint(
    offer_id: int,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    offer = service.get_tenant_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Предложение обновления модуля не найдено",
        )

    preview = preview_service.get_preview_for_offer(db, tenant_id=tenant_id, offer_id=offer_id)
    if preview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Предпросмотр обновления модуля не найден",
        )
    return preview
