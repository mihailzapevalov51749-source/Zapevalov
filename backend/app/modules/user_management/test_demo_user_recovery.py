import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.portals.models import Portal
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.user_management.demo_user_recovery import (
    DEMO_GLOBAL_USERS_TO_RESTORE,
    plan_demo_global_users_recovery,
    restore_demo_global_users,
)
from app.modules.users.models import Role, User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Portal.__table__,
            User.__table__,
            Role.__table__,
            TenantUserMembership.__table__,
            TenantUserProfile.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add(
        Portal(
            id=1,
            name="DEV Portal",
            code="dev_portal",
            tenant_type="DEV",
        )
    )
    session.add_all(
        [
            Role(id=1, name="user", description="User"),
            Role(id=4, name="superadmin", description="Superadmin"),
        ]
    )
    session.add(
        User(
            email="zmn8@ya.ru",
            full_name="Михаил Запевалов",
            hashed_password="hash",
            is_active=True,
            role_id=4,
            tenant_id=1,
        )
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def test_demo_global_users_to_restore_is_empty():
    assert DEMO_GLOBAL_USERS_TO_RESTORE == ()


def test_demo_global_users_to_restore_excludes_legacy_and_secondary_demo_users():
    emails = {spec.email for spec in DEMO_GLOBAL_USERS_TO_RESTORE}
    assert "mihailzapevalov51749@gmail.com" not in emails
    assert "yasno.pro@yandex.ru" not in emails
    assert "nino@yasnopro.ru" not in emails


def test_plan_demo_global_users_recovery_returns_empty_plan(db_session):
    plan = plan_demo_global_users_recovery(db_session)
    assert plan == []


def test_restore_demo_global_users_dry_run_does_not_create_users(db_session):
    before = db_session.query(User).count()
    restore_demo_global_users(db_session, dry_run=True, confirm=False)
    assert db_session.query(User).count() == before


def test_restore_demo_global_users_confirm_does_not_create_users(db_session):
    before_users = db_session.query(User).count()
    before_memberships = db_session.query(TenantUserMembership).count()
    before_profiles = db_session.query(TenantUserProfile).count()

    restore_demo_global_users(db_session, dry_run=False, confirm=True)

    assert db_session.query(User).count() == before_users
    assert db_session.query(TenantUserMembership).count() == before_memberships
    assert db_session.query(TenantUserProfile).count() == before_profiles
