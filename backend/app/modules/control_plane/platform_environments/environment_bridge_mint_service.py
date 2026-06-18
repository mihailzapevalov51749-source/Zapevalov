"""Mint Session Bridge tickets for infrastructure environment slots (WI-17)."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.modules.control_plane.platform_environments.platform_environment_launch_service import (
    PlatformEnvironmentLaunchForbidden,
    PlatformEnvironmentLaunchNotFound,
    build_template_environment_launch_context,
)
from app.modules.control_plane.platform_environments.schemas import (
    PlatformEnvironmentBridgeTicketResponse,
)
from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal
from app.modules.control_plane.platform_identity.session_bridge.issuer import (
    mint_bridge_ticket,
)


def mint_template_environment_bridge_ticket(
    *,
    principal: PlatformPrincipal,
    portal_id: int,
) -> PlatformEnvironmentBridgeTicketResponse:
    try:
        launch = build_template_environment_launch_context(portal_id=portal_id)
    except PlatformEnvironmentLaunchForbidden as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except PlatformEnvironmentLaunchNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    ticket = mint_bridge_ticket(
        principal,
        portal_id=launch.portal_id,
        database_name=launch.database_name,
        tenant_code=launch.tenant_code,
        environment_key=launch.environment_key,
    )
    return PlatformEnvironmentBridgeTicketResponse(
        bridge_ticket=ticket.token,
        ticket_id=str(ticket.claims.ticket_id),
        portal_id=launch.portal_id,
        database_name=launch.database_name,
        tenant_code=launch.tenant_code,
        environment_key=launch.environment_key,
        expires_at=int(ticket.claims.expires_at.timestamp()),
        frontend_base_url=launch.frontend_base_url,
        redirect_path=launch.redirect_path,
        home_page_id=launch.home_page_id,
    )
