"""Router tests for platform environment bridge ticket (WI-17)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.principal.types import (
    PlatformPrincipal,
    TenantPrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.dependencies import (
    require_platform_owner_principal,
)
from app.modules.control_plane.platform_environments.schemas import (
    PlatformEnvironmentBridgeTicketResponse,
)


@pytest.fixture()
def platform_principal() -> PlatformPrincipal:
    return PlatformPrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        email="owner@platform.test",
        display_name="Owner",
    )


def _template_ticket_response(portal_id: int = 2) -> PlatformEnvironmentBridgeTicketResponse:
    return PlatformEnvironmentBridgeTicketResponse(
        bridge_ticket="signed-template-ticket",
        ticket_id=str(uuid.uuid4()),
        portal_id=portal_id,
        database_name="yasnopro_template",
        tenant_code="platform_template",
        environment_key="TEMPLATE",
        expires_at=int(datetime.now(timezone.utc).timestamp()) + 300,
        frontend_base_url="http://localhost:5174",
        redirect_path="/portal/2/page/347",
        home_page_id=347,
    )


def test_platform_environment_bridge_ticket_template_success(
    platform_principal,
    monkeypatch,
) -> None:
    def _fake_mint(*, principal, portal_id):
        assert principal == platform_principal
        return _template_ticket_response(portal_id)

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
        assert body["bridge_ticket"] == "signed-template-ticket"
        assert body["environment_key"] == "TEMPLATE"
        assert body["redirect_path"] == "/portal/2/page/347"
        assert body["tenant_code"] == "platform_template"
    finally:
        app.dependency_overrides.pop(require_platform_owner_principal, None)


@pytest.mark.parametrize("portal_id", [1, 21])
def test_platform_environment_bridge_ticket_rejects_non_template(
    platform_principal,
    portal_id: int,
    monkeypatch,
) -> None:
    from fastapi import HTTPException, status

    def _forbidden(*, principal, portal_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Environment launch is allowed only for TEMPLATE",
        )

    monkeypatch.setattr(
        "app.modules.control_plane.platform_environments.router.mint_template_environment_bridge_ticket",
        _forbidden,
    )
    app.dependency_overrides[require_platform_owner_principal] = lambda: platform_principal

    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.post(f"/control-plane/platform-environments/{portal_id}/bridge-ticket")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.pop(require_platform_owner_principal, None)


def test_platform_environment_bridge_ticket_rejects_tenant_principal() -> None:
    from app.modules.control_plane.platform_identity.principal.resolver import (
        get_current_principal,
    )

    tenant = TenantPrincipal(user_id=7, tenant_id=2, role_key="company_admin")
    app.dependency_overrides[get_current_principal] = lambda: tenant

    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.post("/control-plane/platform-environments/2/bridge-ticket")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_principal, None)
