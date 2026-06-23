"""Unit tests for bridge response (access context only, no profile projection)."""

from __future__ import annotations

import uuid

from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.response_builders import (
    build_bridge_exchange_response,
    build_bridge_me_response,
)


def test_bridge_response_exposes_access_context_only() -> None:
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        ticket_id=uuid.uuid4(),
        environment_key="TEMPLATE",
        owner_email="zmn8@ya.ru",
        owner_display_name="Михаил Запевалов",
        owner_phone="89959987006",
        owner_avatar_url="https://cdn.example/owner.png",
    )

    exchange = build_bridge_exchange_response(principal, "token")
    me = build_bridge_me_response(principal)

    assert exchange.platform_identity_id == str(principal.platform_identity_id)
    assert exchange.is_platform_owner is True
    assert exchange.is_infrastructure_superadmin is True
    assert exchange.display_name is None
    assert exchange.full_name is None
    assert exchange.email is None
    assert exchange.phone is None
    assert exchange.avatar_url is None

    assert me.is_platform_owner is True
    assert me.display_name is None
    assert me.full_name is None
    assert me.email is None
    assert me.phone is None
    assert me.avatar_url is None


def test_bridge_response_hides_owner_profile_for_client_context() -> None:
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
        ticket_id=uuid.uuid4(),
        owner_email="zmn8@ya.ru",
        owner_display_name="Михаил Запевалов",
        owner_phone="89959987006",
        owner_avatar_url="https://cdn.example/owner.png",
    )

    response = build_bridge_me_response(principal)

    assert response.is_infrastructure_superadmin is False
    assert response.is_platform_owner is False
    assert response.display_name is None
    assert response.email is None
    assert response.phone is None
    assert response.avatar_url is None
