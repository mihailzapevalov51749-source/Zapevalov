import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_users.models import PlatformUser
from app.modules.control_plane.platform_users.reset_service import reset_platform_users
from app.modules.platform_data_safety.destructive_guard import DestructiveOperationBlocked
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.models import Role, User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            PlatformSettings.__table__,
            PlatformEventJournalEntry.__table__,
            PlatformUser.__table__,
            User.__table__,
            Role.__table__,
            TenantUserMembership.__table__,
            TenantUserProfile.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            Role(id=1, name="user", description="User"),
            Role(id=4, name="superadmin", description="Platform Owner"),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def _seed_platform_settings(db_session) -> PlatformSettings:
    row = db_session.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if row is None:
        row = PlatformSettings(
            id=PLATFORM_SETTINGS_SINGLETON_ID,
            platform_name="ЯсноПро",
            platform_short_name="ЯсноПро",
            timezone="(UTC+03:00) Москва",
            date_format="DD.MM.YYYY",
            time_format="24h",
            week_start_day="Понедельник",
            default_language="ru",
        )
        db_session.add(row)
        db_session.flush()
    return row


def _create_user_with_membership(
    db_session,
    *,
    email: str,
    tenant_id: int = 1,
) -> User:
    user = User(
        email=email,
        full_name="Demo User",
        hashed_password="hash",
        is_active=True,
        role_id=1,
        tenant_id=tenant_id,
    )
    db_session.add(user)
    db_session.flush()
    db_session.add(
        TenantUserMembership(
            tenant_id=tenant_id,
            user_id=user.id,
            role_key="user",
        )
    )
    db_session.add(
        TenantUserProfile(
            tenant_id=tenant_id,
            user_id=user.id,
            display_name="Demo Profile",
        )
    )
    db_session.flush()
    return user


def test_reset_platform_users_dry_run_does_not_mutate_data(db_session):
    owner = _create_user_with_membership(db_session, email="owner@example.com")
    db_session.add(
        PlatformUser(
            user_id=owner.id,
            platform_role="platform_owner",
            status="active",
        )
    )
    row = _seed_platform_settings(db_session)
    row.platform_owner_user_id = owner.id
    row.platform_owner_email = owner.email
    db_session.flush()

    result = reset_platform_users(db_session, dry_run=True)

    assert result.dry_run is True
    assert len(result.plan.registry_bindings_to_remove) == 1
    assert db_session.query(User).count() == 1
    assert db_session.query(PlatformUser).count() == 1
    assert db_session.query(TenantUserMembership).count() == 1
    assert db_session.query(TenantUserProfile).count() == 1
    db_session.refresh(row)
    assert row.platform_owner_user_id == owner.id


def test_reset_platform_users_without_confirm_is_blocked(db_session):
    _create_user_with_membership(db_session, email="owner@example.com")

    with pytest.raises(DestructiveOperationBlocked):
        reset_platform_users(db_session, dry_run=False, confirm=False)


def test_reset_platform_users_confirm_clears_registry_but_preserves_users(db_session, monkeypatch):
    monkeypatch.delenv("YASNOPRO_ENV", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    owner = _create_user_with_membership(db_session, email="owner@example.com")
    support = _create_user_with_membership(db_session, email="support@example.com")
    db_session.add_all(
        [
            PlatformUser(user_id=owner.id, platform_role="platform_owner", status="active"),
            PlatformUser(user_id=support.id, platform_role="platform_admin", status="active"),
        ]
    )
    row = _seed_platform_settings(db_session)
    row.platform_owner_user_id = owner.id
    row.platform_owner_full_name = owner.full_name
    row.platform_owner_email = owner.email
    db_session.flush()

    result = reset_platform_users(db_session, dry_run=False, confirm=True, commit=False)

    assert result.dry_run is False
    assert len(result.removed_registry_bindings) == 2
    assert db_session.query(User).count() == 2
    assert db_session.query(PlatformUser).count() == 0
    assert db_session.query(TenantUserMembership).count() == 2
    assert db_session.query(TenantUserProfile).count() == 2
    assert db_session.query(Role).count() == 2

    db_session.refresh(row)
    assert row.platform_owner_user_id is None
    assert row.platform_owner_full_name is None
    assert row.platform_owner_email is None
