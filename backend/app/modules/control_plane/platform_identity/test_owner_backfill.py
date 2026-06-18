"""Tests for Platform Owner backfill into Platform Identity Store (WI-02)."""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_identity.constants import (
    CREDENTIAL_KIND_PASSWORD,
    CREDENTIAL_PROVIDER_LOCAL,
    CREDENTIAL_STATUS_ACTIVE,
    PLATFORM_IDENTITY_STATUS_ACTIVE,
    PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    PLATFORM_ROLE_OWNER,
)
from app.modules.control_plane.platform_identity.legacy_owner_audit import (
    resolve_legacy_platform_owner_audit,
)
from app.modules.control_plane.platform_identity.models import (
    PlatformCredential,
    PlatformIdentity,
    PlatformRoleBinding,
)
from app.modules.control_plane.platform_identity.owner_backfill_service import (
    PlatformOwnerBackfillError,
    backfill_platform_owner_identity,
    build_platform_owner_mapping_audit,
    map_user_to_identity_status,
    verify_dual_readiness,
)
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
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
        ],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _seed_legacy_owner(db_session) -> User:
    owner = User(
        email="owner@yasnopro.test",
        full_name="Platform Owner",
        phone="+70000000000",
        hashed_password="legacy-hash-value",
        is_active=True,
        login_disabled=False,
        account_status="active",
        tenant_id=None,
    )
    db_session.add(owner)
    db_session.flush()

    settings = PlatformSettings(
        id=PLATFORM_SETTINGS_SINGLETON_ID,
        platform_name="ЯсноПро",
        platform_short_name="ЯсноПро",
        timezone="(UTC+03:00) Москва",
        date_format="DD.MM.YYYY",
        time_format="24h",
        week_start_day="Понедельник",
        default_language="ru",
        platform_owner_user_id=owner.id,
        platform_owner_email=owner.email,
        platform_owner_full_name=owner.full_name,
    )
    db_session.add(settings)
    db_session.commit()
    return owner


def test_resolve_legacy_platform_owner_audit(db_session) -> None:
    owner = _seed_legacy_owner(db_session)
    audit = resolve_legacy_platform_owner_audit(db_session)

    assert audit is not None
    assert audit.user_id == owner.id
    assert audit.email == owner.email
    assert audit.hashed_password_present is True


def test_backfill_platform_owner_creates_store_rows(db_session) -> None:
    owner = _seed_legacy_owner(db_session)

    result = backfill_platform_owner_identity(db_session, commit=True)

    assert result.created_identity is True
    assert result.created_role_binding is True
    assert result.created_credential is True
    assert result.skipped is False
    assert result.mapping.legacy_user_id == owner.id
    assert result.mapping.platform_identity_id != uuid.UUID(int=owner.id)
    assert result.identity.email == "owner@yasnopro.test"
    assert result.role_binding.platform_role == PLATFORM_ROLE_OWNER
    assert result.credential.password_hash == "legacy-hash-value"
    assert result.credential.credential_kind == CREDENTIAL_KIND_PASSWORD
    assert result.credential.provider_key == CREDENTIAL_PROVIDER_LOCAL


def test_backfill_is_idempotent(db_session) -> None:
    _seed_legacy_owner(db_session)
    first = backfill_platform_owner_identity(db_session, commit=True)
    second = backfill_platform_owner_identity(db_session, commit=True)

    assert second.skipped is True
    assert second.mapping.platform_identity_id == first.mapping.platform_identity_id
    assert second.mapping.legacy_user_id == first.mapping.legacy_user_id


def test_mapping_audit_and_dual_readiness(db_session) -> None:
    owner = _seed_legacy_owner(db_session)
    backfill_platform_owner_identity(db_session, commit=True)

    mapping = build_platform_owner_mapping_audit(db_session)
    dual = verify_dual_readiness(db_session)

    assert mapping is not None
    assert mapping.legacy_user_id == owner.id
    assert dual["ready"] is True
    assert dual["email"] == "owner@yasnopro.test"
    assert dual["role"] == PLATFORM_ROLE_OWNER


def test_backfill_refuses_tenant_scoped_owner(db_session) -> None:
    owner = User(
        email="tenant-owner@yasnopro.test",
        hashed_password="hash",
        is_active=True,
        tenant_id=99,
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
    db_session.commit()

    with pytest.raises(PlatformOwnerBackfillError, match="tenant-scoped"):
        backfill_platform_owner_identity(db_session, commit=True)


def test_map_user_to_identity_status_active(db_session) -> None:
    owner = _seed_legacy_owner(db_session)
    assert map_user_to_identity_status(owner) == PLATFORM_IDENTITY_STATUS_ACTIVE
