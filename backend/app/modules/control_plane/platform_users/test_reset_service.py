import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_users.reset_service import (
    PLATFORM_USERS_RESET_JOURNAL_SLUG,
    reset_platform_users,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.users.models import Role, User


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            PlatformSettings.__table__,
            PlatformEventJournalEntry.__table__,
            User.__table__,
            Role.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
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


def test_reset_platform_users_clears_owner_and_users_but_keeps_roles(db_session):
    db_session.add(Role(id=4, name="superadmin", description="Platform Owner"))
    db_session.add(Role(id=1, name="admin", description="Administrator"))
    db_session.flush()

    owner = User(
        email="owner@example.com",
        full_name="Platform Owner",
        hashed_password="hash",
        is_active=True,
        role_id=4,
    )
    support = User(
        email="support@example.com",
        full_name="Support User",
        hashed_password="hash",
        is_active=True,
        role_id=1,
    )
    db_session.add_all([owner, support])
    db_session.flush()

    row = _seed_platform_settings(db_session)
    row.platform_owner_user_id = owner.id
    row.platform_owner_full_name = owner.full_name
    row.platform_owner_email = owner.email
    row.platform_owner_phone = "+7 900 000-00-00"
    db_session.flush()

    result = reset_platform_users(db_session, commit=False)

    assert len(result.deleted_users) == 2
    assert db_session.query(User).count() == 1
    assert db_session.query(Role).count() == 2

    db_session.refresh(row)
    assert row.platform_owner_user_id is None
    assert row.platform_owner_full_name is None
    assert row.platform_owner_email is None
    assert row.platform_owner_phone is None

    journal = (
        db_session.query(PlatformEventJournalEntry)
        .filter_by(slug=PLATFORM_USERS_RESET_JOURNAL_SLUG)
        .one()
    )
    assert journal.title == "Выполнен сброс платформенных пользователей"
