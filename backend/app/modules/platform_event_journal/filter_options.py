"""Filter option catalogs for platform vs tenant event journals."""

from __future__ import annotations

from app.modules.platform_event_journal.audit_constants import (
    PLATFORM_EVENT_CATEGORY_LABELS,
    PLATFORM_EVENT_CODE_LABELS,
    PlatformEventCode,
)
from app.modules.platform_event_journal.schemas import EventJournalFilterOption
from app.modules.platform_event_journal.tenant_audit_constants import (
    TENANT_EVENT_CATEGORY_LABELS,
    TENANT_EVENT_CODE_LABELS,
    TENANT_LEGACY_JOURNAL_TYPE_LABELS,
    TenantEventCode,
)
from app.modules.tenant_environment.constants import TenantType


def _sorted_options(labels: dict[str, str], *, exclude: frozenset[str] | None = None) -> list[EventJournalFilterOption]:
    excluded = exclude or frozenset()
    items = [
        EventJournalFilterOption(value=value, label=label)
        for value, label in labels.items()
        if value not in excluded
    ]
    return sorted(items, key=lambda item: item.label.casefold())


def get_platform_event_journal_filter_options() -> tuple[list[EventJournalFilterOption], list[EventJournalFilterOption]]:
    """Platform audit journal — platform categories and audit event codes only."""
    categories = _sorted_options(PLATFORM_EVENT_CATEGORY_LABELS)
    event_types = _sorted_options(
        PLATFORM_EVENT_CODE_LABELS,
        exclude=frozenset({PlatformEventCode.LEGACY.value}),
    )
    return categories, event_types


def get_tenant_configuration_filter_options() -> tuple[list[EventJournalFilterOption], list[EventJournalFilterOption]]:
    """Template / client / demo tenant configuration journal."""
    categories = _sorted_options(TENANT_EVENT_CATEGORY_LABELS)
    event_types = _sorted_options(
        TENANT_EVENT_CODE_LABELS,
        exclude=frozenset({TenantEventCode.LEGACY.value}),
    )
    return categories, event_types


def get_dev_event_journal_filter_options() -> tuple[list[EventJournalFilterOption], list[EventJournalFilterOption]]:
    """DEV tenant — development + configuration streams."""
    categories = _sorted_options(TENANT_EVENT_CATEGORY_LABELS)
    type_labels = {
        **TENANT_EVENT_CODE_LABELS,
        **TENANT_LEGACY_JOURNAL_TYPE_LABELS,
    }
    event_types = _sorted_options(type_labels, exclude=frozenset({TenantEventCode.LEGACY.value}))
    return categories, event_types


def get_tenant_event_journal_filter_options(
    *,
    tenant_type: str | None = None,
) -> tuple[list[EventJournalFilterOption], list[EventJournalFilterOption]]:
    normalized_type = str(tenant_type or "").strip().upper()
    if normalized_type == TenantType.DEV.value:
        return get_dev_event_journal_filter_options()
    return get_tenant_configuration_filter_options()
