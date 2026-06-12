"""Tests for journal_kind architecture (platform_audit / dev_development / tenant_configuration)."""

from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, func
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
    DEVELOPMENT_LEGACY_EVENT_TYPES,
    PlatformEventJournalKind,
    PlatformEventJournalScope,
    PlatformEventJournalSource,
    PlatformEventJournalStatus,
    PlatformEventJournalType,
)
from app.modules.platform_event_journal.filter_options import (
    get_dev_event_journal_filter_options,
    get_platform_event_journal_filter_options,
    get_tenant_configuration_filter_options,
    get_tenant_event_journal_filter_options,
)
from app.modules.platform_event_journal.journal_kind_classification import (
    classify_existing_entry,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.router import get_platform_event_journal_entries
from app.modules.platform.designer.event_journal.router import get_tenant_event_journal_entries
from app.modules.platform_event_journal.schemas import PlatformEventJournalListResponse
from app.modules.platform_event_journal.seed_classification import classify_seed_slug
from app.modules.platform_event_journal.service import (
    list_platform_scoped_journal_entries,
    list_tenant_event_journal_entries,
)
from app.modules.platform_event_journal.tenant_audit_constants import (
    TenantEventCategory,
    TenantEventCode,
)
from app.modules.tenant_environment.constants import TenantType


DEV_TENANT_ID = 1
TEMPLATE_TENANT_ID = 2
CLIENT_TENANT_ID = 5


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


def _seed_platform_audit(db_session, *, slug: str, title: str):
    return record_platform_event(
        db_session,
        event_code=PlatformEventCode.COMPANY_CREATED.value,
        event_category=PlatformEventCategory.COMPANY.value,
        title=title,
        target_type="company",
        target_id=CLIENT_TENANT_ID,
        tenant_id=CLIENT_TENANT_ID,
        slug=slug,
        commit=True,
    )


def _seed_dev_development(db_session, *, slug: str, title: str, tenant_id: int = DEV_TENANT_ID):
    return record_dev_development_event(
        db_session,
        title=title,
        description="development",
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        status=PlatformEventJournalStatus.DONE.value,
        slug=slug,
        source=PlatformEventJournalSource.SEED.value,
        commit=True,
    )


def _seed_tenant_configuration(db_session, *, tenant_id: int, slug: str, title: str):
    return record_tenant_event(
        db_session,
        tenant_id=tenant_id,
        event_code=TenantEventCode.PAGE_CREATED.value,
        event_category=TenantEventCategory.PAGES.value,
        title=title,
        slug=slug,
        commit=True,
    )


def test_platform_journal_contains_only_platform_audit(db_session, current_user):
    _seed_platform_audit(db_session, slug="audit-company", title="Создана компания")
    _seed_dev_development(db_session, slug="dev-arch", title="Архитектурное решение")
    _seed_tenant_configuration(
        db_session,
        tenant_id=DEV_TENANT_ID,
        slug="dev-page",
        title="Создана страница",
    )

    response = get_platform_event_journal_entries(db=db_session, current_user=current_user)

    assert len(response.items) == 1
    item = response.items[0]
    assert item.title == "Создана компания"
    assert item.journal_kind == PlatformEventJournalKind.PLATFORM_AUDIT.value
    assert item.scope == PlatformEventJournalScope.PLATFORM.value
    assert item.tenant_id is None


def test_dev_journal_contains_development_and_configuration(db_session):
    _seed_dev_development(db_session, slug="dev-1", title="Разработка")
    _seed_tenant_configuration(
        db_session,
        tenant_id=DEV_TENANT_ID,
        slug="dev-config-1",
        title="Настройка DEV",
    )
    _seed_platform_audit(db_session, slug="platform-only", title="Platform audit")

    items = list_tenant_event_journal_entries(db_session, DEV_TENANT_ID)

    titles = {item.title for item in items}
    assert titles == {"Разработка", "Настройка DEV"}
    assert all(item.tenant_id == DEV_TENANT_ID for item in items)


def test_template_journal_contains_only_configuration(db_session):
    _seed_tenant_configuration(
        db_session,
        tenant_id=TEMPLATE_TENANT_ID,
        slug="template-page",
        title="Template page",
    )
    _seed_dev_development(db_session, slug="dev-only", title="DEV development")

    items = list_tenant_event_journal_entries(db_session, TEMPLATE_TENANT_ID)

    assert len(items) == 1
    assert items[0].title == "Template page"
    assert items[0].journal_kind == PlatformEventJournalKind.TENANT_CONFIGURATION.value


def test_client_journal_contains_only_configuration(db_session):
    _seed_tenant_configuration(
        db_session,
        tenant_id=CLIENT_TENANT_ID,
        slug="client-page",
        title="Client page",
    )
    _seed_tenant_configuration(
        db_session,
        tenant_id=TEMPLATE_TENANT_ID,
        slug="template-page",
        title="Template page",
    )

    items = list_tenant_event_journal_entries(db_session, CLIENT_TENANT_ID)

    assert len(items) == 1
    assert items[0].title == "Client page"


def test_client_journal_does_not_inherit_template_history(db_session):
    _seed_tenant_configuration(
        db_session,
        tenant_id=TEMPLATE_TENANT_ID,
        slug="template-history",
        title="Template history",
    )
    _seed_tenant_configuration(
        db_session,
        tenant_id=CLIENT_TENANT_ID,
        slug="client-own",
        title="Client own event",
    )

    client_items = list_tenant_event_journal_entries(db_session, CLIENT_TENANT_ID)
    template_items = list_tenant_event_journal_entries(db_session, TEMPLATE_TENANT_ID)

    assert {item.title for item in client_items} == {"Client own event"}
    assert {item.title for item in template_items} == {"Template history"}


def test_development_events_are_not_returned_in_platform_journal(db_session):
    for index, legacy_type in enumerate(sorted(DEVELOPMENT_LEGACY_EVENT_TYPES)):
        record_dev_development_event(
            db_session,
            title=f"Event {legacy_type}",
            event_type=legacy_type,
            status=PlatformEventJournalStatus.DONE.value,
            slug=f"dev-{legacy_type}-{index}",
            commit=True,
        )

    platform_items = list_platform_scoped_journal_entries(db_session)
    assert platform_items == []


def test_journal_backfill_preserves_total_count(db_session):
    entries = [
        ("platform-users-page-redesigned", PlatformEventJournalType.ARCHITECTURE.value, "platform", None),
        ("company-created-with-first-admin", PlatformEventJournalType.COMPANY_CREATION.value, "platform", None),
        ("event-journal-created", PlatformEventJournalType.ARCHITECTURE.value, "tenant", DEV_TENANT_ID),
    ]

    for slug, event_type, scope, tenant_id in entries:
        record_seed_journal_entry(
            db_session,
            title=slug,
            description="seed",
            event_type=event_type,
            status=PlatformEventJournalStatus.DONE.value,
            author="Cursor",
            slug=slug,
            scope=scope,
            journal_kind=PlatformEventJournalKind.PLATFORM_AUDIT.value,
            tenant_id=tenant_id,
            source=PlatformEventJournalSource.SEED.value,
            commit=True,
        )

    before_count = db_session.query(func.count(PlatformEventJournalEntry.id)).scalar()

    for entry in db_session.query(PlatformEventJournalEntry).all():
        scope, journal_kind, tenant_id = classify_existing_entry(entry, dev_tenant_id=DEV_TENANT_ID)
        entry.scope = scope
        entry.journal_kind = journal_kind
        entry.tenant_id = tenant_id
    db_session.commit()

    after_count = db_session.query(func.count(PlatformEventJournalEntry.id)).scalar()
    assert before_count == after_count == 3

    platform_items = list_platform_scoped_journal_entries(db_session)
    assert len(platform_items) == 1
    assert platform_items[0].slug == "company-created-with-first-admin"

    dev_items = list_tenant_event_journal_entries(db_session, DEV_TENANT_ID)
    assert len(dev_items) == 2


def test_classify_development_seed_as_dev_development():
    scope, journal_kind, tenant_id = classify_seed_slug(
        "platform-users-page-redesigned",
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        dev_tenant_id=DEV_TENANT_ID,
    )
    assert scope == PlatformEventJournalScope.TENANT.value
    assert journal_kind == PlatformEventJournalKind.DEV_DEVELOPMENT.value
    assert tenant_id == DEV_TENANT_ID


def test_classify_company_seed_as_platform_audit():
    scope, journal_kind, tenant_id = classify_seed_slug(
        "company-created-with-first-admin",
        event_type=PlatformEventJournalType.COMPANY_CREATION.value,
        dev_tenant_id=DEV_TENANT_ID,
    )
    assert scope == PlatformEventJournalScope.PLATFORM.value
    assert journal_kind == PlatformEventJournalKind.PLATFORM_AUDIT.value
    assert tenant_id is None


def test_platform_filter_options_exclude_development_types():
    _, event_types = get_platform_event_journal_filter_options()
    type_values = {item.value for item in event_types}
    assert "architecture" not in type_values
    assert "fix" not in type_values
    assert "company_created" in type_values


def test_dev_filter_options_include_development_and_configuration():
    _, event_types = get_dev_event_journal_filter_options()
    type_values = {item.value for item in event_types}
    assert "architecture" in type_values
    assert "page_created" in type_values


def test_template_filter_options_exclude_development_types():
    _, event_types = get_tenant_configuration_filter_options()
    type_values = {item.value for item in event_types}
    assert "architecture" not in type_values
    assert "page_created" in type_values


def test_tenant_filter_options_respect_tenant_type():
    dev_categories, dev_types = get_tenant_event_journal_filter_options(
        tenant_type=TenantType.DEV.value,
    )
    template_categories, template_types = get_tenant_event_journal_filter_options(
        tenant_type=TenantType.TEMPLATE.value,
    )

    assert {item.value for item in dev_types} >= {"architecture", "page_created"}
    assert "architecture" not in {item.value for item in template_types}
    assert "page_created" in {item.value for item in template_types}
    assert len(dev_categories) >= len(template_categories)


def test_tenant_journal_route_filters_by_tenant(db_session):
    _seed_tenant_configuration(
        db_session,
        tenant_id=CLIENT_TENANT_ID,
        slug="client-route",
        title="Client route event",
    )

    response = get_tenant_event_journal_entries(tenant_id=CLIENT_TENANT_ID, db=db_session)

    assert isinstance(response, PlatformEventJournalListResponse)
    assert len(response.items) == 1
    assert response.items[0].title == "Client route event"
