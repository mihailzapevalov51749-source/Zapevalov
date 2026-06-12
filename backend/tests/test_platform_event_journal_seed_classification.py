"""Tests for journal seed slug classification."""

from app.modules.platform_event_journal.constants import (
    PlatformEventJournalKind,
    PlatformEventJournalType,
)
from app.modules.platform_event_journal.seed import PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES
from app.modules.platform_event_journal.seed_classification import (
    TENANT_STUDIO_SEED_SLUGS,
    classify_seed_slug,
)


def test_classify_studio_seed_as_dev_development():
    scope, journal_kind, tenant_id = classify_seed_slug(
        "event-journal-created",
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        dev_tenant_id=1,
    )
    assert scope == "tenant"
    assert journal_kind == PlatformEventJournalKind.DEV_DEVELOPMENT.value
    assert tenant_id == 1


def test_classify_development_seed_as_dev_development():
    scope, journal_kind, tenant_id = classify_seed_slug(
        "platform-users-page-redesigned",
        event_type=PlatformEventJournalType.ARCHITECTURE.value,
        dev_tenant_id=1,
    )
    assert scope == "tenant"
    assert journal_kind == PlatformEventJournalKind.DEV_DEVELOPMENT.value
    assert tenant_id == 1


def test_classify_company_seed_as_platform_audit():
    scope, journal_kind, tenant_id = classify_seed_slug(
        "company-created-with-first-admin",
        event_type=PlatformEventJournalType.COMPANY_CREATION.value,
        dev_tenant_id=1,
    )
    assert scope == "platform"
    assert journal_kind == PlatformEventJournalKind.PLATFORM_AUDIT.value
    assert tenant_id is None


def test_all_bootstrap_slugs_are_classified():
    for entry in PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES:
        scope, journal_kind, tenant_id = classify_seed_slug(
            entry.slug,
            event_type=entry.event_type,
            dev_tenant_id=1,
        )
        if entry.slug in TENANT_STUDIO_SEED_SLUGS or entry.event_type in {
            "architecture",
            "fix",
            "development",
            "ux_improvement",
            "refactoring",
        }:
            if entry.slug == "company-created-with-first-admin":
                assert journal_kind == PlatformEventJournalKind.PLATFORM_AUDIT.value
                continue
            assert scope == "tenant"
            assert journal_kind == PlatformEventJournalKind.DEV_DEVELOPMENT.value
            assert tenant_id == 1
        elif entry.event_type in {"company_creation", "provisioning"}:
            assert scope == "platform"
            assert journal_kind == PlatformEventJournalKind.PLATFORM_AUDIT.value
            assert tenant_id is None
