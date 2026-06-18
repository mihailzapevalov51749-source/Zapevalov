"""Regression tests for WI-15D catalog-backed runtime routing validation."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.db.runtime_session import reset_company_runtime_caches_for_tests
from app.db.company_runtime_middleware import (
    BridgeRuntimeRoutingDecision,
    RUNTIME_ROUTING_DENIED_DETAIL,
    resolve_bridge_runtime_routing,
)
from app.db.runtime_routing_validation import validate_bridge_runtime_routing
from app.main import app
from app.modules.company_database_provisioning.naming import build_company_database_name
from app.modules.control_plane.customer_companies.constants import CustomerCompanyStatus
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.control_plane.platform_identity.constants import PLATFORM_ROLE_OWNER
from app.modules.control_plane.platform_identity.principal.types import PlatformPrincipal
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    create_bridge_session_token,
)
from app.modules.control_plane.platform_identity.session_bridge.issuer import (
    mint_bridge_ticket as issuer_mint,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantStatus, TenantType
from app.modules.users.models import User


@pytest.fixture(autouse=True)
def _reset_runtime_context():
    reset_company_runtime_caches_for_tests()
    yield
    reset_company_runtime_caches_for_tests()


@pytest.fixture()
def cp_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Portal.__table__,
            CustomerCompany.__table__,
            User.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _seed_company(
    cp_db,
    *,
    portal_id: int = 21,
    code: str = "wi15d_test",
    database_name: str | None = None,
    status: str = CustomerCompanyStatus.ACTIVE.value,
) -> tuple[Portal, CustomerCompany]:
    db_name = database_name or build_company_database_name(code)
    portal = Portal(
        id=portal_id,
        name="WI15D Test Co",
        original_name="WI15D Test Co",
        code=code,
        tenant_type=TenantType.CLIENT.value,
        tenant_status=TenantStatus.ACTIVE.value,
        template_version="1.0.0",
        is_active=True,
    )
    company = CustomerCompany(
        name="WI15D Test Co",
        status=status,
        portal_id=portal_id,
        database_name=db_name,
        code=code,
        tenant_type=TenantType.CLIENT.value,
        tenant_status=TenantStatus.ACTIVE.value,
    )
    cp_db.add(portal)
    cp_db.add(company)
    cp_db.commit()
    return portal, company


def _bridge_token(
    *,
    portal_id: int,
    database_name: str,
    tenant_code: str = "wi15d_test",
) -> str:
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        portal_id=portal_id,
        database_name=database_name,
        tenant_code=tenant_code,
        ticket_id=uuid.uuid4(),
    )
    return create_bridge_session_token(principal)


def test_valid_portal_and_database_name_grants_access(cp_db) -> None:
    code = f"wi15d_ok_{uuid.uuid4().hex[:8]}"
    database_name = build_company_database_name(code)
    _seed_company(cp_db, portal_id=21, code=code, database_name=database_name)

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        result = validate_bridge_runtime_routing(
            cp_db,
            portal_id=21,
            jwt_database_name=database_name,
        )

    assert result.allowed is True
    assert result.database_name == database_name
    assert result.reason_code is None


def test_missing_portal_catalog_entry_denies_access(cp_db) -> None:
    code = f"wi15d_missing_{uuid.uuid4().hex[:8]}"
    database_name = build_company_database_name(code)

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        result = validate_bridge_runtime_routing(
            cp_db,
            portal_id=99,
            jwt_database_name=database_name,
        )

    assert result.allowed is False
    assert result.reason_code == "catalog_missing"


def test_database_name_mismatch_denies_access(cp_db) -> None:
    code_a = f"wi15d_a_{uuid.uuid4().hex[:8]}"
    code_b = f"wi15d_b_{uuid.uuid4().hex[:8]}"
    database_name_a = build_company_database_name(code_a)
    database_name_b = build_company_database_name(code_b)
    _seed_company(cp_db, portal_id=21, code=code_a, database_name=database_name_a)

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        result = validate_bridge_runtime_routing(
            cp_db,
            portal_id=21,
            jwt_database_name=database_name_b,
        )

    assert result.allowed is False
    assert result.reason_code == "database_name_mismatch"


def test_deleted_company_denies_access(cp_db) -> None:
    code = f"wi15d_deleted_{uuid.uuid4().hex[:8]}"
    database_name = build_company_database_name(code)
    _seed_company(cp_db, portal_id=21, code=code, database_name=database_name)
    cp_db.query(CustomerCompany).delete()
    cp_db.commit()

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        result = validate_bridge_runtime_routing(
            cp_db,
            portal_id=21,
            jwt_database_name=database_name,
        )

    assert result.allowed is False
    assert result.reason_code == "catalog_missing"


def test_missing_runtime_database_denies_access(cp_db) -> None:
    code = f"wi15d_nodb_{uuid.uuid4().hex[:8]}"
    database_name = build_company_database_name(code)
    _seed_company(cp_db, portal_id=21, code=code, database_name=database_name)

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=False,
    ):
        result = validate_bridge_runtime_routing(
            cp_db,
            portal_id=21,
            jwt_database_name=database_name,
        )

    assert result.allowed is False
    assert result.reason_code == "runtime_database_missing"


def test_foreign_database_access_denied(cp_db) -> None:
    code_a = f"wi15d_foreign_a_{uuid.uuid4().hex[:8]}"
    code_b = f"wi15d_foreign_b_{uuid.uuid4().hex[:8]}"
    database_name_a = build_company_database_name(code_a)
    database_name_b = build_company_database_name(code_b)
    _seed_company(cp_db, portal_id=21, code=code_a, database_name=database_name_a)
    _seed_company(cp_db, portal_id=22, code=code_b, database_name=database_name_b)

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        result = validate_bridge_runtime_routing(
            cp_db,
            portal_id=21,
            jwt_database_name=database_name_b,
        )

    assert result.allowed is False
    assert result.reason_code == "database_name_mismatch"


def test_blocked_company_status_denies_access(cp_db) -> None:
    code = f"wi15d_blocked_{uuid.uuid4().hex[:8]}"
    database_name = build_company_database_name(code)
    _seed_company(
        cp_db,
        portal_id=21,
        code=code,
        database_name=database_name,
        status=CustomerCompanyStatus.BLOCKED.value,
    )

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        result = validate_bridge_runtime_routing(
            cp_db,
            portal_id=21,
            jwt_database_name=database_name,
        )

    assert result.allowed is False
    assert result.reason_code == "company_status_denied"


@pytest.fixture()
def platform_principal() -> PlatformPrincipal:
    return PlatformPrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role=PLATFORM_ROLE_OWNER,
        email="owner@platform.test",
        display_name="Owner",
    )


def test_legacy_demo_client_database_grants_access(cp_db) -> None:
    _seed_company(
        cp_db,
        portal_id=21,
        code="ooo_rozetka",
        database_name="yasnopro_client",
    )

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        result = validate_bridge_runtime_routing(
            cp_db,
            portal_id=21,
            jwt_database_name="yasnopro_client",
        )

    assert result.allowed is True
    assert result.database_name == "yasnopro_client"
    assert result.reason_code is None


def test_infrastructure_database_denied_for_client_bridge(cp_db) -> None:
    _seed_company(
        cp_db,
        portal_id=21,
        code="ooo_rozetka",
        database_name="yasnopro_dev",
    )

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        result = validate_bridge_runtime_routing(
            cp_db,
            portal_id=21,
            jwt_database_name="yasnopro_dev",
        )

    assert result.allowed is False
    assert result.reason_code == "invalid_jwt_database"


def test_session_bridge_exchange_still_works(platform_principal) -> None:
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
    assert body["portal_id"] == 21
    assert body["database_name"] == "yasnopro_client"


def test_runtime_routing_middleware_allows_valid_bridge_jwt(cp_db) -> None:
    code = f"wi15d_mw_ok_{uuid.uuid4().hex[:8]}"
    database_name = build_company_database_name(code)
    _seed_company(cp_db, portal_id=21, code=code, database_name=database_name)
    token = _bridge_token(portal_id=21, database_name=database_name, tenant_code=code)

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        decision = resolve_bridge_runtime_routing(token, cp_db=cp_db)

    assert decision.kind == "allowed"
    assert decision.database_name == database_name


def test_runtime_routing_middleware_denies_mismatch(cp_db, monkeypatch) -> None:
    code_a = f"wi15d_mw_bad_{uuid.uuid4().hex[:8]}"
    code_b = f"wi15d_mw_bad_b_{uuid.uuid4().hex[:8]}"
    database_name_a = build_company_database_name(code_a)
    database_name_b = build_company_database_name(code_b)
    _seed_company(cp_db, portal_id=21, code=code_a, database_name=database_name_a)
    token = _bridge_token(portal_id=21, database_name=database_name_b, tenant_code=code_b)

    monkeypatch.setenv("YASNOPRO_ENV", "CLIENT")

    with patch(
        "app.db.runtime_routing_validation.catalog_database_exists",
        return_value=True,
    ):
        decision = resolve_bridge_runtime_routing(token, cp_db=cp_db)

    assert decision.kind == "denied"


def test_runtime_routing_middleware_returns_403_on_denied(monkeypatch) -> None:
    code = f"wi15d_http_{uuid.uuid4().hex[:8]}"
    foreign_db = build_company_database_name(f"{code}_foreign")
    token = _bridge_token(portal_id=21, database_name=foreign_db, tenant_code=code)

    monkeypatch.setenv("YASNOPRO_ENV", "CLIENT")

    with patch(
        "app.db.company_runtime_middleware.resolve_bridge_runtime_routing",
        return_value=BridgeRuntimeRoutingDecision(kind="denied"),
    ):
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get(
            "/navigation/portal/21/tree",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403
    assert response.json()["detail"] == RUNTIME_ROUTING_DENIED_DETAIL
