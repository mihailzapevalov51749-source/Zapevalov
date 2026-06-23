"""Stable synthetic user ids for infrastructure bridge sessions."""

from __future__ import annotations

import uuid

BRIDGE_ACTOR_USER_ID_OFFSET = -(2**30)


def resolve_bridge_actor_user_id(platform_identity_id: uuid.UUID) -> int:
    """Stable synthetic user id for infrastructure bridge sessions (no users row)."""
    return BRIDGE_ACTOR_USER_ID_OFFSET + int(platform_identity_id.int % (2**30))
