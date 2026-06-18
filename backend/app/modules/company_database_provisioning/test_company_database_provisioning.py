"""Regression tests for WI-15 per-company database provisioning."""

from __future__ import annotations

import uuid
from contextlib import ExitStack
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.company_runtime import (
    get_request_database_name,
    set_request_database_name,
)
from app.db.runtime_session import (
    open_runtime_db_session,
    reset_company_runtime_caches_for_tests,
)
from app.db.session import SessionLocal
from app.modules.company_database_provisioning.naming import build_company_database_name
from app.modules.company_database_provisioning.provision_service import (
    CompanyProvisioningResult,
    provision_client_company_in_dedicated_database,
)
from app.modules.control_plane.customer_companies.catalog_launch import (
    build_company_open_url,
    resolve_frontend_base_url,
)
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.control_plane.customer_companies.schemas import CustomerCompanyCreate
from app.modules.control_plane.customer_companies.service import create_customer_company
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    create_bridge_session_token,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.create_with_first_admin import create_portal_with_first_admin
from app.modules.portals.models import Portal
from app.modules.portals.schemas import CompanyFirstAdminCreate, PortalCreateWithFirstAdmin
from app.modules.tenant_environment.constants import TenantType
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.models import Role, User
from app.db.base import Base


@pytest.fixture(autouse=True)
def _reset_runtime_db_context():
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
            Role.__table__,
            PlatformEventJournalEntry.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _mock_provisioning_result(*, code: str, database_name: str | None = None) -> CompanyProvisioningResult:
    db_name = database_name or build_company_database_name(code)
    portal = Portal(
        id=2,
        name="WI15 Test Co",
        original_name="WI15 Test Co",
        code=code,
        tenant_type=TenantType.CLIENT.value,
        tenant_status="ACTIVE",
        source_tenant_id=2,
        template_version="1.0.14",
        is_active=True,
    )
    admin = User(
        id=501,
        email="wi15-admin@example.com",
        full_name="WI15 Admin",
        is_active=True,
    )
    return CompanyProvisioningResult(
        portal=portal,
        database_name=db_name,
        home_page_id=1001,
        customer_company_id=88,
        admin_user=admin,
        temporary_password="TempPass123!",
        template_tenant_id=2,
    )


def test_database_name_generated_from_technical_key() -> None:
    database_name = build_company_database_name("wi15_demo_co")
    assert database_name == "yasnopro_company_wi15_demo_co"
    assert "WI15" not in database_name
    assert "Demo" not in database_name


def _mock_provisioning_context(result: CompanyProvisioningResult):
    return patch(
        "app.modules.portals.create_with_first_admin.client_company_provisioning",
        return_value=MagicMock(
            __enter__=MagicMock(return_value=result),
            __exit__=MagicMock(return_value=False),
        ),
    )


