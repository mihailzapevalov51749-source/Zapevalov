"""Idempotent seed/backfill for platform module versions."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.modules.platform_modules.constants import PlatformModuleStatus
from app.modules.platform_modules.manifest_models import PlatformModuleManifest
from app.modules.platform_modules.models import PlatformModule
from app.modules.platform_modules.version_constants import (
    ACTIVE_RUNTIME_MODULE_KEYS_FOR_VERSION_BACKFILL,
    DEFAULT_INITIAL_MODULE_VERSION,
    PlatformModuleVersionStatus,
)
from app.modules.platform_modules.version_models import PlatformModuleVersion
from app.modules.platform_release.models import PlatformRelease


def _resolve_manifest_for_module(
    db: Session,
    module_key: str,
) -> PlatformModuleManifest | None:
    return (
        db.query(PlatformModuleManifest)
        .filter(
            PlatformModuleManifest.module_key == module_key,
            PlatformModuleManifest.status == "active",
        )
        .order_by(PlatformModuleManifest.manifest_version.desc())
        .first()
    )


def _resolve_release_for_version(db: Session, version: str) -> PlatformRelease | None:
    return (
        db.query(PlatformRelease)
        .filter(PlatformRelease.version == version)
        .order_by(PlatformRelease.id.desc())
        .first()
    )


def seed_platform_module_versions(db: Session, *, commit: bool = True) -> dict[str, int]:
    """
    Create initial 1.0.0 versions for active runtime modules from manifests.

    Does not alter runtime behavior or tenant_modules.
    """
    created = 0
    updated = 0
    skipped = 0
    now = datetime.utcnow()

    for module_key in sorted(ACTIVE_RUNTIME_MODULE_KEYS_FOR_VERSION_BACKFILL):
        platform_module = (
            db.query(PlatformModule)
            .filter(
                PlatformModule.module_key == module_key,
                PlatformModule.status == PlatformModuleStatus.ACTIVE,
            )
            .one_or_none()
        )
        if platform_module is None:
            continue

        manifest = _resolve_manifest_for_module(db, module_key)
        version = (
            str(manifest.module_version)
            if manifest is not None
            else str(platform_module.version or DEFAULT_INITIAL_MODULE_VERSION)
        )
        manifest_version = (
            str(manifest.manifest_version)
            if manifest is not None
            else DEFAULT_INITIAL_MODULE_VERSION
        )
        change_log = manifest.release_notes if manifest is not None else None

        release = _resolve_release_for_version(db, version)
        release_date = release.published_at if release is not None else (
            manifest.created_at if manifest is not None else now
        )

        existing = (
            db.query(PlatformModuleVersion)
            .filter(
                PlatformModuleVersion.module_key == module_key,
                PlatformModuleVersion.version == version,
            )
            .one_or_none()
        )

        if existing is None:
            db.add(
                PlatformModuleVersion(
                    module_key=module_key,
                    version=version,
                    status=PlatformModuleVersionStatus.RELEASED,
                    release_id=release.id if release is not None else None,
                    release_date=release_date,
                    change_log=change_log,
                    breaking_changes=None,
                    manifest_version=manifest_version,
                    created_at=now,
                    updated_at=now,
                )
            )
            created += 1
            continue

        changed = False
        if existing.manifest_version != manifest_version:
            existing.manifest_version = manifest_version
            changed = True
        if existing.status != PlatformModuleVersionStatus.RELEASED:
            existing.status = PlatformModuleVersionStatus.RELEASED
            changed = True
        if change_log and existing.change_log != change_log:
            existing.change_log = change_log
            changed = True
        if release is not None and existing.release_id != release.id:
            existing.release_id = release.id
            changed = True
        if release_date and existing.release_date != release_date:
            existing.release_date = release_date
            changed = True

        if changed:
            existing.updated_at = now
            updated += 1
        else:
            skipped += 1

    db.flush()

    if commit:
        db.commit()

    return {"created": created, "updated": updated, "skipped": skipped}
