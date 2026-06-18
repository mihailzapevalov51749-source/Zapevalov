"""Tests for Control Plane principal read-adoption pilot (WI-04)."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.control_plane.platform_identity.principal.constants import (
    PRINCIPAL_TYPE_PLATFORM,
    PRINCIPAL_TYPE_TENANT,
)
from app.modules.control_plane.platform_identity.principal.pilot import (
    PRINCIPAL_ID_HEADER,
    PRINCIPAL_ROLE_HEADER,
    PRINCIPAL_TYPE_HEADER,
)
from app.modules.control_plane.platform_identity.principal.resolver import get_current_principal
from app.modules.control_plane.platform_identity.principal.types import (
    PlatformPrincipal,
    TenantPrincipal,
)
from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER

PILOT_GET_ENDPOINTS = (
    "/control-plane/platform-profile/settings",
    "/control-plane/platform-users",
    "/control-plane/platform-environments",
)


def _override_admin() -> object:
    return object()


def test_pilot_endpoints_expose_principal_headers_for_platform_principal() -> None:
    identity_id = uuid.uuid4()
    principal = PlatformPrincipal(
        platform_identity_id=identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        email="owner@platform.test",
        display_name="Owner",
    )

    app.dependency_overrides[require_platform_admin] = _override_admin
    app.dependency_overrides[get_current_principal] = lambda: principal
    client = TestClient(app, raise_server_exceptions=False)
    try:
        for path in PILOT_GET_ENDPOINTS:
            response = client.get(path)
            assert response.status_code == 200, path
            assert response.headers.get(PRINCIPAL_TYPE_HEADER) == PRINCIPAL_TYPE_PLATFORM, path
            assert response.headers.get(PRINCIPAL_ID_HEADER) == str(identity_id), path
            assert response.headers.get(PRINCIPAL_ROLE_HEADER) == PLATFORM_ROLE_OWNER, path
    finally:
        app.dependency_overrides.pop(require_platform_admin, None)
        app.dependency_overrides.pop(get_current_principal, None)


def test_pilot_endpoints_expose_principal_headers_for_tenant_principal() -> None:
    principal = TenantPrincipal(user_id=42, tenant_id=21, role_key="company_admin")

    app.dependency_overrides[require_platform_admin] = _override_admin
    app.dependency_overrides[get_current_principal] = lambda: principal
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.get("/control-plane/platform-environments")
        assert response.status_code == 200
        assert response.headers.get(PRINCIPAL_TYPE_HEADER) == PRINCIPAL_TYPE_TENANT
        assert response.headers.get(PRINCIPAL_ID_HEADER) == "42"
        assert response.headers.get(PRINCIPAL_ROLE_HEADER) == "company_admin"
    finally:
        app.dependency_overrides.pop(require_platform_admin, None)
        app.dependency_overrides.pop(get_current_principal, None)


def test_non_pilot_get_endpoint_has_no_principal_headers() -> None:
    app.dependency_overrides[require_platform_admin] = _override_admin
    app.dependency_overrides[get_current_principal] = lambda: TenantPrincipal(
        user_id=1,
        tenant_id=None,
        role_key="admin",
    )
    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.get("/control-plane/tenants/summary")
        assert response.status_code == 200
        assert PRINCIPAL_TYPE_HEADER not in response.headers
    finally:
        app.dependency_overrides.pop(require_platform_admin, None)
        app.dependency_overrides.pop(get_current_principal, None)
