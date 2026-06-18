from fastapi.testclient import TestClient

from app.main import app


def test_tenant_entry_by_public_slug_returns_demo_client():
    client = TestClient(app)
    response = client.get("/auth/tenant-entry/rozetka")

    assert response.status_code == 200
    body = response.json()
    assert body["tenant_id"] == 21
    assert body["public_slug"] == "rozetka"
    assert body["display_name"]


def test_tenant_login_branding_accepts_public_slug_for_demo_client():
    client = TestClient(app)
    response = client.get("/auth/tenant-login-branding?publicSlug=rozetka")

    assert response.status_code == 200
    body = response.json()
    assert body["tenant_id"] == 21
    assert body["public_slug"] == "rozetka"
    assert body["display_name"]


def test_legacy_portal_code_url_no_longer_resolves_demo_client():
    client = TestClient(app)
    response = client.get("/auth/tenant-entry/ooo_rozetka")

    assert response.status_code == 404
