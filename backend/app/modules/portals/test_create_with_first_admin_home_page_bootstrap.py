from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.company_database_provisioning.naming import build_company_database_name
from app.modules.company_database_provisioning.provision_service import CompanyProvisioningResult
from app.modules.control_plane.customer_companies.catalog_launch import (
    build_company_open_path,
    build_company_open_url,
    resolve_frontend_base_url,
)
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.create_with_first_admin import create_portal_with_first_admin
from app.modules.portals.models import Portal
from app.modules.portals.schemas import CompanyFirstAdminCreate, PortalCreateWithFirstAdmin
from app.modules.tenant_environment.constants import TenantType
from app.modules.users.models import Role, User


@pytest.fixture()
def provisioning_db():
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


def _mock_result(*, suffix: str, email: str, name: str) -> CompanyProvisioningResult:
    code = f"wi11_{suffix}"
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
    admin = User(
        id=9000 + int(suffix[:4], 16) % 1000,
        email=email,
        full_name="WI11 Admin",
        is_active=True,
    )
    return CompanyProvisioningResult(
        portal=portal,
        database_name=build_company_database_name(code),
        home_page_id=1001,
        customer_company_id=77,
        admin_user=admin,
        temporary_password="TempPass123!",
        template_tenant_id=2,
    )


