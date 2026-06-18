"""Migration rollback foundation API (read-only)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform_migration_rollback import service
from app.modules.platform_migration_rollback.schemas import (
    MigrationRollbackFoundationSummaryOut,
    MigrationRollbackPolicyOut,
    PlatformVersionSchemaCatalogOut,
)
from app.modules.users.models import User

router = APIRouter(
    prefix="/platform/migration-rollback",
    tags=["Platform Migration Rollback Foundation"],
)


@router.get("/policy", response_model=MigrationRollbackPolicyOut)
def get_rollback_policy_endpoint(
    _admin: User = Depends(require_platform_admin),
):
    return service.get_migration_rollback_policy()


@router.get("/schema-catalog", response_model=list[PlatformVersionSchemaCatalogOut])
def list_schema_catalog_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.list_schema_catalog(db)


@router.get("/summary", response_model=MigrationRollbackFoundationSummaryOut)
def get_foundation_summary_endpoint(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_platform_admin),
):
    return service.get_foundation_summary(db)
