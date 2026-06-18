import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.portals.models import Portal
from app.modules.tenant_users.constants import MEMBERSHIP_STATUS_ACTIVE, MEMBERSHIP_STATUS_DISMISSED
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import Role, User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Portal.__table__,
            TenantUserMembership.__table__,
            User.__table__,
            Role.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add(Role(id=10, name="company_superadmin", description="Company Superadmin"))
    session.add(Portal(id=15, name="Tenant 15", code="tenant_15"))
    session.commit()
    try:
        yield session
    finally:
        session.close()


def test_user_has_tenant_access_by_primary_tenant_id(db_session):
    user = User(
        email="admin@example.com",
        full_name="Admin",
        hashed_password="hash",
        is_active=True,
        tenant_id=15,
        role_id=10,
    )
    db_session.add(user)
    db_session.commit()

    assert user_has_tenant_access(db_session, user, 15) is True
    assert user_has_tenant_access(db_session, user, 1) is False


def test_user_has_tenant_access_by_membership(db_session):
    user = User(
        email="admin@example.com",
        full_name="Admin",
        hashed_password="hash",
        is_active=True,
        role_id=10,
    )
    db_session.add(user)
    db_session.flush()
    db_session.add(
        TenantUserMembership(
            tenant_id=15,
            user_id=user.id,
            role_key="company_superadmin",
            is_active=True,
            membership_status=MEMBERSHIP_STATUS_ACTIVE,
        )
    )
    db_session.commit()

    assert user_has_tenant_access(db_session, user, 15) is True
    assert user_has_tenant_access(db_session, user, 1) is False


def test_user_has_no_tenant_access_when_membership_dismissed(db_session):
    user = User(
        email="dismissed@example.com",
        full_name="Dismissed",
        hashed_password="hash",
        is_active=True,
        role_id=10,
    )
    db_session.add(user)
    db_session.flush()
    db_session.add(
        TenantUserMembership(
            tenant_id=15,
            user_id=user.id,
            role_key="company_admin",
            is_active=False,
            membership_status=MEMBERSHIP_STATUS_DISMISSED,
        )
    )
    db_session.commit()

    assert user_has_tenant_access(db_session, user, 15) is False
