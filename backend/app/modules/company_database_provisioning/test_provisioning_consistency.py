"""Regression tests for WI-15C provisioning transaction consistency."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.company_database_provisioning.naming import build_company_database_name
from app.modules.company_database_provisioning.orphan_detection import (
    detect_orphan_company_provisioning,
)
from app.modules.company_database_provisioning.provision_service import (
    CompanyProvisioningResult,
    client_company_provisioning,
    provision_client_company_in_dedicated_database,
)
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.control_plane.platform_identity.session_bridge.bridge_principal import (
    BridgePrincipal,
)
from app.modules.control_plane.platform_identity.session_bridge.bridge_session_jwt import (
    create_bridge_session_token,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.create_with_first_admin import create_portal_with_first_admin
from app.modules.portals.models import Portal
from app.modules.portals.schemas import CompanyFirstAdminCreate, PortalCreateWithFirstAdmin
from app.modules.tenant_environment.constants import TenantType
from app.modules.users.models import Role, User


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


def _mock_provisioning_result(*, code: str) -> CompanyProvisioningResult:
    database_name = build_company_database_name(code)
    portal = Portal(
        id=2,
        name="WI15C Test Co",
        original_name="WI15C Test Co",
        code=code,
        tenant_type=TenantType.CLIENT.value,
        tenant_status="ACTIVE",
        source_tenant_id=2,
        template_version="1.0.14",
        is_active=True,
    )
    admin = User(
        id=701,
        email="wi15c-admin@example.com",
        full_name="WI15C Admin",
        is_active=True,
    )
    return CompanyProvisioningResult(
        portal=portal,
        database_name=database_name,
        home_page_id=1001,
        customer_company_id=99,
        admin_user=admin,
        temporary_password="TempPass123!",
        template_tenant_id=2,
    )


def _provision_patches(*, code: str, admin_fail: bool = False, catalog_fail: bool = False):
    suffix = uuid.uuid4().hex[:8]
    full_code = f"{code}_{suffix}"
    mock_result = _mock_provisioning_result(code=full_code)
    company_db = MagicMock()

    def _create_admin(*args, **kwargs):
        if admin_fail:
            raise HTTPException(status_code=500, detail="admin failed")
        return mock_result.admin_user

    def _register_catalog(*args, **kwargs):
        if catalog_fail:
            raise HTTPException(status_code=500, detail="catalog failed")
        company = CustomerCompany(
            id=99,
            name=mock_result.portal.name,
            status="ACTIVE",
            portal_id=mock_result.portal.id,
            database_name=mock_result.database_name,
            code=mock_result.portal.code,
            home_page_id=mock_result.home_page_id,
        )
        kwargs["cp_db"].add(company)
        kwargs["cp_db"].flush()
        return company

    return full_code, mock_result, company_db, patch.multiple(
        "app.modules.company_database_provisioning.provision_service",
        create_company_database_from_template=MagicMock(),
        _open_company_session=MagicMock(
            return_value=(MagicMock(), MagicMock(), company_db),
        ),
        resolve_template_tenant_id=MagicMock(return_value=2),
        _personalize_cloned_portal=MagicMock(return_value=mock_result.portal),
        publish_tenant_catalog=MagicMock(),
        _create_company_admin=MagicMock(side_effect=_create_admin),
        resolve_tenant_home_page_id=MagicMock(return_value=1001),
        _register_catalog_entry=MagicMock(side_effect=_register_catalog),
    )


def test_db_created_failure_removes_db(cp_db) -> None:
    full_code, mock_result, company_db, patches = _provision_patches(code="wi15c_fail")

    with patches, patch(
        "app.modules.company_database_provisioning.provision_service.resolve_unique_company_code",
        return_value=full_code,
    ), patch(
        "app.modules.company_database_provisioning.provision_service.create_company_database_from_template",
        side_effect=RuntimeError("create failed"),
    ), patch(
        "app.modules.company_database_provisioning.provision_service.cleanup_failed_company_provisioning",
    ) as cleanup:
        with pytest.raises(HTTPException):
            provision_client_company_in_dedicated_database(
                cp_db,
                PortalCreateWithFirstAdmin(
                    name="WI15C Fail",
                    tenant_type=TenantType.CLIENT,
                    first_admin=CompanyFirstAdminCreate(
                        full_name="Admin",
                        email=f"{full_code}@example.com",
                    ),
                ),
            )

    cleanup.assert_called_once()
    assert cleanup.call_args.kwargs["database_name"] == mock_result.database_name


def test_admin_creation_failed_db_removed(cp_db) -> None:
    full_code, mock_result, company_db, patches = _provision_patches(code="wi15c_admin", admin_fail=True)

    with patches, patch(
        "app.modules.company_database_provisioning.provision_service.resolve_unique_company_code",
        return_value=full_code,
    ), patch(
        "app.modules.company_database_provisioning.provision_service.cleanup_failed_company_provisioning",
    ) as cleanup:
        with pytest.raises(HTTPException):
            provision_client_company_in_dedicated_database(
                cp_db,
                PortalCreateWithFirstAdmin(
                    name="WI15C Admin Fail",
                    tenant_type=TenantType.CLIENT,
                    first_admin=CompanyFirstAdminCreate(
                        full_name="Admin",
                        email=f"{full_code}@example.com",
                    ),
                ),
            )

    cleanup.assert_called()
    assert cleanup.call_args.kwargs["created_database"] is True


def test_catalog_creation_failed_db_removed(cp_db) -> None:
    full_code, mock_result, company_db, patches = _provision_patches(code="wi15c_catalog", catalog_fail=True)

    with patches, patch(
        "app.modules.company_database_provisioning.provision_service.resolve_unique_company_code",
        return_value=full_code,
    ), patch(
        "app.modules.company_database_provisioning.provision_service.cleanup_failed_company_provisioning",
    ) as cleanup:
        with pytest.raises(HTTPException):
            provision_client_company_in_dedicated_database(
                cp_db,
                PortalCreateWithFirstAdmin(
                    name="WI15C Catalog Fail",
                    tenant_type=TenantType.CLIENT,
                    first_admin=CompanyFirstAdminCreate(
                        full_name="Admin",
                        email=f"{full_code}@example.com",
                    ),
                ),
            )

    cleanup.assert_called()
    assert cleanup.call_args.kwargs["created_database"] is True


def test_successful_provisioning_commits_db_and_catalog(cp_db) -> None:
    suffix = uuid.uuid4().hex[:8]
    code = f"wi15c_ok_{suffix}"
    database_name = build_company_database_name(code)
    mock_result = _mock_provisioning_result(code=code)
    company_db = MagicMock()

    with patch(
        "app.modules.company_database_provisioning.provision_service.resolve_unique_company_code",
        return_value=code,
    ), patch(
        "app.modules.company_database_provisioning.provision_service.create_company_database_from_template",
    ), patch(
        "app.modules.company_database_provisioning.provision_service._open_company_session",
        return_value=(MagicMock(), MagicMock(), company_db),
    ), patch(
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
    ) as finalize:
        result = provision_client_company_in_dedicated_database(
            cp_db,
            PortalCreateWithFirstAdmin(
                name="WI15C OK",
                tenant_type=TenantType.CLIENT,
                first_admin=CompanyFirstAdminCreate(
                    full_name="Admin",
                    email=f"{code}@example.com",
                ),
            ),
        )

    finalize.assert_called_once()
    assert finalize.call_args.kwargs["database_name"] == database_name
    assert result.database_name == database_name
    assert cp_db.query(CustomerCompany).count() == 1


def test_cp_commit_failure_drops_company_database(cp_db) -> None:
    full_code, mock_result, company_db, patches = _provision_patches(code="wi15c_cp_fail")

    with patches, patch(
        "app.modules.company_database_provisioning.provision_service.resolve_unique_company_code",
        return_value=full_code,
    ), patch(
        "app.modules.company_database_provisioning.provision_service.finalize_client_company_provisioning",
        side_effect=RuntimeError("cp commit failed"),
    ), patch(
        "app.modules.company_database_provisioning.provision_service.cleanup_failed_company_provisioning",
    ) as cleanup:
        with pytest.raises(HTTPException):
            provision_client_company_in_dedicated_database(
                cp_db,
                PortalCreateWithFirstAdmin(
                    name="WI15C CP Fail",
                    tenant_type=TenantType.CLIENT,
                    first_admin=CompanyFirstAdminCreate(
                        full_name="Admin",
                        email=f"{full_code}@example.com",
                    ),
                ),
            )

    cleanup.assert_called()
    assert cleanup.call_args.kwargs["database_name"] == mock_result.database_name
    assert cleanup.call_args.kwargs["created_database"] is True


def test_orphan_detection_finds_db_without_catalog(cp_db) -> None:
    cp_db.add(
        CustomerCompany(
            name="Known Co",
            status="ACTIVE",
            portal_id=2,
            database_name=build_company_database_name("known_co"),
            code="known_co",
        ),
    )
    cp_db.commit()

    findings = detect_orphan_company_provisioning(
        cp_db,
        existing_database_names={
            build_company_database_name("known_co"),
            build_company_database_name("orphan_co"),
        },
    )

    kinds = {item.kind: item.database_name for item in findings}
    assert kinds["database_without_catalog"] == build_company_database_name("orphan_co")
    assert "catalog_without_database" not in kinds


def test_orphan_detection_finds_catalog_without_db(cp_db) -> None:
    missing_db = build_company_database_name("missing_co")
    cp_db.add(
        CustomerCompany(
            name="Missing DB Co",
            status="ACTIVE",
            portal_id=2,
            database_name=missing_db,
            code="missing_co",
        ),
    )
    cp_db.commit()

    findings = detect_orphan_company_provisioning(cp_db, existing_database_names=set())
    assert len(findings) == 1
    assert findings[0].kind == "catalog_without_database"
    assert findings[0].database_name == missing_db
    assert findings[0].catalog_code == "missing_co"


def test_bridge_still_works_after_provisioning_changes() -> None:
    code = f"wi15c_bridge_{uuid.uuid4().hex[:8]}"
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
    assert principal.database_name == database_name
    assert isinstance(token, str)
    assert len(token) > 20


def test_event_failure_triggers_cleanup(cp_db) -> None:
    full_code, mock_result, company_db, patches = _provision_patches(code="wi15c_event")

    with patches, patch(
        "app.modules.company_database_provisioning.provision_service.resolve_unique_company_code",
        return_value=full_code,
    ), patch(
        "app.modules.portals.create_with_first_admin.record_platform_event",
        side_effect=RuntimeError("event failed"),
    ), patch(
        "app.modules.company_database_provisioning.provision_service.cleanup_failed_company_provisioning",
    ) as cleanup:
        with pytest.raises(HTTPException):
            create_portal_with_first_admin(
                cp_db,
                PortalCreateWithFirstAdmin(
                    name="WI15C Event Fail",
                    tenant_type=TenantType.CLIENT,
                    first_admin=CompanyFirstAdminCreate(
                        full_name="Admin",
                        email=f"{full_code}@example.com",
                    ),
                ),
            )

    cleanup.assert_called()
    assert cleanup.call_args.kwargs["database_name"] == mock_result.database_name
