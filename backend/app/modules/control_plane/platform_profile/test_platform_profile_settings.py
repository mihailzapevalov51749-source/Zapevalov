import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_profile.schemas import PlatformSettingsGeneralUpdate
from app.modules.control_plane.platform_profile.service import (
    get_platform_settings,
    update_platform_settings_general,
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


def test_platform_settings_general_update_requires_name():
    with pytest.raises(ValidationError):
        PlatformSettingsGeneralUpdate(
            platform_name="",
            platform_short_name="Ясно",
            timezone="(UTC+03:00) Москва",
            date_format="DD.MM.YYYY",
            time_format="24 часа (14:30)",
            week_start_day="Понедельник",
            default_language="Русский",
        )


def test_get_platform_settings_creates_singleton(db_session):
    result = get_platform_settings(db_session)
    db_session.commit()

    assert result.general.platform_name == "ЯсноПро"
    assert result.general.date_format == "DD.MM.YYYY"


def test_update_platform_settings_general_persists_and_writes_journal(db_session):
    payload = PlatformSettingsGeneralUpdate(
        platform_name="ЯсноПро 2",
        platform_short_name="ЯП",
        description="Описание платформы",
        timezone="(UTC+03:00) Москва",
        date_format="YYYY-MM-DD",
        time_format="12 часов (02:30 PM)",
        week_start_day="Понедельник",
        default_language="Русский",
    )

    updated = update_platform_settings_general(db_session, payload)
    db_session.commit()

    assert updated.general.platform_name == "ЯсноПро 2"
    assert updated.general.time_format == "12 часов (02:30 PM)"

    reloaded = get_platform_settings(db_session)
    assert reloaded.general.platform_short_name == "ЯП"

    journal_entry = (
        db_session.query(PlatformEventJournalEntry)
        .filter(PlatformEventJournalEntry.title == "Изменены общие настройки платформы")
        .order_by(PlatformEventJournalEntry.id.desc())
        .first()
    )
    assert journal_entry is not None
    assert journal_entry.event_type == "platform_settings_updated"
    assert journal_entry.event_category == "platform_settings"
