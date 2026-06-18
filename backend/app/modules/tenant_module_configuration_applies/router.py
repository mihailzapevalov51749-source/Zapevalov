"""API for tenant module configuration applies."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.tenant_module_configuration_applies.apply_service import (
    ApplyPreconditionError,
    apply_module_configuration_update,
)
from app.modules.tenant_module_configuration_applies import service
from app.modules.tenant_module_configuration_applies.schemas import (
    TenantModuleConfigurationApplyListItemOut,
    TenantModuleConfigurationApplyOut,
    TenantModuleConfigurationApplyResultOut,
)
from app.modules.tenant_modules.dependencies import require_tenant_modules_reader
from app.modules.users.models import User

tenant_applies_router = APIRouter(
    prefix="/tenants/{tenant_id}",
    tags=["Tenant Module Configuration Applies"],
)

platform_applies_router = APIRouter(
    prefix="/platform/module-applies",
    tags=["Tenant Module Configuration Applies"],
)


@tenant_applies_router.post(
    "/module-update-offers/{offer_id}/apply",
    response_model=TenantModuleConfigurationApplyResultOut,
)
def apply_tenant_module_configuration_endpoint(
    offer_id: int,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = apply_module_configuration_update(
            db,
            tenant_id=tenant_id,
            offer_id=offer_id,
            applied_by=current_user,
        )
    except ApplyPreconditionError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.message,
        ) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось применить конфигурацию модуля",
        ) from exc

    return TenantModuleConfigurationApplyResultOut(**result)


@tenant_applies_router.get(
    "/module-applies",
    response_model=list[TenantModuleConfigurationApplyOut],
)
def list_tenant_module_applies_endpoint(
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    return service.list_tenant_applies(db, tenant_id)


@tenant_applies_router.get(
    "/module-applies/{apply_id}",
    response_model=TenantModuleConfigurationApplyOut,
)
def get_tenant_module_apply_endpoint(
    apply_id: int,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    apply_row = service.get_tenant_apply(db, tenant_id=tenant_id, apply_id=apply_id)
    if apply_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Apply конфигурации модуля не найден",
        )
    return apply_row


@platform_applies_router.get(
    "",
    response_model=list[TenantModuleConfigurationApplyListItemOut],
)
def list_all_module_applies_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_all_applies(db)