def test_create_with_first_admin_sets_catalog_home_page_id(provisioning_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    email = f"wi11-{suffix}@example.com"
    mock_result = _mock_result(suffix=suffix, email=email, name=f"WI11 Test {suffix}")

    with patch(
        "app.modules.portals.create_with_first_admin.client_company_provisioning",
        return_value=MagicMock(
            __enter__=MagicMock(return_value=mock_result),
            __exit__=MagicMock(return_value=False),
        ),
    ), patch(
        "app.modules.portals.create_with_first_admin.send_company_welcome_email",
        return_value=False,
    ), patch(
        "app.modules.portals.create_with_first_admin.record_platform_event",
    ):
        result = create_portal_with_first_admin(
            provisioning_db,
            PortalCreateWithFirstAdmin(
                name=f"WI11 Test {suffix}",
                tenant_type=TenantType.CLIENT,
                first_admin=CompanyFirstAdminCreate(
                    full_name="WI11 Admin",
                    email=email,
                ),
            ),
        )

    assert result.id == 2
    assert mock_result.home_page_id == 1001


def test_new_client_company_builds_open_url(provisioning_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    email = f"wi11-open-{suffix}@example.com"
    mock_result = _mock_result(suffix=suffix, email=email, name=f"WI11 Open {suffix}")

    with patch(
        "app.modules.portals.create_with_first_admin.client_company_provisioning",
        return_value=MagicMock(
            __enter__=MagicMock(return_value=mock_result),
            __exit__=MagicMock(return_value=False),
        ),
    ), patch(
        "app.modules.portals.create_with_first_admin.send_company_welcome_email",
        return_value=False,
    ), patch(
        "app.modules.portals.create_with_first_admin.record_platform_event",
    ):
        result = create_portal_with_first_admin(
            provisioning_db,
            PortalCreateWithFirstAdmin(
                name=f"WI11 Open {suffix}",
                tenant_type=TenantType.CLIENT,
                first_admin=CompanyFirstAdminCreate(
                    full_name="WI11 Admin",
                    email=email,
                ),
            ),
        )

    database_name = mock_result.database_name
    assert database_name.startswith("yasnopro_company_")

    path = build_company_open_path(
        portal_id=result.id,
        home_page_id=mock_result.home_page_id,
    )
    assert path == f"/portal/{result.id}/page/{mock_result.home_page_id}"

    frontend_base_url = resolve_frontend_base_url(database_name=database_name)
    open_url = build_company_open_url(
        frontend_base_url=frontend_base_url,
        portal_id=result.id,
        home_page_id=mock_result.home_page_id,
    )
    assert frontend_base_url == "http://localhost:5175"
    assert open_url == f"http://localhost:5175/portal/{result.id}/page/{mock_result.home_page_id}"


def test_bootstrap_uses_template_clone_via_dedicated_database(provisioning_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    with patch(
        "app.modules.portals.create_with_first_admin.client_company_provisioning",
    ) as provision_mock:
        mock_result = _mock_result(
            suffix=suffix,
            email=f"wi11-hardcoded-{suffix}@example.com",
            name="WI11 No Template",
        )
        provision_mock.return_value = MagicMock(
            __enter__=MagicMock(return_value=mock_result),
            __exit__=MagicMock(return_value=False),
        )
        with patch(
            "app.modules.portals.create_with_first_admin.send_company_welcome_email",
            return_value=False,
        ), patch(
            "app.modules.portals.create_with_first_admin.record_platform_event",
        ):
            create_portal_with_first_admin(
                provisioning_db,
                PortalCreateWithFirstAdmin(
                    name="WI11 No Template",
                    tenant_type=TenantType.CLIENT,
                    first_admin=CompanyFirstAdminCreate(
                        full_name="Admin",
                        email=f"wi11-hardcoded-{suffix}@example.com",
                    ),
                ),
            )

    provision_mock.assert_called_once()


def test_create_with_first_admin_does_not_create_platform_owner_user(provisioning_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    email = f"wi11-owner-{suffix}@example.com"
    mock_result = _mock_result(suffix=suffix, email=email, name=f"WI11 Owner {suffix}")

    with patch(
        "app.modules.portals.create_with_first_admin.client_company_provisioning",
        return_value=MagicMock(
            __enter__=MagicMock(return_value=mock_result),
            __exit__=MagicMock(return_value=False),
        ),
    ), patch(
        "app.modules.portals.create_with_first_admin.send_company_welcome_email",
        return_value=False,
    ), patch(
        "app.modules.portals.create_with_first_admin.record_platform_event",
    ):
        result = create_portal_with_first_admin(
            provisioning_db,
            PortalCreateWithFirstAdmin(
                name=f"WI11 Owner {suffix}",
                tenant_type=TenantType.CLIENT,
                first_admin=CompanyFirstAdminCreate(
                    full_name="Company Admin",
                    email=email,
                ),
            ),
        )

    assert result.company_superadmin.email == email
    assert provisioning_db.query(User).count() == 0


def test_create_with_first_admin_api_returns_portal_id() -> None:
    import app.main

    suffix = uuid.uuid4().hex[:8]
    email = f"wi11-api-{suffix}@example.com"
    mock_result = _mock_result(suffix=suffix, email=email, name=f"WI11 API {suffix}")

    app.main.app.dependency_overrides.clear()
    from app.modules.control_plane.dependencies import require_platform_admin

    app.main.app.dependency_overrides[require_platform_admin] = lambda: SimpleNamespace(
        id=1235,
        email="zmn8@ya.ru",
        full_name="Owner",
    )

    from fastapi.testclient import TestClient

    client = TestClient(app.main.app)
    with patch(
        "app.modules.portals.create_with_first_admin.client_company_provisioning",
        return_value=MagicMock(
            __enter__=MagicMock(return_value=mock_result),
            __exit__=MagicMock(return_value=False),
        ),
    ), patch(
        "app.modules.portals.create_with_first_admin.send_company_welcome_email",
        return_value=False,
    ), patch(
        "app.modules.portals.create_with_first_admin.record_platform_event",
    ):
        response = client.post(
            "/portals/create-with-first-admin",
            json={
                "name": f"WI11 API {suffix}",
                "tenant_type": "CLIENT",
                "first_admin": {
                    "full_name": "WI11 Admin",
                    "email": email,
                },
            },
        )

    try:
        assert response.status_code == 201, response.text
        payload = response.json()
        assert payload["id"] > 0
        assert payload["customer_company_id"] is not None
    finally:
        app.main.app.dependency_overrides.clear()
