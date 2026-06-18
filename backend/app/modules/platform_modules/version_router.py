"""Read-only API for platform module versions registry."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_modules import version_service
from app.modules.platform_modules.version_schemas import PlatformModuleVersionOut
from app.modules.users.models import User

versions_router = APIRouter(
    prefix="/platform/module-versions",
    tags=["Platform Module Versions"],
)


@versions_router.get("", response_model=list[PlatformModuleVersionOut])
def list_platform_module_versions_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return version_service.list_platform_module_versions(db)
