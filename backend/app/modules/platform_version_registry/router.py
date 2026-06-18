"""Platform version registry API (read-only in Phase 1)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_version_registry import service
from app.modules.platform_version_registry.schemas import (
    PlatformEnvironmentVersionOut,
    PlatformVersionHistoryOut,
    PlatformVersionRegistrySummaryOut,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/platform/version-registry",
    tags=["Platform Version Registry"],
)


@router.get("/current", response_model=list[PlatformEnvironmentVersionOut])
def list_current_versions_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_current_environment_versions(db)


@router.get("/history", response_model=list[PlatformVersionHistoryOut])
def list_version_history_endpoint(
    tenant_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_environment_version_history(db, tenant_id=tenant_id)


@router.get("/summary", response_model=PlatformVersionRegistrySummaryOut)
def get_version_registry_summary_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.get_version_registry_summary(db)
