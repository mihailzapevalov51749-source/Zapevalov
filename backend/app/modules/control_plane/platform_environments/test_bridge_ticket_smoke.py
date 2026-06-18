"""Live smoke for bridge-ticket endpoint via TestClient (WI-17B)."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal
from app.modules.control_plane.platform_identity.session_bridge.dependencies import (
    require_platform_owner_principal,
)


@pytest.fixture()
def platform_principal() -> PlatformPrincipal:
    return PlatformPrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        email="owner@platform.test",
        display_name="Owner",
    )


def test_smoke_post_template_bridge_ticket_returns_201(platform_principal, monkeypatch) -> None:
    from app.modules.control_plane.platform_environments.schemas import (
        PlatformEnvironmentBridgeTicketResponse,
    )

    def _fake_mint(*, principal, portal_id):
        return PlatformEnvironmentBridgeTicketResponse(
            bridge_ticket="smoke-ticket",
            ticket_id=str(uuid.uuid4()),
            portal_id=portal_id,
            database_name="yasnopro_template",
            tenant_code="platform_template",
            environment_key="TEMPLATE",
            expires_at=1_700_000_000,
            frontend_base_url="http://localhost:5174",
            redirect_path="/portal/2/page/347",
            home_page_id=347,
        )

    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.router.mint_template_environment_bridge_ticket",
        _fake_mint,
    )
    app.dependency_overrides[require_platform_owner_principal] = lambda: platform_principal

    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.post("/control-plane/platform-environments/2/bridge-ticket")
        assert response.status_code == 201
        body = response.json()
        assert body["bridge_ticket"] == "smoke-ticket"
        assert body["redirect_path"] == "/portal/2/page/347"
    finally:
        app.dependency_overrides.pop(require_platform_owner_principal, None)
