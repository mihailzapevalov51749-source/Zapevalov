"""Resolve Platform Owner display profile for bridge mint (identity store)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.models import PlatformIdentity
from app.modules.control_plane.platform_identity.platform_identity_store_session import (
    open_platform_identity_store_session,
)
from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal


FORBIDDEN_BRIDGE_OWNER_DISPLAY_LABELS = frozenset({"Platform Owner"})


def _normalize_optional_text(value: str | None) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _is_forbidden_bridge_display_label(value: str | None) -> bool:
    normalized = str(value or "").strip()
    return bool(normalized) and normalized in FORBIDDEN_BRIDGE_OWNER_DISPLAY_LABELS


def _load_platform_identity(
    db: Session | None,
    platform_identity_id,
) -> PlatformIdentity | None:
    if db is not None:
        identity = db.get(PlatformIdentity, platform_identity_id)
        if identity is not None:
            return identity

    identity_db = open_platform_identity_store_session()
    try:
        return identity_db.get(PlatformIdentity, platform_identity_id)
    finally:
        identity_db.close()


def enrich_platform_principal_owner_profile(
    db: Session,
    principal: PlatformPrincipal,
) -> PlatformPrincipal:
    """Merge owner profile fields from Platform Identity Store (single SoT)."""
    identity = _load_platform_identity(db, principal.platform_identity_id)
    if identity is None:
        return principal

    resolved_email = str(principal.email or "").strip() or str(identity.email or "").strip()
    resolved_display_name = (
        str(principal.display_name or "").strip() or str(identity.full_name or "").strip()
    )
    if _is_forbidden_bridge_display_label(resolved_display_name):
        resolved_display_name = str(identity.full_name or "").strip()
    resolved_phone = _normalize_optional_text(principal.phone) or _normalize_optional_text(
        identity.phone
    )
    resolved_avatar_url = _normalize_optional_text(
        principal.avatar_url
    ) or _normalize_optional_text(identity.avatar_url)

    if (
        resolved_email == str(principal.email or "").strip()
        and resolved_display_name == str(principal.display_name or "").strip()
        and resolved_phone == _normalize_optional_text(principal.phone)
        and resolved_avatar_url == _normalize_optional_text(principal.avatar_url)
    ):
        return principal

    return PlatformPrincipal(
        platform_identity_id=principal.platform_identity_id,
        platform_role=principal.platform_role,
        email=resolved_email or principal.email,
        display_name=resolved_display_name or principal.display_name,
        phone=resolved_phone,
        avatar_url=resolved_avatar_url,
    )
