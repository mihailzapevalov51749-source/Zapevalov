"""CRUD helpers for platform module manifests."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_modules.manifest_constants import PlatformModuleManifestStatus
from app.modules.platform_modules.manifest_models import PlatformModuleManifest


def list_platform_module_manifests(db: Session) -> list[PlatformModuleManifest]:
    return (
        db.query(PlatformModuleManifest)
        .order_by(
            PlatformModuleManifest.module_key.asc(),
            PlatformModuleManifest.manifest_version.desc(),
        )
        .all()
    )


def get_active_manifest_for_module(
    db: Session,
    module_key: str,
) -> PlatformModuleManifest | None:
    normalized_key = str(module_key or "").strip()
    if not normalized_key:
        return None

    return (
        db.query(PlatformModuleManifest)
        .filter(
            PlatformModuleManifest.module_key == normalized_key,
            PlatformModuleManifest.status == PlatformModuleManifestStatus.ACTIVE,
        )
        .order_by(PlatformModuleManifest.manifest_version.desc())
        .first()
    )


def get_manifest_by_module_and_version(
    db: Session,
    *,
    module_key: str,
    manifest_version: str,
) -> PlatformModuleManifest | None:
    return (
        db.query(PlatformModuleManifest)
        .filter(
            PlatformModuleManifest.module_key == module_key,
            PlatformModuleManifest.manifest_version == manifest_version,
        )
        .one_or_none()
    )
