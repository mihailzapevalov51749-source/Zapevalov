"""Regression tests for GET /portals with public_slug serialization."""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.portals.dependencies import require_portal_profile_read_access
from app.modules.portals.router import _portal_response


def test_portal_response_includes_public_url_when_slug_set(monkeypatch):
    monkeypatch.setenv("PORTAL_LOGIN_URL", "http://localhost:5173/login")
    monkeypatch.delenv("PORTAL_PUBLIC_BASE_URL", raising=False)

    portal = SimpleNamespace(
        id=21,
        name="ООО Розетка",
        code="ooo_rozetka",
        short_name="Розетка",
        public_slug="rozetka",
        public_slug_locked=True,
        description=None,
        is_active=True,
        is_protected=True,
        environment_role="DEMO_CLIENT",
        created_at=None,
        tenant_type="CLIENT",
        template_version="1.0.0",
        tenant_status="ACTIVE",
        source_tenant_id=None,
        notes=None,
        timezone="(UTC+03:00) Москва",
        date_format="DD.MM.YYYY",
        time_format="24h",
        week_start_day="Понедельник",
        default_language="ru",
    )

    response = _portal_response(portal, db=None)

    assert response.public_slug == "rozetka"
    assert response.public_url == "http://localhost:5173/rozetka"


@pytest.mark.parametrize("portal_id", [1, 21])
def test_get_portal_returns_200_with_public_url(portal_id: int, monkeypatch):
    monkeypatch.setenv("PORTAL_LOGIN_URL", "http://localhost:5173/login")
    monkeypatch.delenv("PORTAL_PUBLIC_BASE_URL", raising=False)

    fake_user = SimpleNamespace(id=1, tenant_id=portal_id, role=SimpleNamespace(name="superadmin"))
    app.dependency_overrides[require_portal_profile_read_access] = lambda portal_id: fake_user

    client = TestClient(app, raise_server_exceptions=True)
    try:
        response = client.get(f"/portals/{portal_id}")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["id"] == portal_id
        if body.get("public_slug"):
            assert body["public_url"]
            assert str(body["public_slug"]) in body["public_url"]
    finally:
        app.dependency_overrides.clear()


def test_list_portals_returns_200(monkeypatch):
    monkeypatch.setenv("PORTAL_LOGIN_URL", "http://localhost:5173/login")
    monkeypatch.delenv("PORTAL_PUBLIC_BASE_URL", raising=False)

    fake_admin = SimpleNamespace(id=1, role=SimpleNamespace(name="superadmin"))
    app.dependency_overrides[require_platform_admin] = lambda: fake_admin

    client = TestClient(app, raise_server_exceptions=True)
    try:
        response = client.get("/portals/")
        assert response.status_code == 200, response.text
        portals = response.json()
        assert isinstance(portals, list)
        for item in portals:
            if item.get("public_slug"):
                assert "public_url" in item
    finally:
        app.dependency_overrides.clear()
