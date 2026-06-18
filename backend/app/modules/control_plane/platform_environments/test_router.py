from fastapi.testclient import TestClient

from app.main import app
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.control_plane.platform_identity.principal.resolver import get_current_principal
from app.modules.control_plane.platform_identity.principal.types import TenantPrincipal

def test_platform_environments_route_registered() -> None:
    from app.modules.control_plane.router import router as control_plane_router

    paths = {getattr(route, "path", "") for route in control_plane_router.routes}
    assert "/control-plane/platform-environments" in paths or "/control-plane/platform-environments/" in paths
    assert (
        "/control-plane/platform-environments/{portal_id}" in paths
        or "/control-plane/platform-environments/{portal_id}/" in paths
    )
    assert (
        "/control-plane/platform-environments/{portal_id}/bridge-ticket" in paths
    )

    app_paths = {getattr(route, "path", "") for route in app.routes}
    assert "/control-plane/platform-environments/{portal_id}/bridge-ticket" in app_paths


def test_list_platform_environments_requires_auth() -> None:
    client = TestClient(app, raise_server_exceptions=False)
    for path in ("/control-plane/platform-environments", "/control-plane/platform-environments/"):
        response = client.get(path)
        assert response.status_code in {401, 403}, path


def test_list_platform_environments_returns_three_slots() -> None:
    client = TestClient(app, raise_server_exceptions=False)
    fake_user = object()
    app.dependency_overrides[require_platform_admin] = lambda: fake_user
    app.dependency_overrides[get_current_principal] = lambda: TenantPrincipal(
        user_id=1,
        tenant_id=None,
        role_key="admin",
    )
    try:
        response = client.get("/control-plane/platform-environments")
    finally:
        app.dependency_overrides.pop(require_platform_admin, None)
        app.dependency_overrides.pop(get_current_principal, None)
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 3
    assert [item["id"] for item in payload] == [1, 2, 21]
    assert [item["environment_key"] for item in payload] == ["DEV", "TEMPLATE", "CLIENT"]
