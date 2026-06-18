"""Tests for bridge-aware portal runtime read access (WI-09)."""

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


@pytest.fixture()
def bridge_access_token() -> str:
    identity_id = uuid.uuid4()
    ticket_id = uuid.uuid4()
    principal = BridgePrincipal(
        platform_identity_id=identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
        ticket_id=ticket_id,
    )
    return create_bridge_session_token(principal)


def test_bridge_jwt_can_read_navigation_tree(bridge_access_token) -> None:
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(
        "/navigation/portal/21/tree",
        headers={"Authorization": f"Bearer {bridge_access_token}"},
    )
    assert response.status_code in {200, 404}
    if response.status_code == 200:
        assert isinstance(response.json(), list)


def test_bridge_jwt_can_read_page_full(bridge_access_token) -> None:
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(
        "/pages/portal/21/1067/full",
        params={"office_access": True},
        headers={"Authorization": f"Bearer {bridge_access_token}"},
    )
    assert response.status_code in {200, 404}


def test_bridge_jwt_rejects_foreign_portal(bridge_access_token) -> None:
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(
        "/navigation/portal/99/tree",
        headers={"Authorization": f"Bearer {bridge_access_token}"},
    )
    assert response.status_code == 403


def test_bridge_jwt_cannot_update_navigation(bridge_access_token) -> None:
    client = TestClient(app, raise_server_exceptions=False)
    response = client.put(
        "/navigation/portal/21/1",
        headers={"Authorization": f"Bearer {bridge_access_token}"},
        json={"title": "hack"},
    )
    assert response.status_code in {401, 403, 404, 422}


def test_login_jwt_still_rejected_as_bridge_me() -> None:
    from app.modules.auth.security import create_access_token

    login_token = create_access_token({"sub": "1"})
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(
        "/auth/session-bridge/me",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert response.status_code == 401


def test_bridge_jwt_can_read_runtime_menu_settings(bridge_access_token) -> None:
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(
        "/runtime/menu-settings/tenants/21",
        headers={"Authorization": f"Bearer {bridge_access_token}"},
    )
    assert response.status_code in {200, 404}
    if response.status_code == 200:
        payload = response.json()
        assert isinstance(payload.get("settings"), dict)


def test_bridge_jwt_can_read_empty_user_menu_preferences(bridge_access_token) -> None:
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(
        "/runtime/menu-preferences/tenants/21",
        headers={"Authorization": f"Bearer {bridge_access_token}"},
    )
    assert response.status_code in {200, 404}
    if response.status_code == 200:
        assert response.json().get("preferences") == {}


def test_bridge_jwt_can_list_workspace_tabs(bridge_access_token) -> None:
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(
        "/workspace-tabs",
        params={"tenant_id": 21},
        headers={"Authorization": f"Bearer {bridge_access_token}"},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_bridge_jwt_cannot_create_workspace_tab(bridge_access_token) -> None:
    client = TestClient(app, raise_server_exceptions=False)
    response = client.post(
        "/workspace-tabs",
        headers={"Authorization": f"Bearer {bridge_access_token}"},
        json={
            "tenant_id": 21,
            "title": "Bridge write",
            "route": "/portal/21/page/1",
        },
    )
    assert response.status_code in {401, 403, 422}
