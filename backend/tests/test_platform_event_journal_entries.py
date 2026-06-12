from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.modules.platform_event_journal.audit_constants import (
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import record_platform_event
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.router import get_platform_event_journal_entries
from app.modules.platform_event_journal.schemas import PlatformEventJournalListResponse
from app.modules.platform_event_journal.service import list_platform_scoped_journal_entries


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    PlatformEventJournalEntry.__table__.create(bind=engine, checkfirst=True)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def current_user():
    return SimpleNamespace(id=1, full_name="Platform Admin", username="admin")


def test_platform_event_journal_entries_empty_returns_200(db_session, current_user):
    response = get_platform_event_journal_entries(db=db_session, current_user=current_user)

    assert isinstance(response, PlatformEventJournalListResponse)
    assert response.items == []


def test_platform_event_journal_entries_returns_items(db_session, current_user):
    record_platform_event(
        db_session,
        event_code=PlatformEventCode.COMPANY_CREATED.value,
        event_category=PlatformEventCategory.COMPANY.value,
        title="Создана компания",
        description="Tenant 42",
        actor_name="Platform Admin",
        actor_email="admin@example.com",
        target_type="company",
        target_id=42,
        target_name="ООО Тест",
        tenant_id=42,
        company_id=7,
        slug="test-company-created-42",
        commit=True,
    )

    response = get_platform_event_journal_entries(db=db_session, current_user=current_user)
    titles = {item.title for item in response.items}

    assert "Создана компания" in titles
    assert response.items[0].scope == "platform"


def test_platform_event_journal_does_not_fail_without_actor(db_session):
    created = record_platform_event(
        db_session,
        event_code=PlatformEventCode.PLATFORM_SETTINGS_UPDATED.value,
        event_category=PlatformEventCategory.PLATFORM_SETTINGS.value,
        title="Настройки обновлены",
        slug="test-settings-without-actor",
        commit=True,
    )

    items = list_platform_scoped_journal_entries(db_session)
    matched = [item for item in items if item.slug == created.slug]

    assert len(matched) == 1
    assert matched[0].author is None
    assert matched[0].actor_email is None
    assert matched[0].author_user_id is None


def test_platform_event_journal_does_not_fail_without_tenant(db_session):
    created = record_platform_event(
        db_session,
        event_code=PlatformEventCode.PLATFORM_OWNER_CREATED.value,
        event_category=PlatformEventCategory.PLATFORM_OWNER.value,
        title="Создан владелец платформы",
        slug="test-platform-owner",
        commit=True,
    )

    items = list_platform_scoped_journal_entries(db_session)
    matched = [item for item in items if item.slug == created.slug]

    assert len(matched) == 1
    assert matched[0].tenant_id is None
    assert matched[0].company_id is None
