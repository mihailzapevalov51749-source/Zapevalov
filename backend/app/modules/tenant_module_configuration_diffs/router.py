"""Read-only API for tenant module configuration diffs."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.tenant_module_configuration_diffs import service
from app.modules.tenant_module_configuration_diffs.schemas import (
    TenantModuleConfigurationDiffListItemOut,
    TenantModuleConfigurationDiffOut,
)
from app.modules.tenant_modules.dependencies import require_tenant_modules_reader
from app.modules.users.models import User

tenant_configuration_diffs_router = APIRouter(
    prefix="/tenants/{tenant_id}",
    tags=["Tenant Module Configuration Diffs"],
)

platform_configuration_diffs_router = APIRouter(
    prefix="/platform/module-configuration-diffs",
    tags=["Tenant Module Configuration Diffs"],
)


@tenant_configuration_diffs_router.get(
    "/modules/{module_key}/configuration-diff",
    response_model=TenantModuleConfigurationDiffOut,
)
def get_tenant_module_configuration_diff_endpoint(
    module_key: str,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    diff = service.get_module_configuration_diff(
        db,
        tenant_id=tenant_id,
        module_key=module_key,
    )
    if diff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration diff для модуля компании не найден",
        )
    return diff


@tenant_configuration_diffs_router.get(
    "/module-update-offers/{offer_id}/configuration-diff",
    response_model=TenantModuleConfigurationDiffOut,
)
def get_tenant_module_update_offer_configuration_diff_endpoint(
    offer_id: int,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    diff = service.get_offer_configuration_diff(
        db,
        tenant_id=tenant_id,
        offer_id=offer_id,
    )
    if diff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration diff для предложения обновления не найден",
        )
    return diff


@platform_configuration_diffs_router.get(
    "",
    response_model=list[TenantModuleConfigurationDiffListItemOut],
)
def list_all_module_configuration_diffs_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_all_configuration_diffs(db)


@platform_configuration_diffs_router.get(
    "/{diff_id}",
    response_model=TenantModuleConfigurationDiffOut,
)
def get_platform_module_configuration_diff_endpoint(
    diff_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    diff = service.get_configuration_diff_by_id(db, diff_id)
    if diff is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration diff не найден",
        )
    return diff
