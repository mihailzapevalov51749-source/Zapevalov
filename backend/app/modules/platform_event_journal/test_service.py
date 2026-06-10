import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.seed import PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES
from app.modules.platform_event_journal.service import (
    ensure_platform_event_journal_bootstrap,
    list_platform_event_journal_entries,
    record_platform_event_journal_entry,
)
from app.modules.users.models import User  # noqa: F401


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        bind=engine,
        tables=[User.__table__, PlatformEventJournalEntry.__table__],
    )
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_bootstrap_entries_are_idempotent(db_session):
    first = ensure_platform_event_journal_bootstrap(db_session)
    second = ensure_platform_event_journal_bootstrap(db_session)

    assert first == len(PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES)
    assert second == 0
    assert db_session.query(PlatformEventJournalEntry).count() == len(
        PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES,
    )


def test_record_platform_event_journal_entry_is_slug_idempotent(db_session):
    created = record_platform_event_journal_entry(
        db_session,
        title="Тестовая запись",
        description="Описание",
        slug="test-entry",
    )
    duplicate = record_platform_event_journal_entry(
        db_session,
        title="Тестовая запись",
        description="Описание",
        slug="test-entry",
    )

    assert created is not None
    assert duplicate is None
    assert db_session.query(PlatformEventJournalEntry).count() == 1


def test_list_platform_event_journal_entries_includes_bootstrap(db_session):
    items = list_platform_event_journal_entries(db_session)
    titles = {item.title for item in items}

    assert "Удалён раздел Платформа из Studio" in titles
    assert "Усовершенствован Журнал событий" in titles
    assert "Dashboard обновлялся" not in titles
