import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.auth.security import hash_password
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_profile.owner_service import upsert_platform_owner
from app.modules.control_plane.platform_profile.schemas import PlatformOwnerUpsert
from app.modules.users.bootstrap_owner_constants import (
    BOOTSTRAP_OWNER_EMAIL,
    LEGACY_BOOTSTRAP_OWNER_EMAIL,
    USER_ACCOUNT_STATUS_BOOTSTRAP,
    USER_ACCOUNT_STATUS_DISABLED,
)
from app.modules.users.bootstrap_owner_service import (
    disable_bootstrap_owner,
    ensure_bootstrap_owner,
    ensure_bootstrap_owner_recovery,
    find_bootstrap_owner,
    has_real_platform_owner,
    is_bootstrap_owner,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.portals.models import Portal
from app.modules.users.models import Role, User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            Portal.__table__,
            PlatformSettings.__table__,
            PlatformEventJournalEntry.__table__,
            Role.__table__,
            User.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    session.add(Role(id=4, name="superadmin", description="Platform Owner"))
    session.add(
        PlatformSettings(
            id=PLATFORM_SETTINGS_SINGLETON_ID,
            platform_name="ЯсноПро",
            platform_short_name="ЯсноПро",
            timezone="(UTC+03:00) Москва",
            date_format="DD.MM.YYYY",
            time_format="24h",
            week_start_day="Понедельник",
            default_language="ru",
        )
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


def test_remove_duplicate_legacy_bootstrap_when_dev_exists(db_session):
    db_session.add(
        User(
            email=LEGACY_BOOTSTRAP_OWNER_EMAIL,
            full_name="Legacy Bootstrap",
            hashed_password="hash",
            is_system_user=True,
            is_hidden_user=True,
            account_status=USER_ACCOUNT_STATUS_BOOTSTRAP,
        )
    )
    db_session.add(
        User(
            email=BOOTSTRAP_OWNER_EMAIL,
            full_name="Bootstrap Owner",
            hashed_password="hash",
            is_system_user=True,
            is_hidden_user=True,
            account_status=USER_ACCOUNT_STATUS_BOOTSTRAP,
        )
    )
    db_session.flush()

    user = ensure_bootstrap_owner(db_session, commit=False)

    assert user.email == BOOTSTRAP_OWNER_EMAIL
    assert db_session.query(User).filter(User.email.ilike(LEGACY_BOOTSTRAP_OWNER_EMAIL)).count() == 0
    assert db_session.query(User).filter(User.email.ilike(BOOTSTRAP_OWNER_EMAIL)).count() == 1


def test_migrate_legacy_bootstrap_email(db_session):
    db_session.add(
        User(
            email=LEGACY_BOOTSTRAP_OWNER_EMAIL,
            full_name="Bootstrap Owner",
            hashed_password="hash",
            is_system_user=True,
            is_hidden_user=True,
            account_status=USER_ACCOUNT_STATUS_BOOTSTRAP,
        )
    )
    db_session.flush()

    user = ensure_bootstrap_owner(db_session, commit=False)

    assert user.email == BOOTSTRAP_OWNER_EMAIL
    assert db_session.query(User).filter(User.email.ilike(LEGACY_BOOTSTRAP_OWNER_EMAIL)).count() == 0
    assert db_session.query(User).filter(User.email.ilike(BOOTSTRAP_OWNER_EMAIL)).count() == 1


def test_ensure_bootstrap_owner_creates_hidden_system_user(db_session):
    user = ensure_bootstrap_owner(db_session, commit=False)

    assert user.email == BOOTSTRAP_OWNER_EMAIL
    assert user.is_system_user is True
    assert user.is_hidden_user is True
    assert user.account_status == USER_ACCOUNT_STATUS_BOOTSTRAP
    assert user.login_disabled is False
    assert is_bootstrap_owner(user)


def test_disable_bootstrap_owner_after_real_owner_created(db_session):
    ensure_bootstrap_owner(db_session, commit=False)
    row = db_session.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)

    upsert_platform_owner(
        db_session,
        row,
        PlatformOwnerUpsert(
            full_name="Реальный владелец",
            email="owner@example.com",
            phone="+7 900 000-00-00",
            position="CEO",
            password="password123",
            password_confirm="password123",
        ),
    )

    bootstrap = find_bootstrap_owner(db_session)
    assert has_real_platform_owner(db_session) is True
    assert bootstrap.account_status == USER_ACCOUNT_STATUS_DISABLED
    assert bootstrap.login_disabled is True
    assert bootstrap.is_hidden_user is True


def test_recovery_reactivates_bootstrap_when_real_owner_removed(db_session):
    ensure_bootstrap_owner(db_session, commit=False)
    row = db_session.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)

    upsert_platform_owner(
        db_session,
        row,
        PlatformOwnerUpsert(
            full_name="Реальный владелец",
            email="owner@example.com",
            password="password123",
            password_confirm="password123",
        ),
    )

    owner = db_session.query(User).filter(User.email == "owner@example.com").one()
    db_session.delete(owner)
    row.platform_owner_user_id = None
    db_session.flush()

    ensure_bootstrap_owner_recovery(db_session)
    bootstrap = find_bootstrap_owner(db_session)

    assert has_real_platform_owner(db_session) is False
    assert bootstrap.account_status == USER_ACCOUNT_STATUS_BOOTSTRAP
    assert bootstrap.login_disabled is False
