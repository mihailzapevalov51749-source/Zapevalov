"""Unit tests for bridge actor id helpers (no DB / no app.main)."""

from __future__ import annotations

import uuid

from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.session_bridge.bridge_actor_ids import (
    resolve_bridge_actor_user_id,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_designer_actor import (
    build_infrastructure_bridge_designer_actor,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    resolve_runtime_actor_user_id,
)


def test_resolve_bridge_actor_user_id_is_stable() -> None:
    identity_id = uuid.uuid4()
    assert resolve_bridge_actor_user_id(identity_id) == resolve_bridge_actor_user_id(identity_id)
    assert resolve_bridge_actor_user_id(identity_id) < 0


def test_resolve_runtime_actor_user_id_for_bridge_actor() -> None:
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        ticket_id=uuid.uuid4(),
        environment_key="TEMPLATE",
    )
    actor = build_infrastructure_bridge_designer_actor(principal)
    assert resolve_runtime_actor_user_id(actor) == actor.id
    assert actor.tenant_id == 2
    assert actor.role is not None
    assert actor.role.name == "superadmin"