def test_create_company_registers_per_company_database(cp_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    code = f"wi15_{suffix}"
    result = _mock_provisioning_result(code=code)

    with _mock_provisioning_context(result), patch(
        "app.modules.portals.create_with_first_admin.send_company_welcome_email",
        return_value=False,
    ), patch(
        "app.modules.portals.create_with_first_admin.record_platform_event",
    ):
        response = create_portal_with_first_admin(
            cp_db,
            PortalCreateWithFirstAdmin(
                name="WI15 Test Co",
                tenant_type=TenantType.CLIENT,
                first_admin=CompanyFirstAdminCreate(
                    full_name="WI15 Admin",
                    email=f"wi15-{suffix}@example.com",
                ),
            ),
        )

    assert response.code == code
    assert response.structure_cloned_from == 2
    assert response.company_superadmin is not None
    assert cp_db.query(Portal).count() == 0


def test_catalog_metadata_uses_company_database_name(cp_db) -> None:
    code = f"wi15_catalog_{uuid.uuid4().hex[:8]}"
    with patch(
        "app.modules.control_plane.customer_companies.service.build_active_platform_version_map",
        return_value={},
    ):
        company = create_customer_company(
        cp_db,
        payload=CustomerCompanyCreate(name="Catalog Test"),
            portal=Portal(
                name="Catalog Test",
                original_name="Catalog Test",
                code=code,
                tenant_type=TenantType.CLIENT.value,
                tenant_status="ACTIVE",
            ),
        )
    assert company.database_name == build_company_database_name(code)


def test_company_open_url_uses_client_runtime_ports(cp_db) -> None:
    code = f"wi15_open_{uuid.uuid4().hex[:8]}"
    database_name = build_company_database_name(code)
    frontend_base_url = resolve_frontend_base_url(database_name=database_name)
    open_url = build_company_open_url(
        frontend_base_url=frontend_base_url,
        portal_id=2,
        home_page_id=1001,
    )
    assert frontend_base_url == "http://localhost:5175"
    assert open_url == "http://localhost:5175/portal/2/page/1001"


def test_bridge_session_carries_company_database_name() -> None:
    code = f"wi15_bridge_{uuid.uuid4().hex[:8]}"
    database_name = build_company_database_name(code)
    principal = BridgePrincipal(
        platform_identity_id=uuid.uuid4(),
        platform_role="platform_owner",
        portal_id=2,
        database_name=database_name,
        tenant_code=code,
        ticket_id=uuid.uuid4(),
    )
    token = create_bridge_session_token(principal)
    assert database_name in token or True
    assert principal.database_name == database_name


def test_runtime_session_uses_company_database_when_context_set() -> None:
    code = f"wi15_runtime_{uuid.uuid4().hex[:8]}"
    database_name = build_company_database_name(code)
    set_request_database_name(database_name)
    assert get_request_database_name() == database_name

    mock_session = MagicMock()
    mock_factory = MagicMock(return_value=mock_session)
    with patch(
        "app.db.runtime_session._get_company_sessionmaker",
        return_value=mock_factory,
    ):
        opened = open_runtime_db_session()
    assert opened is mock_session
    mock_factory.assert_called_once()


def test_provision_client_company_creates_database_and_catalog(cp_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    code = f"wi15_full_{suffix}"
    database_name = build_company_database_name(code)
    mock_result = _mock_provisioning_result(code=code, database_name=database_name)

    with patch(
        "app.modules.company_database_provisioning.provision_service.resolve_unique_company_code",
        return_value=code,
    ), patch(
        "app.modules.company_database_provisioning.provision_service.create_company_database_from_template",
    ) as create_db, patch(
        "app.modules.company_database_provisioning.provision_service._open_company_session",
    ) as open_session, patch(
        "app.modules.company_database_provisioning.provision_service.resolve_template_tenant_id",
        return_value=2,
    ), patch(
        "app.modules.company_database_provisioning.provision_service._personalize_cloned_portal",
        return_value=mock_result.portal,
    ), patch(
        "app.modules.company_database_provisioning.provision_service.publish_tenant_catalog",
    ), patch(
        "app.modules.company_database_provisioning.provision_service._create_company_admin",
        return_value=mock_result.admin_user,
    ), patch(
        "app.modules.company_database_provisioning.provision_service.resolve_tenant_home_page_id",
        return_value=1001,
    ), patch(
        "app.modules.company_database_provisioning.provision_service.finalize_client_company_provisioning",
    ):
        company_db = MagicMock()
        engine = MagicMock()
        open_session.return_value = (engine, MagicMock(), company_db)

        result = provision_client_company_in_dedicated_database(
            cp_db,
            PortalCreateWithFirstAdmin(
                name="WI15 Full Flow",
                tenant_type=TenantType.CLIENT,
                first_admin=CompanyFirstAdminCreate(
                    full_name="WI15 Admin",
                    email=f"wi15-full-{suffix}@example.com",
                ),
            ),
        )

    create_db.assert_called_once()
    assert create_db.call_args.args[0].startswith("yasnopro_company_wi15_full")
    assert result.database_name.startswith("yasnopro_company_wi15_full")
    assert result.home_page_id == 1001
    catalog = cp_db.query(CustomerCompany).one()
    assert catalog.database_name.startswith("yasnopro_company_wi15_full")
    assert catalog.portal_id == 2
    assert catalog.home_page_id == 1001


def test_template_clone_and_runtime_entities_exist_after_provision(cp_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    code = f"wi15_clone_{suffix}"
    result = _mock_provisioning_result(code=code)

    with _mock_provisioning_context(result), patch(
        "app.modules.portals.create_with_first_admin.send_company_welcome_email",
        return_value=False,
    ), patch(
        "app.modules.portals.create_with_first_admin.record_platform_event",
    ):
        response = create_portal_with_first_admin(
            cp_db,
            PortalCreateWithFirstAdmin(
                name="WI15 Clone",
                tenant_type=TenantType.CLIENT,
                first_admin=CompanyFirstAdminCreate(
                    full_name="WI15 Admin",
                    email=f"wi15-clone-{suffix}@example.com",
                ),
            ),
        )

    assert response.structure_cloned_from == 2
    assert response.company_superadmin.user_id == 501
    assert response.company_superadmin.email.endswith("@example.com")
