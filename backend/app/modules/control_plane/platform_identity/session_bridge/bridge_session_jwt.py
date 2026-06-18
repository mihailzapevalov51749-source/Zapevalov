"""Bridge Session JWT mint and decode (not login / refresh JWT)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.modules.control_plane.platform_identity.principal.constants import (
    PRINCIPAL_TYPE_BRIDGE,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_trust import (
    BRIDGE_SESSION_AUDIENCE,
    BRIDGE_SESSION_ISSUER,
    CLAIM_DATABASE_NAME,
    CLAIM_PLATFORM_IDENTITY_ID,
    CLAIM_ENVIRONMENT_KEY,
    CLAIM_PLATFORM_ROLE,
    CLAIM_PORTAL_ID,
    CLAIM_PRINCIPAL_TYPE,
    CLAIM_TENANT_CODE,
    CLAIM_TICKET_ID,
    DEFAULT_BRIDGE_SESSION_TTL_SECONDS,
    get_bridge_session_signing_key,
)
from app.modules.control_plane.platform_identity.session_bridge.trust import (
    BRIDGE_ALGORITHM,
)


class BridgeSessionJWTError(Exception):
    """Bridge Session JWT validation failed."""


def create_bridge_session_token(
    principal: BridgePrincipal,
    *,
    ttl_seconds: int = DEFAULT_BRIDGE_SESSION_TTL_SECONDS,
    issued_at: datetime | None = None,
) -> str:
    now = issued_at or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    expire = now + timedelta(seconds=int(ttl_seconds))

    payload = {
        "sub": str(principal.platform_identity_id),
        CLAIM_PRINCIPAL_TYPE: PRINCIPAL_TYPE_BRIDGE,
        CLAIM_PLATFORM_IDENTITY_ID: str(principal.platform_identity_id),
        CLAIM_PLATFORM_ROLE: principal.platform_role,
        CLAIM_PORTAL_ID: int(principal.portal_id),
        CLAIM_DATABASE_NAME: principal.database_name,
        CLAIM_TENANT_CODE: principal.tenant_code,
        CLAIM_TICKET_ID: str(principal.ticket_id),
        "iss": BRIDGE_SESSION_ISSUER,
        "aud": BRIDGE_SESSION_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if principal.environment_key:
        payload[CLAIM_ENVIRONMENT_KEY] = principal.environment_key
    return jwt.encode(payload, get_bridge_session_signing_key(), algorithm=BRIDGE_ALGORITHM)


def decode_bridge_session_token(token: str) -> BridgePrincipal:
    try:
        payload = jwt.decode(
            token,
            get_bridge_session_signing_key(),
            algorithms=[BRIDGE_ALGORITHM],
            audience=BRIDGE_SESSION_AUDIENCE,
            issuer=BRIDGE_SESSION_ISSUER,
            options={"require": ["exp", "iat", "sub", CLAIM_PRINCIPAL_TYPE]},
        )
    except JWTError as exc:
        raise BridgeSessionJWTError(str(exc)) from exc

    principal_type = str(payload.get(CLAIM_PRINCIPAL_TYPE) or "").strip()
    if principal_type != PRINCIPAL_TYPE_BRIDGE:
        raise BridgeSessionJWTError("principal_type must be bridge")

    try:
        platform_identity_id = uuid.UUID(str(payload[CLAIM_PLATFORM_IDENTITY_ID]))
        ticket_id = uuid.UUID(str(payload[CLAIM_TICKET_ID]))
    except (KeyError, ValueError, TypeError) as exc:
        raise BridgeSessionJWTError("invalid bridge session claims") from exc

    environment_key_raw = payload.get(CLAIM_ENVIRONMENT_KEY)
    environment_key = (
        str(environment_key_raw).strip()
        if environment_key_raw is not None and str(environment_key_raw).strip()
        else None
    )

    return BridgePrincipal(
        platform_identity_id=platform_identity_id,
        platform_role=str(payload[CLAIM_PLATFORM_ROLE]),
        portal_id=int(payload[CLAIM_PORTAL_ID]),
        database_name=str(payload[CLAIM_DATABASE_NAME]),
        tenant_code=str(payload[CLAIM_TENANT_CODE]),
        ticket_id=ticket_id,
        environment_key=environment_key,
    )
