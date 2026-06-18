"""WI-19A regression tests for Session Bridge identity and CLIENT routing."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.db.runtime_routing_validation import is_catalog_backed_client_runtime_database
from app.main import app
from app.modules.company_database_provisioning.naming import build_company_database_name
from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    try_resolve_infrastructure_bridge_actor,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.issuer import (
    mint_bridge_ticket as issuer_mint,
)
from app.modules.control_plane.platform_identity.session_bridge.response_builders import (
    BRIDGE_DISPLAY_NAME_PLATFORM_OWNER,
)


@pytest.fixture()
def platform_principal() -> PlatformPrincipal:
    return PlatformPrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        email="owner@platform.test",
        display_name="Owner",
    )


def test_catalog_backed_client_runtime_database_accepts_legacy_and_company_db() -> None:
    code = "wi19a_demo"
    company_db = build_company_database_name(code)

    assert is_catalog_backed_client_runtime_database("yasnopro_client") is True
    assert is_catalog_backed_client_runtime_database(company_db) is True
    assert is_catalog_backed_client_runtime_database("yasnopro_template") is False
    assert is_catalog_backed_client_runtime_database("yasnopro_dev") is False


def test_template_bridge_exchange_identity_flags(platform_principal) -> None:
    ticket = issuer_mint(
        platform_principal,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        environment_key="TEMPLATE",
    )

    client = TestClient(app, raise_server_exceptions=False)
    response = client.post(
        "/auth/session-bridge/exchange",
        json={"bridge_ticket": ticket.token},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["portal_id"] == 2
    assert body["database_name"] == "yasnopro_template"
    assert body["environment_key"] == "TEMPLATE"
    assert body["is_infrastructure_superadmin"] is True
    assert body["is_platform_owner"] is True
    assert body["effective_role"] == "superadmin"
    assert body["display_name"] == BRIDGE_DISPLAY_NAME_PLATFORM_OWNER


def test_client_bridge_exchange_preserves_company_context_without_infra(platform_principal) -> None:
    ticket = issuer_mint(
        platform_principal,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
    )

    client = TestClient(app, raise_server_exceptions=False)
    response = client.post(
        "/auth/session-bridge/exchange",
        json={"bridge_ticket": ticket.token},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["portal_id"] == 21
    assert body["database_name"] == "yasnopro_client"
    assert body["is_infrastructure_superadmin"] is False
    assert body["is_platform_owner"] is False
    assert body.get("effective_role") in (None, "")
    assert body.get("display_name") in (None, "")


def test_template_infrastructure_bridge_actor_grants_designer_access() -> None:
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        ticket_id=uuid.uuid4(),
        environment_key="TEMPLATE",
    )
    from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
        create_bridge_session_token,
    )

    token = create_bridge_session_token(principal)
    actor = try_resolve_infrastructure_bridge_actor(token)
    assert actor is not None
    assert actor.role.name == "superadmin"


def test_client_bridge_principal_does_not_build_infrastructure_actor() -> None:
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
        ticket_id=uuid.uuid4(),
    )
    from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
        create_bridge_session_token,
    )

    token = create_bridge_session_token(principal)
    assert try_resolve_infrastructure_bridge_actor(token) is None
