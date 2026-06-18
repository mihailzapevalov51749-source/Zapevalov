"""Read-only API for tenant module configurations."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.tenant_module_configurations.service import (
    get_tenant_module_configuration,
    list_all_configurations,
    list_tenant_configurations,
    list_tenant_module_configuration_snapshots,
)
from app.modules.tenant_module_configurations.schemas import (
    TenantModuleConfigSnapshotOut,
    TenantModuleConfigurationListItemOut,
    TenantModuleConfigurationOut,
)
from app.modules.tenant_modules.dependencies import require_tenant_modules_reader
from app.modules.users.models import User

tenant_configurations_router = APIRouter(
    prefix="/tenants/{tenant_id}",
    tags=["Tenant Module Configurations"],
)

platform_configurations_router = APIRouter(
    prefix="/platform/tenant-module-configurations",
    tags=["Tenant Module Configurations"],
)


@tenant_configurations_router.get(
    "/module-configurations",
    response_model=list[TenantModuleConfigurationOut],
)
def list_tenant_module_configurations_endpoint(
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    return list_tenant_configurations(db, tenant_id)


@tenant_configurations_router.get(
    "/modules/{module_key}/configuration",
    response_model=TenantModuleConfigurationOut,
)
def get_tenant_module_configuration_endpoint(
    module_key: str,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    configuration = get_tenant_module_configuration(
        db,
        tenant_id=tenant_id,
        module_key=module_key,
    )
    if configuration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Конфигурация модуля компании не найдена",
        )
    return configuration


@tenant_configurations_router.get(
    "/modules/{module_key}/configuration/snapshots",
    response_model=list[TenantModuleConfigSnapshotOut],
)
def list_tenant_module_configuration_snapshots_endpoint(
    module_key: str,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    configuration = get_tenant_module_configuration(
        db,
        tenant_id=tenant_id,
        module_key=module_key,
    )
    if configuration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Конфигурация модуля компании не найдена",
        )
    return list_tenant_module_configuration_snapshots(
        db,
        tenant_id=tenant_id,
        module_key=module_key,
    )


@platform_configurations_router.get(
    "",
    response_model=list[TenantModuleConfigurationListItemOut],
)
def list_all_tenant_module_configurations_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return list_all_configurations(db)
