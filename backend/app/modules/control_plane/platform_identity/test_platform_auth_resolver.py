"""Tests for platform auth resolver dual read (WI-05)."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_identity.constants import (
    CREDENTIAL_KIND_PASSWORD,
    CREDENTIAL_PROVIDER_LOCAL,
    CREDENTIAL_STATUS_ACTIVE,
    PLATFORM_IDENTITY_STATUS_ACTIVE,
    PLATFORM_ROLE_ADMIN,
    PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    PLATFORM_ROLE_OWNER,
)
from app.modules.control_plane.platform_identity.models import (
    PlatformCredential,
    PlatformIdentity,
    PlatformRoleBinding,
)
from app.modules.control_plane.platform_identity.platform_auth_resolver import (
    is_platform_owner_dual_read,
    is_platform_owner_legacy,
    is_platform_owner_via_store,
    link_platform_owner_after_login,
    resolve_platform_auth_context,
)
from app.modules.control_plane.platform_identity.principal.factory import build_principal_from_user
from app.modules.control_plane.platform_identity.principal.types import (
    PlatformPrincipal,
    TenantPrincipal,
)
from app.modules.control_plane.platform_identity.service import (
    create_platform_credential,
    create_platform_identity,
    create_platform_role_binding,
)
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.users.bootstrap_owner_service import user_is_platform_owner
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            User.__table__,
            PlatformSettings.__table__,
            PlatformIdentity.__table__,
            PlatformRoleBinding.__table__,
            PlatformCredential.__table__,
            TenantUserMembership.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _seed_owner(db_session) -> User:
    owner = User(
        email="owner@platform.test",
        full_name="Owner",
        hashed_password="hash",
        is_active=True,
        tenant_id=None,
    )
    db_session.add(owner)
    db_session.flush()
    db_session.add(
        PlatformSettings(
            id=PLATFORM_SETTINGS_SINGLETON_ID,
            platform_name="ЯсноПро",
            platform_short_name="ЯсноПро",
            timezone="(UTC+03:00) Москва",
            date_format="DD.MM.YYYY",
            time_format="24h",
            week_start_day="Понедельник",
            default_language="ru",
            platform_owner_user_id=owner.id,
        )
    )
    identity = create_platform_identity(
        db_session,
        email=owner.email,
        status=PLATFORM_IDENTITY_STATUS_ACTIVE,
        full_name=owner.full_name,
    )
    create_platform_role_binding(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        platform_role=PLATFORM_ROLE_OWNER,
        status=PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    )
    create_platform_credential(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        credential_kind=CREDENTIAL_KIND_PASSWORD,
        provider_key=CREDENTIAL_PROVIDER_LOCAL,
        status=CREDENTIAL_STATUS_ACTIVE,
        password_hash="hash",
    )
    db_session.commit()
    return owner


def test_platform_owner_resolved_via_store(db_session) -> None:
    owner = _seed_owner(db_session)

    assert is_platform_owner_via_store(db_session, owner) is True
    assert is_platform_owner_dual_read(db_session, owner) is True
    assert user_is_platform_owner(db_session, owner) is True

    ctx = resolve_platform_auth_context(db_session, owner)
    assert ctx.source == "store"
    assert ctx.is_platform_owner is True
    assert ctx.store_match is not None
    assert ctx.store_match.platform_role == PLATFORM_ROLE_OWNER

    principal = build_principal_from_user(db_session, owner)
    assert isinstance(principal, PlatformPrincipal)
    assert principal.platform_role == PLATFORM_ROLE_OWNER


def test_legacy_fallback_when_store_unavailable(db_session) -> None:
    owner = _seed_owner(db_session)

    with (
        patch(
            "app.modules.control_plane.platform_identity.platform_auth_resolver.resolve_platform_owner_store_match",
            return_value=None,
        ),
        patch(
            "app.modules.control_plane.platform_identity.platform_auth_resolver.resolve_platform_owner_store_entities",
            return_value=None,
        ),
        patch(
            "app.modules.control_plane.platform_identity.principal.factory.resolve_platform_owner_store_entities",
            return_value=None,
        ),
    ):
        assert is_platform_owner_via_store(db_session, owner) is False
        assert is_platform_owner_legacy(db_session, owner) is True
        assert is_platform_owner_dual_read(db_session, owner) is True
        assert user_is_platform_owner(db_session, owner) is True

        ctx = resolve_platform_auth_context(db_session, owner)
        assert ctx.source == "legacy"

        principal = build_principal_from_user(db_session, owner)
        assert isinstance(principal, TenantPrincipal)


def test_tenant_user_unchanged(db_session) -> None:
    user = User(
        email="tenant@company.test",
        hashed_password="hash",
        is_active=True,
        tenant_id=21,
    )
    db_session.add(user)
    db_session.commit()

    assert is_platform_owner_dual_read(db_session, user) is False
    assert user_is_platform_owner(db_session, user) is False

    principal = build_principal_from_user(db_session, user)
    assert isinstance(principal, TenantPrincipal)
    assert principal.tenant_id == 21


def test_store_admin_without_owner_binding_is_not_migrated(db_session) -> None:
    user = User(
        email="admin@platform.test",
        hashed_password="hash",
        is_active=True,
        tenant_id=None,
    )
    db_session.add(user)
    db_session.flush()
    identity = create_platform_identity(
        db_session,
        email=user.email,
        status=PLATFORM_IDENTITY_STATUS_ACTIVE,
    )
    create_platform_role_binding(
        db_session,
        platform_identity_id=identity.platform_identity_id,
        platform_role=PLATFORM_ROLE_ADMIN,
        status=PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    )
    db_session.commit()

    assert is_platform_owner_via_store(db_session, user) is False
    principal = build_principal_from_user(db_session, user)
    assert isinstance(principal, TenantPrincipal)


def test_link_platform_owner_after_login_returns_context(db_session) -> None:
    owner = _seed_owner(db_session)
    ctx = link_platform_owner_after_login(db_session, owner)
    assert ctx.source == "store"
    assert ctx.to_audit_dict()["is_platform_owner"] is True
