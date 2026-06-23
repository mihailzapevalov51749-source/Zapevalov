"""Control Plane bridge ticket mint service."""

from __future__ import annotations

from sqlalchemy.orm import Session

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.principal.owner_profile import (
    enrich_platform_principal_owner_profile,
)
from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal
from app.modules.control_plane.platform_identity.session_bridge.catalog_target import (
    resolve_bridge_target_from_catalog,
)
from app.modules.control_plane.platform_identity.session_bridge.issuer import (
    mint_bridge_ticket,
)
from app.modules.control_plane.platform_identity.session_bridge.schemas import (
    BridgeTicketMintResponse,
)


def mint_catalog_bridge_ticket(
    db: Session,
    *,
    principal: PlatformPrincipal,
    portal_id: int,
) -> BridgeTicketMintResponse:
    database_name, tenant_code = resolve_bridge_target_from_catalog(db, portal_id=portal_id)
    enriched_principal = enrich_platform_principal_owner_profile(db, principal)
    ticket = mint_bridge_ticket(
        enriched_principal,
        portal_id=portal_id,
        database_name=database_name,
        tenant_code=tenant_code,
    )
    return BridgeTicketMintResponse(
        bridge_ticket=ticket.token,
        ticket_id=str(ticket.claims.ticket_id),
        portal_id=portal_id,
        database_name=database_name,
        tenant_code=tenant_code,
        expires_at=int(ticket.claims.expires_at.timestamp()),
    )
