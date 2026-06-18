"""Read-only API for platform module manifests."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_modules import manifest_service
from app.modules.platform_modules.manifest_schemas import PlatformModuleManifestOut
from app.modules.users.models import User

manifests_router = APIRouter(
    prefix="/platform/module-manifests",
    tags=["Platform Module Manifests"],
)


@manifests_router.get("", response_model=list[PlatformModuleManifestOut])
def list_platform_module_manifests_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return manifest_service.list_platform_module_manifests(db)
