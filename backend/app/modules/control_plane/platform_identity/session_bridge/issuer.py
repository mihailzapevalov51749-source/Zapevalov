"""Bridge Ticket issuer (stateless JWT, no persistence)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal
from app.modules.control_plane.platform_identity.session_bridge.contract import (
    BridgeClaims,
    BridgeTicket,
)
from app.modules.control_plane.platform_identity.session_bridge.trust import (
    BRIDGE_ALGORITHM,
    BRIDGE_AUDIENCE,
    BRIDGE_CLAIM_AUTH_SOURCE,
    BRIDGE_ISSUER,
    DEFAULT_BRIDGE_TICKET_TTL_SECONDS,
    get_bridge_signing_key,
)

CLAIM_TICKET_ID = "ticket_id"
CLAIM_PLATFORM_IDENTITY_ID = "platform_identity_id"
CLAIM_PLATFORM_ROLE = "platform_role"
CLAIM_PORTAL_ID = "portal_id"
CLAIM_DATABASE_NAME = "database_name"
CLAIM_TENANT_CODE = "tenant_code"
CLAIM_ENVIRONMENT_KEY = "environment_key"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _claims_to_jwt_payload(claims: BridgeClaims) -> dict:
    payload = {
        "jti": str(claims.ticket_id),
        CLAIM_TICKET_ID: str(claims.ticket_id),
        CLAIM_PLATFORM_IDENTITY_ID: str(claims.platform_identity_id),
        CLAIM_PLATFORM_ROLE: claims.platform_role,
        CLAIM_PORTAL_ID: claims.portal_id,
        CLAIM_DATABASE_NAME: claims.database_name,
        CLAIM_TENANT_CODE: claims.tenant_code,
        "iss": BRIDGE_ISSUER,
        "aud": BRIDGE_AUDIENCE,
        "iat": int(claims.issued_at.timestamp()),
        "exp": int(claims.expires_at.timestamp()),
    }
    if claims.auth_source:
        payload[BRIDGE_CLAIM_AUTH_SOURCE] = claims.auth_source
    if claims.environment_key:
        payload[CLAIM_ENVIRONMENT_KEY] = claims.environment_key
    return payload


def mint_bridge_ticket(
    platform_principal: PlatformPrincipal,
    *,
    portal_id: int,
    database_name: str,
    tenant_code: str,
    environment_key: str | None = None,
    ttl_seconds: int = DEFAULT_BRIDGE_TICKET_TTL_SECONDS,
    auth_source: str | None = "platform_identity_store",
    ticket_id: uuid.UUID | None = None,
    issued_at: datetime | None = None,
) -> BridgeTicket:
    """Mint a signed Bridge Ticket for a PlatformPrincipal (CP → tenant handoff)."""
    if portal_id <= 0:
        raise ValueError("portal_id must be positive")
    if not str(database_name or "").strip():
        raise ValueError("database_name is required")
    if not str(tenant_code or "").strip():
        raise ValueError("tenant_code is required")

    now = issued_at or _utc_now()
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    ticket_uuid = ticket_id or uuid.uuid4()
    expires_at = now + timedelta(seconds=ttl_seconds)

    normalized_environment_key = str(environment_key or "").strip() or None

    claims = BridgeClaims(
        ticket_id=ticket_uuid,
        platform_identity_id=platform_principal.platform_identity_id,
        platform_role=platform_principal.platform_role,
        portal_id=portal_id,
        database_name=str(database_name).strip(),
        tenant_code=str(tenant_code).strip(),
        issued_at=now,
        expires_at=expires_at,
        auth_source=auth_source,
        environment_key=normalized_environment_key,
    )

    token = jwt.encode(
        _claims_to_jwt_payload(claims),
        get_bridge_signing_key(),
        algorithm=BRIDGE_ALGORITHM,
    )
    return BridgeTicket(token=token, claims=claims)
