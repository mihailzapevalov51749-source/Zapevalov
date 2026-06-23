"""Bridge Session JWT trust contract (separate from login JWT and bridge tickets)."""

from __future__ import annotations

import os

from app.modules.control_plane.platform_identity.session_bridge.trust import BRIDGE_ALGORITHM

BRIDGE_SESSION_ISSUER = "yasnopro-tenant-bridge"
BRIDGE_SESSION_AUDIENCE = "yasnopro-bridge-session"

BRIDGE_SESSION_SIGNING_KEY_ENV = "YASNOPRO_SESSION_BRIDGE_SESSION_KEY"
BRIDGE_SESSION_DEFAULT_SIGNING_KEY = "YASNOPRO_BRIDGE_SESSION_DEV_KEY_CHANGE_ME"

DEFAULT_BRIDGE_SESSION_TTL_SECONDS = 3600

CLAIM_PRINCIPAL_TYPE = "principal_type"
CLAIM_PLATFORM_IDENTITY_ID = "platform_identity_id"
CLAIM_PLATFORM_ROLE = "platform_role"
CLAIM_PORTAL_ID = "portal_id"
CLAIM_DATABASE_NAME = "database_name"
CLAIM_TENANT_CODE = "tenant_code"
CLAIM_TICKET_ID = "ticket_id"
CLAIM_ENVIRONMENT_KEY = "environment_key"
CLAIM_OWNER_EMAIL = "owner_email"
CLAIM_OWNER_DISPLAY_NAME = "owner_display_name"
CLAIM_OWNER_PHONE = "owner_phone"
CLAIM_OWNER_AVATAR_URL = "owner_avatar_url"


def get_bridge_session_signing_key() -> str:
    return os.environ.get(
        BRIDGE_SESSION_SIGNING_KEY_ENV,
        BRIDGE_SESSION_DEFAULT_SIGNING_KEY,
    )


def bridge_session_trust_contract() -> dict[str, str]:
    return {
        "issuer": BRIDGE_SESSION_ISSUER,
        "audience": BRIDGE_SESSION_AUDIENCE,
        "algorithm": BRIDGE_ALGORITHM,
        "key_source": f"env:{BRIDGE_SESSION_SIGNING_KEY_ENV}",
        "token_kind": "bridge_session",
    }
