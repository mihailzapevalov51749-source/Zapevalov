"""Bridge Ticket validator (stateless, no runtime wiring)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError

from app.modules.control_plane.platform_identity.session_bridge.contract import (
    BridgeClaims,
    BridgeTicket,
    BridgeValidationResult,
)
from app.modules.control_plane.platform_identity.session_bridge.issuer import (
    CLAIM_DATABASE_NAME,
    CLAIM_ENVIRONMENT_KEY,
    CLAIM_OWNER_DISPLAY_NAME,
    CLAIM_OWNER_EMAIL,
    CLAIM_OWNER_PHONE,
    CLAIM_OWNER_AVATAR_URL,
    CLAIM_PLATFORM_IDENTITY_ID,
    CLAIM_PLATFORM_ROLE,
    CLAIM_PORTAL_ID,
    CLAIM_TENANT_CODE,
    CLAIM_TICKET_ID,
)
from app.modules.control_plane.platform_identity.session_bridge.trust import (
    BRIDGE_ALGORITHM,
    BRIDGE_AUDIENCE,
    BRIDGE_CLAIM_AUTH_SOURCE,
    BRIDGE_ISSUER,
    get_bridge_signing_key,
)


def _parse_claims(payload: dict) -> BridgeClaims:
    ticket_id_raw = payload.get(CLAIM_TICKET_ID) or payload.get("jti")
    identity_raw = payload.get(CLAIM_PLATFORM_IDENTITY_ID)
    platform_role = payload.get(CLAIM_PLATFORM_ROLE)
    portal_id = payload.get(CLAIM_PORTAL_ID)
    database_name = payload.get(CLAIM_DATABASE_NAME)
    tenant_code = payload.get(CLAIM_TENANT_CODE)
    issued_at = payload.get("iat")
    expires_at = payload.get("exp")

    if not all(
        [
            ticket_id_raw,
            identity_raw,
            platform_role,
            portal_id is not None,
            database_name,
            tenant_code,
            issued_at is not None,
            expires_at is not None,
        ]
    ):
        raise ValueError("Bridge ticket is missing required technical claims")

    environment_key_raw = payload.get(CLAIM_ENVIRONMENT_KEY)
    environment_key = (
        str(environment_key_raw).strip()
        if environment_key_raw is not None and str(environment_key_raw).strip()
        else None
    )

    owner_email_raw = payload.get(CLAIM_OWNER_EMAIL)
    owner_display_name_raw = payload.get(CLAIM_OWNER_DISPLAY_NAME)
    owner_phone_raw = payload.get(CLAIM_OWNER_PHONE)
    owner_avatar_url_raw = payload.get(CLAIM_OWNER_AVATAR_URL)

    return BridgeClaims(
        ticket_id=uuid.UUID(str(ticket_id_raw)),
        platform_identity_id=uuid.UUID(str(identity_raw)),
        platform_role=str(platform_role),
        portal_id=int(portal_id),
        database_name=str(database_name),
        tenant_code=str(tenant_code),
        issued_at=datetime.fromtimestamp(int(issued_at), tz=timezone.utc),
        expires_at=datetime.fromtimestamp(int(expires_at), tz=timezone.utc),
        auth_source=(
            str(payload[BRIDGE_CLAIM_AUTH_SOURCE])
            if payload.get(BRIDGE_CLAIM_AUTH_SOURCE)
            else None
        ),
        environment_key=environment_key,
        owner_email=(
            str(owner_email_raw).strip()
            if owner_email_raw is not None and str(owner_email_raw).strip()
            else None
        ),
        owner_display_name=(
            str(owner_display_name_raw).strip()
            if owner_display_name_raw is not None and str(owner_display_name_raw).strip()
            else None
        ),
        owner_phone=(
            str(owner_phone_raw).strip()
            if owner_phone_raw is not None and str(owner_phone_raw).strip()
            else None
        ),
        owner_avatar_url=(
            str(owner_avatar_url_raw).strip()
            if owner_avatar_url_raw is not None and str(owner_avatar_url_raw).strip()
            else None
        ),
    )


def validate_bridge_ticket(token: str) -> BridgeValidationResult:
    """Validate a signed Bridge Ticket and return structured result."""
    if not str(token or "").strip():
        return BridgeValidationResult(
            status="invalid",
            error_code="empty_token",
            error_message="Bridge ticket token is empty",
        )

    try:
        payload = jwt.decode(
            token,
            get_bridge_signing_key(),
            algorithms=[BRIDGE_ALGORITHM],
            audience=BRIDGE_AUDIENCE,
            issuer=BRIDGE_ISSUER,
            options={"require": ["exp", "iat", "jti", "iss", "aud"]},
        )
        claims = _parse_claims(payload)
        ticket = BridgeTicket(token=token, claims=claims)
        return BridgeValidationResult(status="valid", claims=claims, ticket=ticket)
    except ExpiredSignatureError:
        return BridgeValidationResult(
            status="expired",
            error_code="expired",
            error_message="Bridge ticket has expired",
        )
    except (JWTError, ValueError, TypeError) as exc:
        return BridgeValidationResult(
            status="invalid",
            error_code="invalid",
            error_message=str(exc),
        )
