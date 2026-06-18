from __future__ import annotations

import uuid
from contextlib import ExitStack, contextmanager
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.environment_guard import ENVIRONMENT_MATRIX
from app.modules.company_database_provisioning.naming import build_company_database_name
from app.modules.company_database_provisioning.provision_service import CompanyProvisioningResult
from app.db.base import Base
from app.modules.control_plane.customer_companies.catalog_fields import (
    is_client_dev_database_misconfiguration,
    is_control_plane_frontend_url,
    resolve_catalog_runtime_database_name,
)
from app.modules.control_plane.customer_companies.catalog_launch import (
    build_company_open_url,
    resolve_frontend_base_url,
)
from app.modules.control_plane.customer_companies.catalog_service import (
    list_customer_company_catalog,
)
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.control_plane.customer_companies.schemas import CustomerCompanyCreate
from app.modules.control_plane.customer_companies.service import create_customer_company
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.create_with_first_admin import create_portal_with_first_admin
from app.modules.portals.models import Portal
from app.modules.portals.schemas import CompanyFirstAdminCreate, PortalCreateWithFirstAdmin
from app.modules.tenant_environment.constants import TenantType
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.models import Role, User


_PROVISIONING_PATCHES = (
    patch(
        "app.modules.portals.create_with_first_admin.send_company_welcome_email",
        return_value=False,
    ),
    patch(
        "app.modules.portals.create_with_first_admin.record_platform_event",
    ),
)


def _mock_provision_result(*, suffix: str, email: str, name: str) -> CompanyProvisioningResult:
    code = f"wi12_{suffix}"
    portal = Portal(
        id=2,
        name=name,
        original_name=name,
        code=code,
        tenant_type=TenantType.CLIENT.value,
        tenant_status="ACTIVE",
        source_tenant_id=2,
        is_active=True,
    )
    return CompanyProvisioningResult(
        portal=portal,
        database_name=build_company_database_name(code),
        home_page_id=1001,
        customer_company_id=99,
        admin_user=User(
            id=7001,
            email=email,
            full_name="WI12 Admin",
            is_active=True,
        ),
        temporary_password="TempPass123!",
        template_tenant_id=2,
    )


@contextmanager
def provisioning_patches():
    with ExitStack() as stack:
        for item in _PROVISIONING_PATCHES:
            stack.enter_context(item)
        yield


@pytest.fixture()
def provisioning_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Portal.__table__,
            Page.__table__,
            NavigationItem.__table__,
            CustomerCompany.__table__,
            TenantUserMembership.__table__,
            TenantUserProfile.__table__,
            User.__table__,
            Role.__table__,
            PlatformEventJournalEntry.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add(Role(id=10, name="superadmin", description="Суперадминистратор"))
    session.commit()
    try:
        yield session
    finally:
        session.close()


def test_client_catalog_runtime_database_is_not_dev() -> None:
    database_name = resolve_catalog_runtime_database_name(
        tenant_type=TenantType.CLIENT.value,
        company_code="wi12_demo",
    )
    assert database_name == "yasnopro_company_wi12_demo"
    assert database_name != ENVIRONMENT_MATRIX["DEV"].database


def test_client_frontend_base_url_is_not_control_plane() -> None:
    database_name = build_company_database_name("wi12_demo")
    frontend_base_url = resolve_frontend_base_url(database_name=database_name)
    assert frontend_base_url == "http://localhost:5175"
    assert not is_control_plane_frontend_url(frontend_base_url)


