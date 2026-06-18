"""OpenAPI registration smoke for platform environment bridge ticket (WI-17B)."""

from __future__ import annotations

from app.main import app


def test_openapi_exposes_platform_environment_bridge_ticket_route() -> None:
    schema = app.openapi()
    path = "/control-plane/platform-environments/{portal_id}/bridge-ticket"
    assert path in schema["paths"]
    assert "post" in schema["paths"][path]
