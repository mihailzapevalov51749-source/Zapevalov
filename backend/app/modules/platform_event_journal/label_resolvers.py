"""Scope-aware label resolution for platform vs tenant journal entries."""

from __future__ import annotations

from app.modules.platform_event_journal.audit_constants import (
    PLATFORM_AUDIT_STATUS_LABELS,
    PLATFORM_EVENT_CATEGORY_LABELS,
    PLATFORM_EVENT_CODE_LABELS,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import (
    PLATFORM_EVENT_JOURNAL_STATUS_LABELS,
    PLATFORM_EVENT_JOURNAL_TYPE_LABELS,
    PlatformEventJournalScope,
)
from app.modules.platform_event_journal.tenant_audit_constants import (
    TENANT_EVENT_CATEGORY_LABELS,
    TENANT_EVENT_CODE_LABELS,
    TENANT_LEGACY_JOURNAL_TYPE_LABELS,
    TenantEventCode,
)


def _normalized_scope(scope: str | None) -> str:
    return str(scope or PlatformEventJournalScope.PLATFORM.value).strip().lower()


def resolve_event_category_label(category: str | None, *, scope: str | None = None) -> str:
    normalized_category = str(category or "").strip().lower()
    if not normalized_category:
        normalized_category = "system"

    if _normalized_scope(scope) == PlatformEventJournalScope.TENANT.value:
        return TENANT_EVENT_CATEGORY_LABELS.get(normalized_category, normalized_category)

    return PLATFORM_EVENT_CATEGORY_LABELS.get(normalized_category, normalized_category)


def resolve_event_type_label(
    event_type: str | None,
    metadata: dict | None = None,
    *,
    scope: str | None = None,
) -> str:
    normalized = str(event_type or "").strip().lower()
    if not normalized:
        return "—"

    is_tenant = _normalized_scope(scope) == PlatformEventJournalScope.TENANT.value
    legacy_code = PlatformEventCode.LEGACY.value if not is_tenant else TenantEventCode.LEGACY.value

    if normalized == legacy_code:
        legacy_type = str((metadata or {}).get("legacy_event_type") or "").strip().lower()
        if legacy_type:
            if is_tenant:
                return TENANT_LEGACY_JOURNAL_TYPE_LABELS.get(legacy_type, legacy_type)
            return PLATFORM_EVENT_JOURNAL_TYPE_LABELS.get(legacy_type, legacy_type)
        return "legacy"

    if is_tenant:
        return (
            TENANT_EVENT_CODE_LABELS.get(normalized)
            or TENANT_LEGACY_JOURNAL_TYPE_LABELS.get(normalized)
            or normalized
        )

    return (
        PLATFORM_EVENT_CODE_LABELS.get(normalized)
        or PLATFORM_EVENT_JOURNAL_TYPE_LABELS.get(normalized)
        or normalized
    )


def resolve_status_label(status: str | None) -> str:
    normalized = str(status or "").strip().lower()
    if not normalized:
        return PLATFORM_AUDIT_STATUS_LABELS.get("done", "Готово")
    return (
        PLATFORM_AUDIT_STATUS_LABELS.get(normalized)
        or PLATFORM_EVENT_JOURNAL_STATUS_LABELS.get(normalized)
        or status
    )
