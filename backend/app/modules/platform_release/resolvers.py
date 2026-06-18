"""Read-only resolvers for release identifiers shared across platform contours."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_release.models import PlatformRelease
from app.modules.platform_release_package_registry.models import PlatformReleasePackage


def resolve_release_version(db: Session, release_id: int | None) -> str | None:
    """Resolve platform version by package id first, then legacy platform_releases row."""
    if release_id is None:
        return None
    package = (
        db.query(PlatformReleasePackage)
        .filter(PlatformReleasePackage.id == release_id)
        .one_or_none()
    )
    if package is not None:
        return package.platform_version
    release = db.query(PlatformRelease).filter(PlatformRelease.id == release_id).one_or_none()
    return release.version if release is not None else None
