"""Portal public_slug resolution and validation."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.models import Portal
from app.modules.portals.repository import find_portal_by_public_slug
from app.shared.public_slug import (
    normalize_public_slug,
    slugify_public_slug,
    validate_public_slug_or_raise,
)


class PublicSlugConflictError(ValueError):
    pass


def generate_public_slug_from_label(label: str) -> str:
    return slugify_public_slug(label)


def _find_platform_settings_by_public_slug(
    db: Session,
    public_slug: str,
    *,
    exclude_settings_id: int | None = None,
) -> PlatformSettings | None:
    query = db.query(PlatformSettings).filter(PlatformSettings.public_slug == public_slug)
    if exclude_settings_id is not None:
        query = query.filter(PlatformSettings.id != exclude_settings_id)
    return query.one_or_none()


def assert_public_slug_available(
    db: Session,
    public_slug: str,
    *,
    exclude_portal_id: int | None = None,
) -> str:
    normalized = validate_public_slug_or_raise(public_slug)
    existing = find_portal_by_public_slug(db, normalized, exclude_portal_id=exclude_portal_id)
    if existing is not None:
        raise PublicSlugConflictError(
            f"Публичный адрес «{normalized}» уже используется другой компанией"
        )
    platform_row = _find_platform_settings_by_public_slug(db, normalized)
    if platform_row is not None:
        raise PublicSlugConflictError(
            f"Публичный адрес «{normalized}» уже используется платформой"
        )
    return normalized


def assert_platform_public_slug_available(
    db: Session,
    public_slug: str,
    *,
    exclude_settings_id: int | None = PLATFORM_SETTINGS_SINGLETON_ID,
) -> str:
    normalized = validate_public_slug_or_raise(public_slug)
    existing_portal = find_portal_by_public_slug(db, normalized)
    if existing_portal is not None:
        raise PublicSlugConflictError(
            f"Публичный адрес «{normalized}» уже используется компанией"
        )
    existing_settings = _find_platform_settings_by_public_slug(
        db,
        normalized,
        exclude_settings_id=exclude_settings_id,
    )
    if existing_settings is not None:
        raise PublicSlugConflictError(
            f"Публичный адрес «{normalized}» уже используется платформой"
        )
    return normalized


def resolve_portal_public_slug_for_create(
    db: Session,
    *,
    short_name: str | None,
    company_name: str,
) -> str:
    source = str(short_name or "").strip() or str(company_name or "").strip()
    candidate = generate_public_slug_from_label(source)
    if find_portal_by_public_slug(db, candidate) is None:
        return validate_public_slug_or_raise(candidate)

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"Публичный адрес «{candidate}» уже занят. Выберите другой адрес вручную.",
    )


def resolve_portal_public_slug_for_update(
    portal: Portal,
    *,
    short_name: str | None,
    company_name: str,
    requested_public_slug: str | None,
    requested_public_slug_locked: bool | None = None,
) -> tuple[str, bool]:
    auto_slug = generate_public_slug_from_label(
        str(short_name or "").strip() or str(company_name or "").strip()
    )
    locked = (
        bool(portal.public_slug_locked)
        if requested_public_slug_locked is None
        else bool(requested_public_slug_locked)
    )
    requested = normalize_public_slug(requested_public_slug)

    if locked:
        if requested:
            return requested, True
        current = normalize_public_slug(portal.public_slug)
        if current:
            return current, True
        return auto_slug, False

    if requested and requested != auto_slug:
        return requested, True

    return auto_slug, False


def resolve_platform_public_slug_for_update(
    row: PlatformSettings,
    *,
    short_name: str,
    requested_public_slug: str | None,
    requested_public_slug_locked: bool | None = None,
) -> tuple[str, bool]:
    """Resolve platform public_slug using the same rules as tenant general settings."""
    auto_slug = generate_public_slug_from_label(short_name.strip())
    locked = (
        bool(row.public_slug_locked)
        if requested_public_slug_locked is None
        else bool(requested_public_slug_locked)
    )
    requested = normalize_public_slug(requested_public_slug)

    if locked:
        if requested:
            return requested, True
        current = normalize_public_slug(row.public_slug)
        if current:
            return current, True
        return auto_slug, False

    if requested and requested != auto_slug:
        return requested, True

    return auto_slug, False