def test_client_company_builds_valid_open_url(provisioning_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    email = f"wi12-open-{suffix}@example.com"
    mock_result = _mock_provision_result(
        suffix=suffix,
        email=email,
        name=f"WI12 Open {suffix}",
    )

    with provisioning_patches(), patch(
        "app.modules.portals.create_with_first_admin.client_company_provisioning",
        return_value=MagicMock(
            __enter__=MagicMock(return_value=mock_result),
            __exit__=MagicMock(return_value=False),
        ),
    ):
        result = create_portal_with_first_admin(
            provisioning_db,
            PortalCreateWithFirstAdmin(
                name=f"WI12 Open {suffix}",
                tenant_type=TenantType.CLIENT,
                first_admin=CompanyFirstAdminCreate(
                    full_name="WI12 Admin",
                    email=email,
                ),
            ),
        )

    company = CustomerCompany(
        id=mock_result.customer_company_id,
        name=f"WI12 Open {suffix}",
        status="active",
        portal_id=result.id,
        database_name=mock_result.database_name,
        code=mock_result.portal.code,
        tenant_type=TenantType.CLIENT.value,
        tenant_status="ACTIVE",
        home_page_id=mock_result.home_page_id,
    )
    assert company.database_name.startswith("yasnopro_company_")
    assert company.home_page_id is not None

    open_url = build_company_open_url(
        frontend_base_url=resolve_frontend_base_url(database_name=company.database_name),
        portal_id=result.id,
        home_page_id=company.home_page_id,
    )
    assert open_url == f"http://localhost:5175/portal/{result.id}/page/{company.home_page_id}"


def test_create_customer_company_assigns_client_runtime_database(provisioning_db) -> None:
    portal = Portal(
        name="WI12 Catalog",
        original_name="WI12 Catalog",
        code=f"wi12_catalog_{uuid.uuid4().hex[:8]}",
        tenant_type=TenantType.CLIENT.value,
        tenant_status="ACTIVE",
    )
    provisioning_db.add(portal)
    provisioning_db.flush()

    with patch(
        "app.modules.control_plane.customer_companies.service.build_active_platform_version_map",
        return_value={},
    ):
        company = create_customer_company(
            provisioning_db,
            payload=CustomerCompanyCreate(name="WI12 Catalog"),
            portal=portal,
        )

    assert company.database_name == build_company_database_name(portal.code)


def test_create_with_first_admin_does_not_create_platform_owner_membership(provisioning_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    email = f"wi12-owner-{suffix}@example.com"

    mock_result = _mock_provision_result(
        suffix=suffix,
        email=email,
        name=f"WI12 Owner {suffix}",
    )

    with provisioning_patches(), patch(
        "app.modules.portals.create_with_first_admin.client_company_provisioning",
        return_value=MagicMock(
            __enter__=MagicMock(return_value=mock_result),
            __exit__=MagicMock(return_value=False),
        ),
    ):
        result = create_portal_with_first_admin(
            provisioning_db,
            PortalCreateWithFirstAdmin(
                name=f"WI12 Owner {suffix}",
                tenant_type=TenantType.CLIENT,
                first_admin=CompanyFirstAdminCreate(
                    full_name="Company Admin",
                    email=email,
                ),
            ),
        )

    assert result.company_superadmin.email == email
    assert provisioning_db.query(User).count() == 0


def test_catalog_repairs_client_dev_database_misconfiguration() -> None:
    db = MagicMock()
    company = SimpleNamespace(
        id=8,
        name="Demo",
        status="active",
        primary_portal_id=None,
        portal_id=14,
        database_name="yasnopro_dev",
        code="demo_tehzak",
        tenant_type=TenantType.CLIENT.value,
        environment_role=None,
        tenant_status="ACTIVE",
        original_name="Demo",
        short_name=None,
        public_slug=None,
        template_version="1.0.0",
        platform_version=None,
        home_page_id=793,
        frontend_base_url="http://localhost:5173",
        api_base_url="http://localhost:8010",
        users_limit=10,
        created_at=datetime.now(timezone.utc),
    )
    db.scalars.return_value.all.return_value = [company]

    items = list_customer_company_catalog(db)

    assert len(items) == 1
    assert items[0].database_name == ENVIRONMENT_MATRIX["CLIENT"].database
    assert items[0].frontend_base_url == "http://localhost:5175"
    assert company.database_name == ENVIRONMENT_MATRIX["CLIENT"].database
    assert company.frontend_base_url is None


def test_wi_test_cleanup_removes_all_records(provisioning_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    portal = Portal(
        name=f"WI12 Cleanup {suffix}",
        original_name=f"WI12 Cleanup {suffix}",
        code=f"wi12_cleanup_{suffix}",
        tenant_type=TenantType.CLIENT.value,
        tenant_status="ACTIVE",
    )
    provisioning_db.add(portal)
    provisioning_db.flush()

    page = Page(portal_id=portal.id, title="Home", is_home=True)
    provisioning_db.add(page)
    provisioning_db.flush()

    nav = NavigationItem(
        portal_id=portal.id,
        title="Home",
        type="page",
        page_id=page.id,
        sort_order=0,
    )
    provisioning_db.add(nav)

    user = User(
        email=f"wi12-cleanup-{suffix}@example.com",
        full_name="Cleanup User",
        hashed_password="test-hash",
    )
    provisioning_db.add(user)
    provisioning_db.flush()

    membership = TenantUserMembership(
        tenant_id=portal.id,
        user_id=user.id,
        role_key="superadmin",
    )
    provisioning_db.add(membership)

    company = CustomerCompany(
        name=f"WI12 Cleanup {suffix}",
        status="active",
        portal_id=portal.id,
        database_name=build_company_database_name(portal.code),
        code=portal.code,
        tenant_type=TenantType.CLIENT.value,
        tenant_status="ACTIVE",
        home_page_id=page.id,
    )
    provisioning_db.add(company)
    provisioning_db.commit()

    portal_id = portal.id
    user_id = user.id
    company_id = company.id

    provisioning_db.query(TenantUserMembership).filter(
        TenantUserMembership.tenant_id == portal_id
    ).delete()
    provisioning_db.delete(company)
    provisioning_db.query(NavigationItem).filter(NavigationItem.portal_id == portal_id).delete()
    provisioning_db.query(Page).filter(Page.portal_id == portal_id).delete()
    provisioning_db.delete(user)
    provisioning_db.delete(portal)
    provisioning_db.commit()

    assert provisioning_db.get(Portal, portal_id) is None
    assert provisioning_db.get(CustomerCompany, company_id) is None
    assert provisioning_db.get(User, user_id) is None
    assert provisioning_db.query(Page).filter(Page.portal_id == portal_id).count() == 0
    assert (
        provisioning_db.query(NavigationItem)
        .filter(NavigationItem.portal_id == portal_id)
        .count()
        == 0
    )


def test_is_client_dev_database_misconfiguration_guard() -> None:
    assert is_client_dev_database_misconfiguration(
        tenant_type=TenantType.CLIENT.value,
        database_name="yasnopro_dev",
    )
    assert not is_client_dev_database_misconfiguration(
        tenant_type=TenantType.CLIENT.value,
        database_name=build_company_database_name("wi12_demo"),
    )
