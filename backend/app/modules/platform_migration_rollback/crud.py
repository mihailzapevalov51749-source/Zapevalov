"""CRUD for platform version schema catalog."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_migration_rollback.models import PlatformVersionSchemaCatalog


def list_schema_catalog(db: Session) -> list[PlatformVersionSchemaCatalog]:
    return (
        db.query(PlatformVersionSchemaCatalog)
        .order_by(PlatformVersionSchemaCatalog.platform_version.asc())
        .all()
    )


def get_schema_binding(
    db: Session,
    platform_version: str,
) -> PlatformVersionSchemaCatalog | None:
    return (
        db.query(PlatformVersionSchemaCatalog)
        .filter(PlatformVersionSchemaCatalog.platform_version == platform_version)
        .one_or_none()
    )


def upsert_schema_binding(
    db: Session,
    *,
    platform_version: str,
    schema_revision: str,
    rollback_mode_default: str,
    notes: str | None = None,
    commit: bool = True,
) -> PlatformVersionSchemaCatalog:
    row = get_schema_binding(db, platform_version)
    if row is None:
        row = PlatformVersionSchemaCatalog(platform_version=platform_version)
        db.add(row)
    row.schema_revision = schema_revision
    row.rollback_mode_default = rollback_mode_default
    row.notes = notes
    if commit:
        db.commit()
        db.refresh(row)
    else:
        db.flush()
    return row
