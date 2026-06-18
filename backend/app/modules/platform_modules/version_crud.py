"""CRUD helpers for platform module versions."""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.modules.platform_modules.version_constants import PlatformModuleVersionStatus
from app.modules.platform_modules.version_models import PlatformModuleVersion, PlatformReleaseModule


def _version_sort_key(version: str) -> tuple[int, int, int, str]:
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)(.*)$", str(version or "0.0.0"))
    if not match:
        return (0, 0, 0, str(version))
    major, minor, patch, suffix = match.groups()
    return (int(major), int(minor), int(patch), suffix)


def list_platform_module_versions(db: Session) -> list[PlatformModuleVersion]:
    rows = db.query(PlatformModuleVersion).all()
    return sorted(
        rows,
        key=lambda item: (item.module_key, _version_sort_key(item.version)),
    )


def list_module_versions(db: Session, module_key: str) -> list[PlatformModuleVersion]:
    rows = (
        db.query(PlatformModuleVersion)
        .filter(PlatformModuleVersion.module_key == module_key)
        .all()
    )
    return sorted(rows, key=lambda item: _version_sort_key(item.version), reverse=True)


def get_module_version(
    db: Session,
    *,
    module_key: str,
    version: str,
) -> PlatformModuleVersion | None:
    return (
        db.query(PlatformModuleVersion)
        .filter(
            PlatformModuleVersion.module_key == module_key,
            PlatformModuleVersion.version == version,
        )
        .one_or_none()
    )


def get_latest_module_version(db: Session, module_key: str) -> PlatformModuleVersion | None:
    rows = (
        db.query(PlatformModuleVersion)
        .filter(
            PlatformModuleVersion.module_key == module_key,
            PlatformModuleVersion.status == PlatformModuleVersionStatus.RELEASED,
        )
        .all()
    )
    if not rows:
        rows = (
            db.query(PlatformModuleVersion)
            .filter(PlatformModuleVersion.module_key == module_key)
            .all()
        )
    if not rows:
        return None

    return max(
        rows,
        key=lambda item: (
            _version_sort_key(item.version),
            item.release_date or item.created_at,
        ),
    )


def list_release_modules(db: Session, release_id: int) -> list[PlatformReleaseModule]:
    return (
        db.query(PlatformReleaseModule)
        .filter(PlatformReleaseModule.release_id == release_id)
        .order_by(PlatformReleaseModule.module_key.asc())
        .all()
    )
