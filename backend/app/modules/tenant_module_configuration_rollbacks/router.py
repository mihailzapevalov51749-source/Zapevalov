"""API for tenant module configuration rollbacks."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.tenant_module_configuration_rollbacks.exceptions import RollbackPreconditionError
from app.modules.tenant_module_configuration_rollbacks.rollback_service import rollback_module_configuration
from app.modules.tenant_module_configuration_rollbacks import service
from app.modules.tenant_module_configuration_rollbacks.schemas import (
    TenantModuleConfigurationRollbackListItemOut,
    TenantModuleConfigurationRollbackOut,
    TenantModuleConfigurationRollbackResultOut,
)
from app.modules.tenant_modules.dependencies import require_tenant_modules_reader
from app.modules.users.models import User

tenant_rollbacks_router = APIRouter(
    prefix="/tenants/{tenant_id}",
    tags=["Tenant Module Configuration Rollbacks"],
)

platform_rollbacks_router = APIRouter(
    prefix="/platform/module-rollbacks",
    tags=["Tenant Module Configuration Rollbacks"],
)


@tenant_rollbacks_router.post(
    "/module-applies/{apply_id}/rollback",
    response_model=TenantModuleConfigurationRollbackResultOut,
)
def rollback_tenant_module_configuration_endpoint(
    apply_id: int,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = rollback_module_configuration(
            db,
            tenant_id=tenant_id,
            apply_id=apply_id,
            rolled_back_by=current_user,
        )
    except RollbackPreconditionError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.message,
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось выполнить rollback конфигурации модуля",
        ) from exc

    return TenantModuleConfigurationRollbackResultOut(**result)


@tenant_rollbacks_router.get(
    "/module-rollbacks",
    response_model=list[TenantModuleConfigurationRollbackOut],
)
def list_tenant_module_rollbacks_endpoint(
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    return service.list_tenant_rollbacks(db, tenant_id)


@tenant_rollbacks_router.get(
    "/module-rollbacks/{rollback_id}",
    response_model=TenantModuleConfigurationRollbackOut,
)
def get_tenant_module_rollback_endpoint(
    rollback_id: int,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    rollback_row = service.get_tenant_rollback(db, tenant_id=tenant_id, rollback_id=rollback_id)
    if rollback_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rollback конфигурации модуля не найден",
        )
    return rollback_row


@platform_rollbacks_router.get(
    "",
    response_model=list[TenantModuleConfigurationRollbackListItemOut],
)
def list_all_module_rollbacks_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_all_rollbacks(db)
