"""Bridge exchange/me response helpers (access context only, no profile projection)."""

from __future__ import annotations

from app.modules.control_plane.platform_identity.infrastructure_superadmin import (
    is_platform_owner_role,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.schemas import (
    BridgeExchangeResponse,
    BridgeMeResponse,
)


def build_bridge_exchange_response(
    principal: BridgePrincipal,
    access_token: str,
) -> BridgeExchangeResponse:
    infra = principal.is_infrastructure_superadmin
    is_owner = infra and is_platform_owner_role(principal.platform_role)
    return BridgeExchangeResponse(
        access_token=access_token,
        platform_identity_id=str(principal.platform_identity_id),
        platform_role=principal.platform_role,
        portal_id=principal.portal_id,
        database_name=principal.database_name,
        tenant_code=principal.tenant_code,
        environment_key=principal.environment_key,
        is_infrastructure_superadmin=infra,
        is_platform_owner=is_owner,
        effective_role="superadmin" if infra else None,
    )


def build_bridge_me_response(principal: BridgePrincipal) -> BridgeMeResponse:
    infra = principal.is_infrastructure_superadmin
    is_owner = infra and is_platform_owner_role(principal.platform_role)
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
        is_platform_owner=is_owner,
        effective_role="superadmin" if infra else None,
    )
