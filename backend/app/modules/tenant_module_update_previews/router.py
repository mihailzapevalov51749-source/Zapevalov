"""Read-only API for tenant module update previews."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.tenant_module_update_previews import service
from app.modules.tenant_module_update_previews.schemas import (
    TenantModuleUpdatePreviewDetailOut,
    TenantModuleUpdatePreviewOut,
)
from app.modules.tenant_modules.dependencies import require_tenant_modules_reader
from app.modules.users.models import User

tenant_previews_router = APIRouter(
    prefix="/tenants/{tenant_id}/module-update-previews",
    tags=["Tenant Module Update Previews"],
)

platform_previews_router = APIRouter(
    prefix="/platform/module-update-previews",
    tags=["Tenant Module Update Previews"],
)


@platform_previews_router.get("", response_model=list[TenantModuleUpdatePreviewOut])
def list_all_module_update_previews_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_all_previews(db)


@tenant_previews_router.get("", response_model=list[TenantModuleUpdatePreviewOut])
def list_tenant_module_update_previews_endpoint(
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    return service.list_tenant_previews(db, tenant_id)


@tenant_previews_router.get("/{preview_id}", response_model=TenantModuleUpdatePreviewDetailOut)
def get_tenant_module_update_preview_endpoint(
    preview_id: int,
    tenant_id: int = Depends(require_tenant_modules_reader),
    db: Session = Depends(get_db),
):
    preview = service.get_tenant_preview(db, tenant_id=tenant_id, preview_id=preview_id)
    if preview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Предпросмотр обновления модуля не найден",
        )
    return preview
