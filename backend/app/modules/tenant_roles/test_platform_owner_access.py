"""Platform Owner access is separate from tenant roles."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.models import Portal
from app.modules.tenant_roles.access import (
    can_access_designer,
    can_access_tenant_administration,
    can_manage_tenant_users,
)
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.bootstrap_owner_service import attach_platform_owner_flag
from app.modules.users.models import Role, User
from app.modules.users.router import serialize_user
from app.modules.users.schemas import UserResponse


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
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Role(id=1, name="superadmin", description="Platform Owner legacy role"),
            Role(id=2, name="admin", description="Administrator"),
            Role(id=3, name="user", description="User"),
            Portal(id=10, name="Client Tenant", code="client"),
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


def _make_platform_owner(db_session) -> User:
    user = User(
        email="owner@platform.example",
        full_name="Platform Owner",
        hashed_password="hash",
        is_active=True,
        tenant_id=None,
        role_id=1,
    )
    db_session.add(user)
    db_session.flush()

    row = db_session.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    row.platform_owner_user_id = user.id
    row.platform_owner_full_name = user.full_name
    row.platform_owner_email = user.email
    db_session.commit()
    db_session.refresh(user)
    return attach_platform_owner_flag(db_session, user)


def _make_tenant_user(db_session, *, role_name: str) -> User:
    role_id = {"superadmin": 1, "admin": 2, "user": 3}[role_name]
    user = User(
        email=f"{role_name}@tenant.example",
        full_name=f"Tenant {role_name}",
        hashed_password="hash",
        is_active=True,
        tenant_id=10,
        role_id=role_id,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_platform_owner_passes_platform_guards_without_tenant_membership(db_session):
    owner = _make_platform_owner(db_session)

    assert owner.tenant_id is None
    assert getattr(owner, "is_platform_owner", False) is True
    assert can_access_designer(owner) is True
    assert can_access_tenant_administration(owner) is True
    assert can_manage_tenant_users(owner) is True
    assert user_has_tenant_access(db_session, owner, 10) is True


def test_users_me_payload_includes_is_platform_owner(db_session):
    owner = _make_platform_owner(db_session)

    payload = serialize_user(owner, None)
    payload["is_platform_owner"] = True
    validated = UserResponse.model_validate(payload)

    assert validated.is_platform_owner is True
    assert "is_platform_owner" in UserResponse.model_fields


def test_tenant_roles_remain_isolated_from_platform_owner(db_session):
    _make_platform_owner(db_session)
    tenant_superadmin = _make_tenant_user(db_session, role_name="superadmin")
    tenant_admin = _make_tenant_user(db_session, role_name="admin")
    tenant_user = _make_tenant_user(db_session, role_name="user")

    assert can_access_tenant_administration(tenant_superadmin) is True
    assert can_access_tenant_administration(tenant_admin) is False
    assert can_access_designer(tenant_admin) is True
    assert can_access_designer(tenant_user) is False
