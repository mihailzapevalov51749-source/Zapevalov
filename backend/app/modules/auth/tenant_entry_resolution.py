"""Resolve tenant entry metadata from public_slug."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.platform_event_journal.seed_classification import resolve_dev_tenant_portal_id
from app.modules.portals.repository import find_portal_by_public_slug, get_portal
from app.shared.public_slug import normalize_public_slug


def _build_entry(portal, *, public_slug: str) -> dict:
    display_name = str(portal.name or "").strip()
    if not display_name:
        raise ValueError("portal display name is empty")

    return {
        "tenant_id": int(portal.id),
        "public_slug": public_slug,
        "tenant_key": public_slug,
        "display_name": display_name,
    }


def resolve_tenant_entry_by_public_slug(db: Session, public_slug: str) -> dict | None:
    normalized_slug = normalize_public_slug(public_slug)
    if not normalized_slug:
        return None

    portal = find_portal_by_public_slug(db, normalized_slug)
    if portal is not None:
        return _build_entry(portal, public_slug=normalized_slug)

    platform_settings = (
        db.query(PlatformSettings)
        .filter(PlatformSettings.id == PLATFORM_SETTINGS_SINGLETON_ID)
        .filter(PlatformSettings.public_slug == normalized_slug)
        .one_or_none()
    )
    if platform_settings is None:
        return None

    dev_tenant_id = resolve_dev_tenant_portal_id(db)
    dev_portal = get_portal(db, dev_tenant_id)
    if dev_portal is None:
        return None

    return _build_entry(dev_portal, public_slug=normalized_slug)


def resolve_tenant_login_display_name_by_public_slug(
    db: Session,
    public_slug: str,
) -> str | None:
    entry = resolve_tenant_entry_by_public_slug(db, public_slug)
    if entry is None:
        return None
    return entry["display_name"]
