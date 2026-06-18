"""Session Bridge trust contract (stateless signed tickets)."""

from __future__ import annotations

import os

# Phase WI-06: symmetric signing (development / transitional).
BRIDGE_ALGORITHM = "HS256"

# Target for production Session Bridge (Phase 4+).
BRIDGE_ALGORITHM_FUTURE = "RS256"

BRIDGE_ISSUER = "yasnopro-platform-cp"
BRIDGE_AUDIENCE = "yasnopro-tenant-bridge"

BRIDGE_SIGNING_KEY_ENV = "YASNOPRO_SESSION_BRIDGE_SIGNING_KEY"
BRIDGE_DEFAULT_SIGNING_KEY = "YASNOPRO_SESSION_BRIDGE_DEV_KEY_CHANGE_ME"

DEFAULT_BRIDGE_TICKET_TTL_SECONDS = 300

# Optional claim for auth provenance (store / legacy); not an identifier.
BRIDGE_CLAIM_AUTH_SOURCE = "auth_source"


def get_bridge_signing_key() -> str:
    """Return HS256 signing key (env override for non-dev environments)."""
    return os.environ.get(BRIDGE_SIGNING_KEY_ENV, BRIDGE_DEFAULT_SIGNING_KEY)


def bridge_trust_contract() -> dict[str, str]:
    """Documented trust contract for Session Bridge tickets."""
    return {
        "issuer": BRIDGE_ISSUER,
        "audience": BRIDGE_AUDIENCE,
        "algorithm": BRIDGE_ALGORITHM,
        "algorithm_future": BRIDGE_ALGORITHM_FUTURE,
        "key_source": f"env:{BRIDGE_SIGNING_KEY_ENV} (HS256 transitional; RS256 planned)",
        "replay_strategy": "stateless_jti_short_ttl",
    }
