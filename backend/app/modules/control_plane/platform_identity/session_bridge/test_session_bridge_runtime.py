"""Runtime tests for Session Bridge endpoints (WI-07)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.main import app
from app.modules.auth.security import create_access_token
from app.modules.control_plane.customer_companies.schemas import (
    CustomerCompanyCatalogDetail,
)
from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.principal.resolver import (
    get_current_principal,
)
from app.modules.control_plane.platform_identity.principal.types import (
    PlatformPrincipal,
    TenantPrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.catalog_target import (
    resolve_bridge_target_from_catalog,
)
from app.modules.control_plane.platform_identity.session_bridge.dependencies import (
    require_platform_owner_principal,
)
from app.modules.control_plane.platform_identity.session_bridge.issuer import (
    mint_bridge_ticket as issuer_mint,
)
from app.modules.control_plane.platform_identity.session_bridge.mint_service import (
    mint_catalog_bridge_ticket,
)
from app.modules.control_plane.customer_companies.constants import CustomerCompanyStatus
from app.modules.tenant_environment.constants import TenantStatus, TenantType


@pytest.fixture()
def platform_principal() -> PlatformPrincipal:
    return PlatformPrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        email="owner@platform.test",
        display_name="Owner",
    )


def _catalog_detail(portal_id: int = 21) -> CustomerCompanyCatalogDetail:
    return CustomerCompanyCatalogDetail(
        id=portal_id,
        catalog_id=1,
        portal_id=portal_id,
        original_name="ООО Розетка",
        name="ООО Розетка",
        short_name="Розетка",
        code="ooo_rozetka",
        tenant_type=TenantType.CLIENT,
        platform_version="1.0",
        template_version="1.0",
        tenant_status=TenantStatus.ACTIVE,
        environment_role="DEMO_CLIENT",
        database_name="yasnopro_client",
        public_slug="rozetka",
        company_status=CustomerCompanyStatus.ACTIVE,
        home_page_id=100,
        frontend_base_url="http://localhost:5174",
        api_base_url="http://localhost:8001",
        open_url="http://localhost:5174/portal/21/page/100",
        created_at=datetime.now(timezone.utc),
        description=None,
        users_limit=100,
        source_tenant_id=None,
        notes=None,
    )


def test_platform_owner_mints_catalog_bridge_ticket(platform_principal, monkeypatch) -> None:
    db = MagicMock()
    monkeypatch.setattr(
        "app.modules.control_plane.platform_identity.session_bridge.mint_service.resolve_bridge_target_from_catalog",
        lambda _db, portal_id: ("yasnopro_client", "ooo_rozetka"),
    )

    response = mint_catalog_bridge_ticket(db, principal=platform_principal, portal_id=21)

    assert response.bridge_ticket
    assert response.portal_id == 21
    assert response.database_name == "yasnopro_client"
    assert response.tenant_code == "ooo_rozetka"
    assert response.ticket_id


def test_cp_bridge_ticket_endpoint_success(platform_principal, monkeypatch) -> None:
    from app.modules.control_plane.platform_identity.session_bridge.schemas import (
        BridgeTicketMintResponse,
    )

    def _fake_mint(db, *, principal, portal_id):
        return BridgeTicketMintResponse(
            bridge_ticket="signed-ticket",
            ticket_id=str(uuid.uuid4()),
            portal_id=portal_id,
            database_name="yasnopro_client",
            tenant_code="ooo_rozetka",
            expires_at=int(datetime.now(timezone.utc).timestamp()) + 300,
        )

    monkeypatch.setattr(
        "app.modules.control_plane.customer_companies.router.mint_catalog_bridge_ticket",
        _fake_mint,
    )
    app.dependency_overrides[require_platform_owner_principal] = lambda: platform_principal
    app.dependency_overrides[get_db] = lambda: MagicMock()

    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.post("/control-plane/customer-companies/catalog/21/bridge-ticket")
        assert response.status_code == 201
        body = response.json()
        assert body["bridge_ticket"] == "signed-ticket"
        assert body["tenant_code"] == "ooo_rozetka"
    finally:
        app.dependency_overrides.pop(require_platform_owner_principal, None)
        app.dependency_overrides.pop(get_db, None)


def test_cp_bridge_ticket_rejects_tenant_principal() -> None:
    tenant = TenantPrincipal(user_id=7, tenant_id=21, role_key="company_admin")
    app.dependency_overrides[get_current_principal] = lambda: tenant

    client = TestClient(app, raise_server_exceptions=False)
    try:
        response = client.post("/control-plane/customer-companies/catalog/21/bridge-ticket")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_principal, None)


def test_exchange_returns_bridge_jwt(platform_principal) -> None:
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
    assert body["access_token"]
    assert body["principal_type"] == "bridge"
    assert body["platform_identity_id"] == str(platform_principal.platform_identity_id)
    assert body["platform_role"] == PLATFORM_ROLE_OWNER
    assert body["portal_id"] == 21
    assert body["database_name"] == "yasnopro_client"
    assert body["tenant_code"] == "ooo_rozetka"
    assert body["is_infrastructure_superadmin"] is False
    assert body["is_platform_owner"] is False
    assert body.get("effective_role") in (None, "")


def test_exchange_template_owner_is_infrastructure_superadmin(platform_principal) -> None:
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
    assert body["environment_key"] == "TEMPLATE"
    assert body["is_infrastructure_superadmin"] is True
    assert body["is_platform_owner"] is True
    assert body["effective_role"] == "superadmin"


def test_bridge_me_returns_bridge_principal(platform_principal) -> None:
    ticket = issuer_mint(
        platform_principal,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
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
    assert body["principal_type"] == "bridge"
    assert body["platform_identity_id"] == str(platform_principal.platform_identity_id)
    assert body["platform_role"] == PLATFORM_ROLE_OWNER
    assert body["portal_id"] == 21
    assert body["database_name"] == "yasnopro_client"
    assert body["tenant_code"] == "ooo_rozetka"
    assert body["ticket_id"]
    assert body["is_infrastructure_superadmin"] is False
    assert body["is_platform_owner"] is False


def test_expired_bridge_ticket_rejected_on_exchange(platform_principal) -> None:
    issued_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    ticket = issuer_mint(
        platform_principal,
        portal_id=21,
        database_name="yasnopro_client",
        tenant_code="ooo_rozetka",
        ttl_seconds=60,
        issued_at=issued_at,
    )

    client = TestClient(app, raise_server_exceptions=False)
    response = client.post(
        "/auth/session-bridge/exchange",
        json={"bridge_ticket": ticket.token},
    )

    assert response.status_code == 401


def test_login_jwt_rejected_on_bridge_me() -> None:
    login_token = create_access_token({"sub": "1235"})
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(
        "/auth/session-bridge/me",
        headers={"Authorization": f"Bearer {login_token}"},
    )
    assert response.status_code == 401


def test_resolve_bridge_target_from_catalog(monkeypatch) -> None:
    detail = _catalog_detail()
    monkeypatch.setattr(
        "app.modules.control_plane.platform_identity.session_bridge.catalog_target.get_customer_company_catalog_item",
        lambda db, portal_id: detail if portal_id == 21 else None,
    )

    database_name, tenant_code = resolve_bridge_target_from_catalog(MagicMock(), portal_id=21)
    assert database_name == "yasnopro_client"
    assert tenant_code == "ooo_rozetka"
