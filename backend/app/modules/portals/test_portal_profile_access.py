"""Portal profile read access for tenant company settings."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.dependencies import (
    TENANT_COMPANY_SETTINGS_FORBIDDEN_DETAIL,
    require_portal_profile_read_access,
    user_can_manage_tenant_company_settings,
)
from app.modules.portals.models import Portal
from app.modules.tenant_roles.constants import TENANT_ADMIN, TENANT_SUPERADMIN, TENANT_USER
from app.modules.tenant_users.membership_service import upsert_active_membership
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.bootstrap_owner_service import attach_platform_owner_flag
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
            PlatformSettings.__table__,
            TenantUserMembership.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Role(id=1, name="superadmin", description="Superadmin"),
            Role(id=2, name="admin", description="Admin"),
            Role(id=3, name="user", description="User"),
            Portal(id=10, name="Client Tenant", code="client"),
            Portal(id=11, name="Other Tenant", code="other"),
        ]
    )
    session.add(
        PlatformSettings(
            id=PLATFORM_SETTINGS_SINGLETON_ID,
            platform_name="Test Platform",
            platform_short_name="Test",
            timezone="UTC",
            date_format="DD.MM.YYYY",
            time_format="24h",
            week_start_day="monday",
            default_language="ru",
        )
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def _make_user(
    db_session,
    *,
    email: str,
    role_name: str,
    tenant_id: int | None = None,
) -> User:
    role_id = {"superadmin": 1, "admin": 2, "user": 3}[role_name]
    user = User(
        email=email,
        full_name=email,
        hashed_password="hash",
        is_active=True,
        tenant_id=tenant_id,
        role_id=role_id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _make_platform_owner(db_session) -> User:
    user = _make_user(db_session, email="owner@platform.example", role_name="superadmin", tenant_id=None)
    row = db_session.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    row.platform_owner_user_id = user.id
    row.platform_owner_email = user.email
    row.platform_owner_full_name = user.full_name
    db_session.commit()
    return attach_platform_owner_flag(db_session, user)


def test_tenant_superadmin_can_read_portal_profile(db_session):
    user = _make_user(db_session, email="super@client.example", role_name="superadmin", tenant_id=10)
    upsert_active_membership(
        db_session,
        tenant_id=10,
        user_id=user.id,
        role_key=TENANT_SUPERADMIN,
    )
    db_session.commit()

    assert user_can_manage_tenant_company_settings(db_session, user, 10) is True
    require_portal_profile_read_access(10, db=db_session, current_user=user)


def test_tenant_admin_is_denied_with_company_settings_message(db_session):
    user = _make_user(db_session, email="admin@client.example", role_name="admin", tenant_id=10)
    upsert_active_membership(
        db_session,
        tenant_id=10,
        user_id=user.id,
        role_key=TENANT_ADMIN,
    )
    db_session.commit()

    assert user_can_manage_tenant_company_settings(db_session, user, 10) is False

    with pytest.raises(HTTPException) as exc:
        require_portal_profile_read_access(10, db=db_session, current_user=user)

    assert exc.value.status_code == 403
    assert exc.value.detail == TENANT_COMPANY_SETTINGS_FORBIDDEN_DETAIL


def test_tenant_user_is_denied_with_company_settings_message(db_session):
    user = _make_user(db_session, email="user@client.example", role_name="user", tenant_id=10)
    upsert_active_membership(
        db_session,
        tenant_id=10,
        user_id=user.id,
        role_key=TENANT_USER,
    )
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        require_portal_profile_read_access(10, db=db_session, current_user=user)

    assert exc.value.status_code == 403
    assert exc.value.detail == TENANT_COMPANY_SETTINGS_FORBIDDEN_DETAIL


def test_tenant_superadmin_cannot_read_foreign_tenant_portal(db_session):
    user = _make_user(db_session, email="super@client.example", role_name="superadmin", tenant_id=10)
    upsert_active_membership(
        db_session,
        tenant_id=10,
        user_id=user.id,
        role_key=TENANT_SUPERADMIN,
    )
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        require_portal_profile_read_access(11, db=db_session, current_user=user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Нет доступа к компании"


def test_platform_owner_without_membership_can_read_portal_profile(db_session):
    owner = _make_platform_owner(db_session)

    assert owner.tenant_id is None
    require_portal_profile_read_access(10, db=db_session, current_user=owner)


def test_membership_superadmin_grants_access_even_when_global_role_is_user(db_session):
    user = _make_user(db_session, email="hidden-super@client.example", role_name="user", tenant_id=10)
    upsert_active_membership(
        db_session,
        tenant_id=10,
        user_id=user.id,
        role_key=TENANT_SUPERADMIN,
    )
    db_session.commit()

    assert user_can_manage_tenant_company_settings(db_session, user, 10) is True
    require_portal_profile_read_access(10, db=db_session, current_user=user)
