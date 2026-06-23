"""Resolve bridge principal owner profile from Platform Identity Store at runtime."""

from __future__ import annotations

from app.modules.control_plane.platform_identity.models import PlatformIdentity
from app.modules.control_plane.platform_identity.platform_identity_store_session import (
    platform_identity_store_session,
)
from app.modules.control_plane.platform_identity.principal.owner_profile import (
    _is_forbidden_bridge_display_label,
    _normalize_optional_text,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)


def enrich_bridge_principal_owner_profile(principal: BridgePrincipal) -> BridgePrincipal:
    """Fill owner profile on bridge /exchange and /me from catalog Identity Store."""
    if not principal.is_infrastructure_superadmin:
        return principal

    owner_email = _normalize_optional_text(principal.owner_email)
    owner_display_name = _normalize_optional_text(principal.owner_display_name)
    owner_phone = _normalize_optional_text(principal.owner_phone)
    owner_avatar_url = _normalize_optional_text(principal.owner_avatar_url)

    identity: PlatformIdentity | None = None
    with platform_identity_store_session() as identity_db:
        identity = identity_db.get(PlatformIdentity, principal.platform_identity_id)

    if identity is not None:
        owner_email = owner_email or _normalize_optional_text(identity.email)
        owner_display_name = owner_display_name or _normalize_optional_text(identity.full_name)
        owner_phone = owner_phone or _normalize_optional_text(identity.phone)
        owner_avatar_url = owner_avatar_url or _normalize_optional_text(identity.avatar_url)

    if _is_forbidden_bridge_display_label(owner_display_name):
        owner_display_name = (
            _normalize_optional_text(identity.full_name) if identity is not None else None
        )

    if (
        owner_email == _normalize_optional_text(principal.owner_email)
        and owner_display_name == _normalize_optional_text(principal.owner_display_name)
        and owner_phone == _normalize_optional_text(principal.owner_phone)
        and owner_avatar_url == _normalize_optional_text(principal.owner_avatar_url)
    ):
        return principal

    return BridgePrincipal(
        platform_identity_id=principal.platform_identity_id,
        platform_role=principal.platform_role,
        portal_id=principal.portal_id,
        database_name=principal.database_name,
        tenant_code=principal.tenant_code,
        ticket_id=principal.ticket_id,
        environment_key=principal.environment_key,
        owner_email=owner_email,
        owner_display_name=owner_display_name,
        owner_phone=owner_phone,
        owner_avatar_url=owner_avatar_url,
    )
