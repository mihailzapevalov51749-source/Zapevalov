import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch

from app.db.base import Base
from app.modules.control_plane.customer_companies.models import CustomerCompany
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.create_with_first_admin import create_portal_with_first_admin
from app.modules.portals.models import Portal
from app.modules.portals.schemas import CompanyFirstAdminCreate, PortalCreateWithFirstAdmin
from app.modules.tenant_environment.constants import TenantType
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.bootstrap_owner_service import is_visible_platform_user
from app.modules.users.models import Role, User
from app.modules.users.provisioning_credentials import generate_provisioning_password


@pytest.fixture()
def db_session():
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


def test_generate_provisioning_password_format():
    password = generate_provisioning_password()
    parts = password.split("-")
    assert len(parts) == 3
    assert all(len(part) == 4 for part in parts)


def test_create_portal_with_first_admin_provisions_company(db_session):
    with (
        patch(
            "app.modules.tenant_bootstrap.runtime_module_provisioning.provision_tenant_runtime_modules",
        ),
        patch(
            "app.modules.control_plane.customer_companies.service.build_active_platform_version_map",
            return_value={},
        ),
    ):
        result = create_portal_with_first_admin(
            db_session,
            PortalCreateWithFirstAdmin(
                name="ООО Ромашка",
                description="Клиент",
                tenant_type=TenantType.CLIENT,
                bootstrap_from_tenant_id=None,
                first_admin=CompanyFirstAdminCreate(
                    full_name="Иван Иванов",
                    email="admin@romashka.ru",
                    phone="+79990000000",
                    position="Директор",
                ),
            ),
        )

    assert result.code == "ooo_romashka"
    assert result.company_superadmin is not None
    assert result.company_superadmin.email == "admin@romashka.ru"
    assert result.customer_company_id is not None

    user = db_session.get(User, result.company_superadmin.user_id)
    assert user is not None
    assert user.tenant_id is None
    assert is_visible_platform_user(user) is False

    membership = (
        db_session.query(TenantUserMembership)
        .filter_by(tenant_id=result.id, user_id=user.id)
        .one()
    )
    assert membership.role_key == "superadmin"
    assert user.is_company_owner is False

    customer_company = db_session.get(CustomerCompany, result.customer_company_id)
    assert customer_company is not None
    assert customer_company.primary_portal_id == result.id
    assert customer_company.portal_id == result.id
    assert customer_company.code == result.code
    assert customer_company.tenant_type == TenantType.CLIENT.value
    assert customer_company.home_page_id is not None
    assert customer_company.home_page_id > 0


def test_create_portal_with_first_admin_rolls_back_on_duplicate_email(db_session):
    db_session.add(
        User(
            email="admin@romashka.ru",
            full_name="Existing",
            hashed_password="hash",
            is_active=True,
            role_id=10,
        )
    )
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        create_portal_with_first_admin(
            db_session,
            PortalCreateWithFirstAdmin(
                name="ООО Ромашка",
                bootstrap_from_tenant_id=None,
                first_admin=CompanyFirstAdminCreate(
                    full_name="Иван Иванов",
                    email="admin@romashka.ru",
                ),
            ),
        )

    assert exc.value.status_code == 409
    assert db_session.query(Portal).count() == 0
    assert db_session.query(CustomerCompany).count() == 0
