from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.modules.platform_event_journal.audit_constants import (
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import (
    record_dev_development_event,
    record_platform_event,
    record_seed_journal_entry,
    record_tenant_event,
)
from app.modules.platform_event_journal.constants import (
    PlatformEventJournalKind,
    PlatformEventJournalScope,
    PlatformEventJournalSource,
    PlatformEventJournalStatus,
    PlatformEventJournalType,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.router import get_platform_event_journal_entries
from app.modules.platform.designer.event_journal.router import get_tenant_event_journal_entries
from app.modules.platform_event_journal.schemas import PlatformEventJournalListResponse
from app.modules.platform_event_journal.seed_classification import TENANT_STUDIO_SEED_SLUGS
from app.modules.platform_event_journal.service import (
    list_platform_scoped_journal_entries,
    list_tenant_event_journal_entries,
)
from app.modules.platform_event_journal.tenant_audit_constants import (
    TenantEventCategory,
    TenantEventCode,
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


@pytest.fixture()
def current_user():
    return SimpleNamespace(id=1, full_name="Platform Admin", username="admin")


def _seed_platform_event(db_session, *, slug: str, title: str):
    return record_platform_event(
        db_session,
        event_code=PlatformEventCode.COMPANY_CREATED.value,
        event_category=PlatformEventCategory.COMPANY.value,
        title=title,
        target_id=1,
        slug=slug,
        commit=True,
    )


def _seed_tenant_event(db_session, *, tenant_id: int, slug: str, title: str):
    return record_tenant_event(
        db_session,
        tenant_id=tenant_id,
        event_code=TenantEventCode.PAGE_DELETED.value,
        event_category=TenantEventCategory.PAGES.value,
        title=title,
        slug=slug,
        commit=True,
    )


def _seed_dev_development(db_session, *, slug: str, title: str):
    return record_dev_development_event(
        db_session,
        title=title,
        description="seed",
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
        slug=slug,
        source=PlatformEventJournalSource.SEED.value,
        commit=True,
    )


def test_platform_journal_returns_only_platform_events(db_session, current_user):
    _seed_platform_event(db_session, slug="platform-1", title="Создана компания")
    _seed_tenant_event(db_session, tenant_id=1, slug="tenant-1", title="Удалена страница")
    _seed_dev_development(db_session, slug="dev-1", title="Legacy seed")

    response = get_platform_event_journal_entries(db=db_session, current_user=current_user)

    assert isinstance(response, PlatformEventJournalListResponse)
    titles = {item.title for item in response.items}
    assert "Создана компания" in titles
    assert "Удалена страница" not in titles
    assert "Legacy seed" not in titles
    assert all(item.scope == PlatformEventJournalScope.PLATFORM.value for item in response.items)
    assert all(
        item.journal_kind == PlatformEventJournalKind.PLATFORM_AUDIT.value
        for item in response.items
    )


def test_tenant_journal_returns_only_current_tenant_events(db_session):
    _seed_tenant_event(db_session, tenant_id=1, slug="tenant-1-page", title="Tenant 1 page")
    _seed_tenant_event(db_session, tenant_id=2, slug="tenant-2-page", title="Tenant 2 page")
    _seed_platform_event(db_session, slug="platform-1", title="Platform event")

    response = get_tenant_event_journal_entries(tenant_id=1, db=db_session)

    titles = {item.title for item in response.items}
    assert titles == {"Tenant 1 page"}
    assert all(item.scope == PlatformEventJournalScope.TENANT.value for item in response.items)
    assert all(item.tenant_id == 1 for item in response.items)


def test_tenant_journal_does_not_return_other_tenant_events(db_session):
    _seed_tenant_event(db_session, tenant_id=1, slug="tenant-1", title="Only tenant 1")

    items = list_tenant_event_journal_entries(db_session, 2)

    assert items == []


def test_platform_journal_does_not_return_tenant_events(db_session):
    _seed_tenant_event(db_session, tenant_id=5, slug="tenant-5", title="Tenant only")

    items = list_platform_scoped_journal_entries(db_session)

    assert items == []


def test_dev_development_not_returned_in_platform_journal(db_session):
    _seed_dev_development(db_session, slug="legacy-seed", title="Bootstrap seed")

    assert list_platform_scoped_journal_entries(db_session) == []
    dev_items = list_tenant_event_journal_entries(db_session, 1)
    assert len(dev_items) == 1
    assert dev_items[0].journal_kind == PlatformEventJournalKind.DEV_DEVELOPMENT.value


def test_studio_seed_classified_into_dev_development_journal(db_session):
    record_seed_journal_entry(
        db_session,
        title="Создан журнал событий",
        description="Studio seed",
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
        author="Cursor",
        slug="event-journal-created",
        scope=PlatformEventJournalScope.TENANT.value,
        journal_kind=PlatformEventJournalKind.DEV_DEVELOPMENT.value,
        tenant_id=1,
        source=PlatformEventJournalSource.SEED.value,
        commit=True,
    )

    tenant_items = list_tenant_event_journal_entries(db_session, 1)
    platform_items = list_platform_scoped_journal_entries(db_session)

    assert len(tenant_items) == 1
    assert tenant_items[0].slug == "event-journal-created"
    assert tenant_items[0].slug in TENANT_STUDIO_SEED_SLUGS
    assert tenant_items[0].journal_kind == PlatformEventJournalKind.DEV_DEVELOPMENT.value
    assert platform_items == []


def test_empty_tenant_journal_returns_200(db_session):
    response = get_tenant_event_journal_entries(tenant_id=99, db=db_session)

    assert isinstance(response, PlatformEventJournalListResponse)
    assert response.items == []
