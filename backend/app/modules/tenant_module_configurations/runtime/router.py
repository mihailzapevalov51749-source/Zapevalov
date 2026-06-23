"""Runtime API for tenant module configuration consumption."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.platform.shared.dependencies import require_tenant_membership
from app.modules.tenant_module_configurations.runtime.cache import (
    list_runtime_configuration_cache_diagnostics,
)
from app.modules.tenant_module_configurations.runtime.schemas import (
    RuntimeModuleConfigurationCacheEntryOut,
    RuntimeModuleConfigurationOut,
)
from app.modules.tenant_module_configurations.runtime.service import (
    get_runtime_module_configuration,
)
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.users.models import User

TenantIdPath = Annotated[int, Path(..., ge=1)]
ModuleKeyPath = Annotated[str, Path(..., min_length=1)]

runtime_module_configuration_router = APIRouter(
    tags=["Runtime Module Configuration"],
)

platform_runtime_configuration_router = APIRouter(
    prefix="/platform/modules",
    tags=["Runtime Module Configuration"],
)


@runtime_module_configuration_router.get(
    "/tenants/{tenant_id}/modules/{module_key}/configuration",
    response_model=RuntimeModuleConfigurationOut,
)
def get_runtime_module_configuration_endpoint(
    tenant_id: TenantIdPath,
    module_key: ModuleKeyPath,
    db: Session = Depends(get_db),
    _tenant: int = Depends(require_tenant_membership),
):
    try:
        return get_runtime_module_configuration(
            db,
            tenant_id=tenant_id,
            module_key=module_key,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@platform_runtime_configuration_router.get(
    "/runtime-configuration-cache",
    response_model=list[RuntimeModuleConfigurationCacheEntryOut],
)
def list_runtime_configuration_cache_endpoint(
    _admin: User = Depends(require_platform_admin),
):
    return list_runtime_configuration_cache_diagnostics()
