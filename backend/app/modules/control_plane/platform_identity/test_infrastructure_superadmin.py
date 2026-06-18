"""Tests for infrastructure superadmin resolution (WI-18)."""

from __future__ import annotations

import uuid

import pytest

from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.infrastructure_superadmin import (
    is_infrastructure_environment,
    is_infrastructure_superadmin,
    resolve_infrastructure_environment_key,
)
from app.modules.control_plane.platform_identity.session_bridge import (
    build_bridge_principal,
    mint_bridge_ticket,
    validate_bridge_ticket,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    create_bridge_session_token,
    decode_bridge_session_token,
)
from app.modules.control_plane.platform_identity.session_bridge.response_builders import (
    build_bridge_exchange_response,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    bridge_principal_is_infrastructure_superadmin,
    try_resolve_infrastructure_bridge_actor,
)
from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal


@pytest.fixture()
def platform_principal() -> PlatformPrincipal:
    return PlatformPrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        email="owner@platform.test",
        display_name="Owner",
    )


def test_resolve_infrastructure_environment_key_for_template() -> None:
    assert (
        resolve_infrastructure_environment_key(
            environment_key="TEMPLATE",
            portal_id=2,
            database_name="yasnopro_template",
        )
        == "TEMPLATE"
    )


def test_resolve_infrastructure_environment_key_from_portal_id_only() -> None:
    assert resolve_infrastructure_environment_key(portal_id=1) == "DEV"
    assert resolve_infrastructure_environment_key(portal_id=2) == "TEMPLATE"


def test_client_environment_is_not_infrastructure() -> None:
    assert (
        resolve_infrastructure_environment_key(
            portal_id=21,
            database_name="yasnopro_client",
        )
        is None
    )
    assert not is_infrastructure_environment(portal_id=21, database_name="yasnopro_client")


def test_platform_owner_in_template_is_infrastructure_superadmin() -> None:
    assert is_infrastructure_superadmin(
        platform_role=PLATFORM_ROLE_OWNER,
        environment_key="TEMPLATE",
        portal_id=2,
        database_name="yasnopro_template",
    )


def test_platform_owner_in_client_is_not_infrastructure_superadmin() -> None:
    assert not is_infrastructure_superadmin(
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=21,
        database_name="yasnopro_client",
    )


def test_non_owner_in_template_is_not_infrastructure_superadmin() -> None:
    assert not is_infrastructure_superadmin(
        platform_role="platform_operator",
        environment_key="TEMPLATE",
        portal_id=2,
        database_name="yasnopro_template",
    )


def test_bridge_principal_propagates_environment_key(platform_principal) -> None:
    ticket = mint_bridge_ticket(
        platform_principal,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        environment_key="TEMPLATE",
    )
    result = validate_bridge_ticket(ticket.token)
    assert result.claims is not None

    principal = build_bridge_principal(result.claims)
    assert principal.environment_key == "TEMPLATE"
    assert principal.is_infrastructure_superadmin is True
    assert principal.role_key == "superadmin"


def test_bridge_session_jwt_roundtrip_preserves_environment_key(platform_principal) -> None:
    ticket = mint_bridge_ticket(
        platform_principal,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        environment_key="TEMPLATE",
    )
    principal = build_bridge_principal(ticket.claims)
    token = create_bridge_session_token(principal)
    decoded = decode_bridge_session_token(token)

    assert decoded.environment_key == "TEMPLATE"
    assert bridge_principal_is_infrastructure_superadmin(decoded) is True
    actor = try_resolve_infrastructure_bridge_actor(token)
    assert actor is not None
    assert actor.is_infrastructure_superadmin is True
    assert actor.role.name == "superadmin"


def test_exchange_response_flags_for_client_owner(platform_principal) -> None:
    ticket = mint_bridge_ticket(
        platform_principal,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
    )
    principal = build_bridge_principal(ticket.claims)
    response = build_bridge_exchange_response(principal, "token-value")

    assert response.is_infrastructure_superadmin is False
    assert response.is_platform_owner is False
    assert response.effective_role is None
