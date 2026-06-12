import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.modules.platform_event_journal.constants import (
    PlatformEventJournalKind,
    PlatformEventJournalScope,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.seed import PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES
from app.modules.platform_event_journal.seed_classification import classify_seed_slug
from app.modules.platform_event_journal.service import (
    ensure_platform_event_journal_bootstrap,
    list_platform_event_journal_entries,
    list_tenant_event_journal_entries,
    record_platform_event_journal_entry,
)

@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    PlatformEventJournalEntry.__table__.create(bind=engine, checkfirst=True)
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


def test_list_platform_event_journal_entries_excludes_studio_bootstrap(db_session):
    ensure_platform_event_journal_bootstrap(db_session)
    db_session.commit()

    platform_items = list_platform_event_journal_entries(db_session)
    tenant_items = list_tenant_event_journal_entries(db_session, 1)
    platform_titles = {item.title for item in platform_items}
    tenant_slugs = {item.slug for item in tenant_items}

    expected_dev = sum(
        1
        for entry in PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES
        if classify_seed_slug(
            entry.slug,
            event_type=entry.event_type,
            dev_tenant_id=1,
        )[1]
        == PlatformEventJournalKind.DEV_DEVELOPMENT.value
    )
    expected_platform = sum(
        1
        for entry in PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES
        if classify_seed_slug(
            entry.slug,
            event_type=entry.event_type,
            dev_tenant_id=1,
        )[1]
        == PlatformEventJournalKind.PLATFORM_AUDIT.value
    )

    assert "Удалён раздел Платформа из Studio" not in platform_titles
    assert "event-journal-created" in tenant_slugs
    assert len(tenant_slugs) == expected_dev
    assert len(platform_items) == expected_platform
    assert all(item.scope == PlatformEventJournalScope.TENANT.value for item in tenant_items)
    assert db_session.query(PlatformEventJournalEntry).count() == len(
        PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES,
    )
