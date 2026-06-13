import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.modules.platform_event_journal.cursor_dev_journal import record_cursor_dev_event
from app.modules.platform_event_journal.models import PlatformEventJournalEntry


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    PlatformEventJournalEntry.__table__.create(bind=engine, checkfirst=True)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_record_cursor_dev_event_writes_dev_development_journal(db_session, monkeypatch):
    monkeypatch.setattr(
        "app.modules.platform_event_journal.audit_service.resolve_dev_tenant_portal_id",
        lambda _db: 1,
    )

    created = record_cursor_dev_event(
        db_session,
        slug="cursor-dev-event-test",
        title="Test Cursor event",
        description="Helper smoke test",
        event_type="fix",
        commit=False,
    )

    assert created is not None
    assert created.title.startswith("Исправление:")
    assert "Категория:" in (created.description or "")
    assert created.journal_kind == "dev_development"
    assert created.scope == "tenant"
    assert created.tenant_id == 1
    assert created.source == "cursor"
    assert created.author == "Cursor"

    duplicate = record_cursor_dev_event(
        db_session,
        slug="cursor-dev-event-test",
        title="Duplicate",
        event_type="fix",
        commit=False,
    )
    assert duplicate is None
