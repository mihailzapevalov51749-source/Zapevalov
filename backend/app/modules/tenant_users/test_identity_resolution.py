"""Tests for tenant vs platform service identity resolution."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.models import Portal
from app.modules.tenant_users.identity_resolution import (
    IDENTITY_CONTEXT_PLATFORM_SERVICE,
    IDENTITY_CONTEXT_TENANT_MEMBER,
    has_platform_service_access,
    resolve_identity_context,
)
from app.modules.tenant_users.membership_service import upsert_active_membership
from app.modules.tenant_users.models import TenantUserMembership
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
            PlatformSettings.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Portal(id=1, name="DEV", code="dev"),
            Role(id=1, name="superadmin", description="superadmin"),
            Role(id=2, name="admin", description="admin"),
            Role(id=3, name="user", description="user"),
            User(
                id=13,
                email="owner@platform.test",
                full_name="Owner",
                hashed_password="hash",
                is_active=True,
                role_id=1,
            ),
            User(
                id=21,
                email="admin@platform.test",
                full_name="Admin",
                hashed_password="hash",
                is_active=True,
                role_id=2,
            ),
            User(
                id=31,
                email="tenant.user@test",
                full_name="Tenant User",
                hashed_password="hash",
                is_active=True,
                tenant_id=1,
                role_id=3,
            ),
            PlatformSettings(
                id=PLATFORM_SETTINGS_SINGLETON_ID,
                platform_owner_user_id=13,
                platform_owner_full_name="Owner",
                platform_owner_email="owner@platform.test",
                platform_name="ЯсноПро",
                platform_short_name="ЯсноПро",
                timezone="(UTC+03:00) Москва",
                date_format="DD.MM.YYYY",
                time_format="24h",
                week_start_day="Понедельник",
                default_language="ru",
            ),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def test_resolve_identity_context_prefers_tenant_member(db_session):
    owner = db_session.query(User).filter_by(id=13).one()
    upsert_active_membership(db_session, tenant_id=1, user_id=13, role_key="superadmin")
    db_session.commit()

    assert (
        resolve_identity_context(db_session, user=owner, has_active_membership=True)
        == IDENTITY_CONTEXT_TENANT_MEMBER
    )


def test_resolve_identity_context_platform_service_without_membership(db_session):
    owner = db_session.query(User).filter_by(id=13).one()

    assert (
        resolve_identity_context(db_session, user=owner, has_active_membership=False)
        == IDENTITY_CONTEXT_PLATFORM_SERVICE
    )


def test_has_platform_service_access_for_owner_and_admin(db_session):
    owner = db_session.query(User).filter_by(id=13).one()
    admin = db_session.query(User).filter_by(id=21).one()
    tenant_user = db_session.query(User).filter_by(id=31).one()

    assert has_platform_service_access(db_session, owner) is True
    assert has_platform_service_access(db_session, admin) is True
    assert has_platform_service_access(db_session, tenant_user) is False
