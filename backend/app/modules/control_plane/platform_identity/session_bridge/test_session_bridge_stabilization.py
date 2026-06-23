"""Regression tests for Session Bridge stabilization (WI-19)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    create_bridge_session_token,
)
from app.modules.control_plane.platform_identity.session_bridge.issuer import (
    mint_bridge_ticket as issuer_mint,
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


def _bridge_token_for_portal(
    *,
    portal_id: int,
    database_name: str,
    tenant_code: str,
    environment_key: str | None = None,
) -> str:
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=portal_id,
        database_name=database_name,
        tenant_code=tenant_code,
        ticket_id=uuid.uuid4(),
        environment_key=environment_key,
    )
    return create_bridge_session_token(principal)


def test_template_bridge_exchange_preserves_portal_id_2(platform_principal) -> None:
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


def test_template_runtime_request_uses_portal_id_2_not_1() -> None:
    token = _bridge_token_for_portal(
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        environment_key="TEMPLATE",
    )
    client = TestClient(app, raise_server_exceptions=False)

    allowed = client.get(
        "/navigation/portal/2/tree",
        headers={"Authorization": f"Bearer {token}"},
    )
    denied = client.get(
        "/navigation/portal/1/tree",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert allowed.status_code in {200, 404}
    assert denied.status_code == 403


def test_client_bridge_exchange_preserves_company_portal_id(platform_principal) -> None:
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


def test_client_runtime_request_uses_company_portal_id_not_1() -> None:
    token = _bridge_token_for_portal(
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
    )
    client = TestClient(app, raise_server_exceptions=False)

    allowed = client.get(
        "/navigation/portal/21/tree",
        headers={"Authorization": f"Bearer {token}"},
    )
    denied = client.get(
        "/navigation/portal/1/tree",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert allowed.status_code in {200, 404}
    assert denied.status_code == 403


def test_bridge_me_preserves_portal_context_after_exchange(platform_principal) -> None:
    ticket = issuer_mint(
        platform_principal,
        portal_id=2,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        environment_key="TEMPLATE",
    )
    client = TestClient(app, raise_server_exceptions=False)
    exchange = client.post(
        "/auth/session-bridge/exchange",
        json={"bridge_ticket": ticket.token},
    )
    assert exchange.status_code == 200
    access_token = exchange.json()["access_token"]

    me = client.get(
        "/auth/session-bridge/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me.status_code == 200
    body = me.json()
    assert body["portal_id"] == 2
    assert body["database_name"] == "yasnopro_template"
    assert body["environment_key"] == "TEMPLATE"
    assert body["is_infrastructure_superadmin"] is True
    assert body["is_platform_owner"] is True
    assert body["effective_role"] == "superadmin"
    assert body["display_name"] == "Owner"
