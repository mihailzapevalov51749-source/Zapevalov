"""Tests for tenant identity resolution in /tenants/{id}/users/me."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.models import Portal
from app.modules.tenant_roles.constants import TENANT_SUPERADMIN, TENANT_USER
from app.modules.tenant_users.identity_resolution import (
    IDENTITY_CONTEXT_PLATFORM_SERVICE,
    IDENTITY_CONTEXT_TENANT_MEMBER,
    PLATFORM_OWNER_ROLE_LABEL,
    PLATFORM_OWNER_SERVICE_DESCRIPTION,
)
from app.modules.tenant_users.me_service import get_tenant_me_user, update_tenant_me_user
from app.modules.tenant_users.membership_service import upsert_active_membership
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.tenant_users.profile_service import ensure_tenant_user_profile
from app.modules.users.models import Role, User


def _platform_settings_defaults() -> dict:
    return {
        "platform_name": "ЯсноПро",
        "platform_short_name": "ЯсноПро",
        "description": "Test",
        "timezone": "(UTC+03:00) Москва",
        "date_format": "DD.MM.YYYY",
        "time_format": "24h",
        "week_start_day": "Понедельник",
        "default_language": "ru",
    }


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
            PlatformSettings.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Portal(id=1, name="DEV", code="dev", tenant_type="DEV"),
            Portal(id=2, name="Rozetka", code="rozetka"),
            Portal(id=3, name="CLIENT", code="client", tenant_type="CLIENT"),
            Role(id=1, name="superadmin", description="superadmin"),
            Role(id=2, name=TENANT_USER, description="user"),
            Role(id=3, name="admin", description="platform admin"),
            User(
                id=13,
                email="owner@platform.test",
                full_name="Platform Owner Global Name",
                position="Platform Owner Global Position",
                avatar_url="http://example.com/platform-owner.jpg",
                hashed_password="hash",
                is_active=True,
                role_id=1,
            ),
            User(
                id=20,
                email="tenant.user@test",
                full_name="Tenant Only User",
                hashed_password="hash",
                is_active=True,
                tenant_id=3,
                role_id=2,
            ),
            PlatformSettings(
                id=PLATFORM_SETTINGS_SINGLETON_ID,
                platform_owner_user_id=13,
                platform_owner_full_name="Михаил Запевалов",
                platform_owner_email="owner@platform.test",
                platform_owner_phone="+79990000000",
                **_platform_settings_defaults(),
            ),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def test_tenant_me_reads_tenant_profile_not_global_user(db_session):
    upsert_active_membership(
        db_session,
        tenant_id=1,
        user_id=13,
        role_key=TENANT_SUPERADMIN,
    )
    ensure_tenant_user_profile(
        db_session,
        tenant_id=1,
        user=db_session.query(User).filter_by(id=13).one(),
        payload={
            "full_name": "DEV Employee",
            "position": "DEV Position",
            "avatar_url": "http://example.com/dev-avatar.jpg",
        },
    )
    db_session.commit()

    user = db_session.query(User).filter_by(id=13).one()
    payload = get_tenant_me_user(db_session, tenant_id=1, user=user)

    assert payload["identity_context"] == IDENTITY_CONTEXT_TENANT_MEMBER
    assert payload["full_name"] == "DEV Employee"
    assert payload["position"] == "DEV Position"


def test_platform_owner_without_membership_uses_platform_profile(db_session):
    user = db_session.query(User).filter_by(id=13).one()
    payload = get_tenant_me_user(db_session, tenant_id=3, user=user)

    assert payload["identity_context"] == IDENTITY_CONTEXT_PLATFORM_SERVICE
    assert payload["full_name"] == "Михаил Запевалов"
    assert payload["role"] == PLATFORM_OWNER_ROLE_LABEL
    assert payload["role_description"] == PLATFORM_OWNER_SERVICE_DESCRIPTION


def test_tenant_me_patch_updates_profile_not_global_user(db_session):
    upsert_active_membership(
        db_session,
        tenant_id=1,
        user_id=13,
        role_key=TENANT_SUPERADMIN,
    )
    ensure_tenant_user_profile(
        db_session,
        tenant_id=1,
        user=db_session.query(User).filter_by(id=13).one(),
        payload={"full_name": "Before"},
    )
    db_session.commit()

    user = db_session.query(User).filter_by(id=13).one()
    update_tenant_me_user(
        db_session,
        tenant_id=1,
        user=user,
        payload={
            "phone": "+79990001122",
            "position": "Patched DEV Role",
            "avatar_url": "http://example.com/patched.jpg",
        },
    )

    db_session.refresh(user)
    profile = (
        db_session.query(TenantUserProfile)
        .filter_by(tenant_id=1, user_id=13)
        .one()
    )

    assert user.full_name == "Platform Owner Global Name"
    assert profile.phone == "+79990001122"
    assert profile.position == "Patched DEV Role"


def test_tenant_me_isolated_between_tenants(db_session):
    upsert_active_membership(db_session, tenant_id=1, user_id=13, role_key=TENANT_SUPERADMIN)
    upsert_active_membership(db_session, tenant_id=2, user_id=13, role_key=TENANT_USER)
    user = db_session.query(User).filter_by(id=13).one()
    ensure_tenant_user_profile(
        db_session,
        tenant_id=1,
        user=user,
        payload={"full_name": "DEV Profile", "position": "DEV Job"},
    )
    ensure_tenant_user_profile(
        db_session,
        tenant_id=2,
        user=user,
        payload={"full_name": "Rozetka Profile", "position": "Rozetka Job"},
    )
    db_session.commit()

    dev_me = get_tenant_me_user(db_session, tenant_id=1, user=user)
    rozetka_me = get_tenant_me_user(db_session, tenant_id=2, user=user)

    assert dev_me["identity_context"] == IDENTITY_CONTEXT_TENANT_MEMBER
    assert dev_me["full_name"] == "DEV Profile"
    assert rozetka_me["full_name"] == "Rozetka Profile"


def test_access_denied_without_membership_or_platform_access(db_session):
    user = db_session.query(User).filter_by(id=20).one()

    with pytest.raises(HTTPException) as exc_info:
        get_tenant_me_user(db_session, tenant_id=3, user=user)

    assert exc_info.value.status_code == 403
