"""Classify existing journal rows into journal_kind during backfill."""

from __future__ import annotations

from app.modules.platform_event_journal.audit_constants import (
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import (
    DEVELOPMENT_LEGACY_EVENT_TYPES,
    PLATFORM_AUDIT_LEGACY_EVENT_TYPES,
    PlatformEventJournalKind,
    PlatformEventJournalScope,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.seed_classification import (
    PLATFORM_AUDIT_SEED_SLUGS,
    TENANT_STUDIO_SEED_SLUGS,
    is_development_legacy_type,
)


def _legacy_event_type(entry: PlatformEventJournalEntry) -> str | None:
    metadata = entry.metadata_json or {}
    legacy_type = metadata.get("legacy_event_type")
    if legacy_type:
        return str(legacy_type).strip().lower()
    return None


def _is_audit_event_code(event_type: str) -> bool:
    normalized = str(event_type or "").strip().lower()
    return normalized != PlatformEventCode.LEGACY.value and normalized in {
        item.value for item in PlatformEventCode if item != PlatformEventCode.LEGACY
    }


def classify_existing_entry(
    entry: PlatformEventJournalEntry,
    *,
    dev_tenant_id: int,
) -> tuple[str, str, int | None]:
    """
    Return (scope, journal_kind, tenant_id) for an existing journal row.
    """
    slug = str(entry.slug or "").strip()
    legacy_type = _legacy_event_type(entry)
    event_type = str(entry.event_type or "").strip().lower()

    if slug in PLATFORM_AUDIT_SEED_SLUGS:
        return _platform_audit()

    if _is_audit_event_code(event_type):
        return _platform_audit()

    if legacy_type in PLATFORM_AUDIT_LEGACY_EVENT_TYPES:
        return _platform_audit()

    if (
        slug in TENANT_STUDIO_SEED_SLUGS
        or legacy_type in DEVELOPMENT_LEGACY_EVENT_TYPES
        or is_development_legacy_type(legacy_type or event_type)
    ):
        return (
            PlatformEventJournalScope.TENANT.value,
            PlatformEventJournalKind.DEV_DEVELOPMENT.value,
            dev_tenant_id,
        )

    if entry.scope == PlatformEventJournalScope.TENANT.value:
        return (
            PlatformEventJournalScope.TENANT.value,
            PlatformEventJournalKind.TENANT_CONFIGURATION.value,
            entry.tenant_id,
        )

    return _platform_audit()


def _platform_audit() -> tuple[str, str, int | None]:
    return (
        PlatformEventJournalScope.PLATFORM.value,
        PlatformEventJournalKind.PLATFORM_AUDIT.value,
        None,
    )


def recode_platform_settings_entry(entry: PlatformEventJournalEntry) -> None:
    """Recode legacy settings_change rows into platform audit codes."""
    legacy_type = _legacy_event_type(entry)
    if legacy_type != "settings_change":
        return
    if entry.event_type == PlatformEventCode.PLATFORM_SETTINGS_UPDATED.value:
        return

    entry.event_type = PlatformEventCode.PLATFORM_SETTINGS_UPDATED.value
    entry.event_category = PlatformEventCategory.PLATFORM_SETTINGS.value
    metadata = dict(entry.metadata_json or {})
    metadata["legacy_event_type"] = "settings_change"
    entry.metadata_json = metadata
