"""Bridge exchange/me response helpers (WI-18)."""

from __future__ import annotations

from app.modules.control_plane.platform_identity.infrastructure_superadmin import (
    is_infrastructure_superadmin as resolve_infrastructure_superadmin,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.schemas import (
    BridgeExchangeResponse,
    BridgeMeResponse,
)

BRIDGE_DISPLAY_NAME_PLATFORM_OWNER = "Platform Owner"


def _resolve_bridge_display_name(principal: BridgePrincipal) -> str | None:
    if resolve_infrastructure_superadmin(
        platform_role=principal.platform_role,
        environment_key=principal.environment_key,
        portal_id=principal.portal_id,
        database_name=principal.database_name,
    ):
        return BRIDGE_DISPLAY_NAME_PLATFORM_OWNER
    return None


def build_bridge_exchange_response(
    principal: BridgePrincipal,
    access_token: str,
) -> BridgeExchangeResponse:
    infra = principal.is_infrastructure_superadmin
    display_name = _resolve_bridge_display_name(principal)
    return BridgeExchangeResponse(
        access_token=access_token,
        platform_identity_id=str(principal.platform_identity_id),
        platform_role=principal.platform_role,
        portal_id=principal.portal_id,
        database_name=principal.database_name,
        tenant_code=principal.tenant_code,
        environment_key=principal.environment_key,
        is_infrastructure_superadmin=infra,
        is_platform_owner=infra,
        effective_role="superadmin" if infra else None,
        display_name=display_name,
    )


def build_bridge_me_response(principal: BridgePrincipal) -> BridgeMeResponse:
    infra = principal.is_infrastructure_superadmin
    display_name = _resolve_bridge_display_name(principal)
    return BridgeMeResponse(
        principal_type=principal.principal_type,
        platform_identity_id=str(principal.platform_identity_id),
        platform_role=principal.platform_role,
        portal_id=principal.portal_id,
        database_name=principal.database_name,
        tenant_code=principal.tenant_code,
        ticket_id=str(principal.ticket_id),
        environment_key=principal.environment_key,
        is_infrastructure_superadmin=infra,
        is_platform_owner=infra,
        effective_role="superadmin" if infra else None,
        display_name=display_name,
    )
