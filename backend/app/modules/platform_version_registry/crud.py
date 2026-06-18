"""Database operations for platform version registry."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)


def get_current_version_for_tenant(
    db: Session,
    tenant_id: int,
) -> PlatformEnvironmentVersion | None:
    return (
        db.query(PlatformEnvironmentVersion)
        .filter(PlatformEnvironmentVersion.tenant_id == tenant_id)
        .one_or_none()
    )


def list_current_versions(db: Session) -> list[PlatformEnvironmentVersion]:
    return (
        db.query(PlatformEnvironmentVersion)
        .order_by(
            PlatformEnvironmentVersion.environment_key.asc(),
            PlatformEnvironmentVersion.tenant_id.asc(),
        )
        .all()
    )


def list_version_history(
    db: Session,
    *,
    tenant_id: int | None = None,
    limit: int = 200,
) -> list[PlatformVersionHistory]:
    query = db.query(PlatformVersionHistory).order_by(
        PlatformVersionHistory.recorded_at.desc(),
        PlatformVersionHistory.id.desc(),
    )
    if tenant_id is not None:
        query = query.filter(PlatformVersionHistory.tenant_id == tenant_id)
    return query.limit(limit).all()


def build_active_platform_version_map(db: Session) -> dict[int, str]:
    """Return tenant_id -> platform_version for active registry rows."""
    rows = list_current_versions(db)
    return {
        row.tenant_id: str(row.platform_version)
        for row in rows
        if row.platform_version
    }
