"""Unified service for Platform Event Journal — single entry point for all journal writes."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_service import (
    get_journal_entry_by_slug,
    record_legacy_platform_event_journal_entry,
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
from app.modules.platform_event_journal.schemas import (
    PlatformEventJournalEntryCreate,
    PlatformEventJournalEntryRead,
)
from app.modules.platform_event_journal.seed import PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES
from app.modules.platform_event_journal.seed_classification import (
    classify_seed_slug,
    resolve_dev_tenant_portal_id,
    resolve_tenant_type,
)
from app.modules.tenant_environment.constants import TenantType

__all__ = [
    "create_platform_event_journal_entry",
    "ensure_platform_event_journal_bootstrap",
    "get_journal_entry_by_slug",
    "list_platform_event_journal_entries",
    "list_platform_scoped_journal_entries",
    "list_tenant_event_journal_entries",
    "record_platform_event",
    "record_platform_event_journal_entry",
    "record_tenant_event",
]


def _serialize_entry(entry: PlatformEventJournalEntry) -> PlatformEventJournalEntryRead:
    return PlatformEventJournalEntryRead.model_validate(entry)


def _journal_order(query):
    return query.order_by(
        PlatformEventJournalEntry.occurred_at.desc(),
        PlatformEventJournalEntry.id.desc(),
    )


def record_platform_event_journal_entry(
    db: Session,
    *,
    title: str,
    description: str | None = None,
    event_type: str = PlatformEventJournalType.ARCHITECTURE.value,
    status: str = PlatformEventJournalStatus.DONE.value,
    author: str | None = "Cursor",
    slug: str | None = None,
    source: str = PlatformEventJournalSource.CURSOR.value,
    author_user_id: int | None = None,
    occurred_at: datetime | None = None,
    commit: bool = False,
) -> PlatformEventJournalEntryRead | None:
    """
    Legacy journal writer — delegates to DEV development journal.

    Prefer record_platform_event() for new platform audit events.
    """
    return record_legacy_platform_event_journal_entry(
        db,
        title=title,
        description=description,
        event_type=event_type,
        status=status,
        author=author,
        slug=slug,
        source=source,
        author_user_id=author_user_id,
        occurred_at=occurred_at,
        commit=commit,
    )


def create_platform_event_journal_entry(
    db: Session,
    payload: PlatformEventJournalEntryCreate,
    *,
    author_user_id: int | None = None,
    commit: bool = False,
) -> PlatformEventJournalEntryRead | None:
    return record_platform_event_journal_entry(
        db,
        title=payload.title,
        description=payload.description,
        event_type=payload.event_type,
        status=payload.status,
        author=payload.author,
        slug=payload.slug,
        source=payload.source,
        author_user_id=author_user_id,
        occurred_at=payload.occurred_at,
        commit=commit,
    )


def ensure_platform_event_journal_bootstrap(db: Session) -> int:
    """Idempotently insert required bootstrap entries. Returns number of new rows."""
    dev_tenant_id = resolve_dev_tenant_portal_id(db)
    created_count = 0

    for seed_entry in PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES:
        if get_journal_entry_by_slug(db, seed_entry.slug) is not None:
            continue

        scope, journal_kind, tenant_id = classify_seed_slug(
            seed_entry.slug,
            event_type=seed_entry.event_type,
            dev_tenant_id=dev_tenant_id,
        )
        created = record_seed_journal_entry(
            db,
            title=seed_entry.title,
            description=seed_entry.description,
            event_type=seed_entry.event_type,
            status=seed_entry.status,
            author=seed_entry.author,
            slug=seed_entry.slug,
            scope=scope,
            journal_kind=journal_kind,
            tenant_id=tenant_id,
            source=PlatformEventJournalSource.SEED.value,
        )
        if created is not None:
            created_count += 1

    return created_count


def list_platform_scoped_journal_entries(
    db: Session,
) -> list[PlatformEventJournalEntryRead]:
    """Control Plane journal — platform audit events only."""
    query = db.query(PlatformEventJournalEntry).filter(
        PlatformEventJournalEntry.journal_kind
        == PlatformEventJournalKind.PLATFORM_AUDIT.value,
        PlatformEventJournalEntry.scope == PlatformEventJournalScope.PLATFORM.value,
        PlatformEventJournalEntry.tenant_id.is_(None),
    )

    entries = _journal_order(query).all()
    return [_serialize_entry(entry) for entry in entries]


def list_tenant_event_journal_entries(
    db: Session,
    tenant_id: int,
    *,
    event_family: str | None = None,
) -> list[PlatformEventJournalEntryRead]:
    """Studio journal — tenant events for a single tenant, filtered by journal_kind."""
    normalized_tenant_id = int(tenant_id)
    tenant_type = resolve_tenant_type(db, normalized_tenant_id)

    query = db.query(PlatformEventJournalEntry).filter(
        PlatformEventJournalEntry.scope == PlatformEventJournalScope.TENANT.value,
        PlatformEventJournalEntry.tenant_id == normalized_tenant_id,
    )

    normalized_family = str(event_family or "all").strip().lower()
    if tenant_type == TenantType.DEV.value:
        if normalized_family == "development":
            query = query.filter(
                PlatformEventJournalEntry.journal_kind
                == PlatformEventJournalKind.DEV_DEVELOPMENT.value
            )
        elif normalized_family == "configuration":
            query = query.filter(
                PlatformEventJournalEntry.journal_kind
                == PlatformEventJournalKind.TENANT_CONFIGURATION.value
            )
        else:
            query = query.filter(
                PlatformEventJournalEntry.journal_kind.in_(
                    [
                        PlatformEventJournalKind.DEV_DEVELOPMENT.value,
                        PlatformEventJournalKind.TENANT_CONFIGURATION.value,
                    ]
                )
            )
    else:
        query = query.filter(
            PlatformEventJournalEntry.journal_kind
            == PlatformEventJournalKind.TENANT_CONFIGURATION.value
        )

    entries = _journal_order(query).all()
    return [_serialize_entry(entry) for entry in entries]


def list_platform_event_journal_entries(db: Session) -> list[PlatformEventJournalEntryRead]:
    """Backward-compatible alias for platform-scoped journal listing."""
    return list_platform_scoped_journal_entries(db)
