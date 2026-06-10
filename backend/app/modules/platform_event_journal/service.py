"""Unified service for Platform Event Journal — single entry point for all journal writes."""

from __future__ import annotations

import re
from datetime import datetime

from sqlalchemy.orm import Session

from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_event_journal.constants import (
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


def _slugify(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower())
    normalized = normalized.strip("-")
    return normalized[:160] or "platform-event"


def _serialize_entry(entry: PlatformEventJournalEntry) -> PlatformEventJournalEntryRead:
    return PlatformEventJournalEntryRead.model_validate(entry)


def get_journal_entry_by_slug(db: Session, slug: str) -> PlatformEventJournalEntry | None:
    normalized_slug = str(slug or "").strip()
    if not normalized_slug:
        return None
    return (
        db.query(PlatformEventJournalEntry)
        .filter(PlatformEventJournalEntry.slug == normalized_slug)
        .one_or_none()
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
    Create a journal entry after a successfully completed platform task.

    Returns None when slug already exists (idempotent no-op).
    """
    normalized_title = str(title or "").strip()
    if not normalized_title:
        raise ValueError("title is required")

    normalized_slug = str(slug or "").strip() or _slugify(normalized_title)
    existing = get_journal_entry_by_slug(db, normalized_slug)
    if existing is not None:
        return None

    entry = PlatformEventJournalEntry(
        slug=normalized_slug,
        title=normalized_title,
        description=str(description or "").strip() or None,
        event_type=str(event_type or PlatformEventJournalType.ARCHITECTURE.value).strip().lower(),
        status=str(status or PlatformEventJournalStatus.DONE.value).strip().lower(),
        author=str(author or "").strip() or None,
        author_user_id=author_user_id,
        source=str(source or PlatformEventJournalSource.CURSOR.value).strip().lower(),
        occurred_at=occurred_at or utc_now(),
        created_at=utc_now(),
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    else:
        db.flush()
    return _serialize_entry(entry)


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
    created_count = 0
    for seed_entry in PLATFORM_EVENT_JOURNAL_BOOTSTRAP_ENTRIES:
        if get_journal_entry_by_slug(db, seed_entry.slug) is not None:
            continue
        record_platform_event_journal_entry(
            db,
            title=seed_entry.title,
            description=seed_entry.description,
            event_type=seed_entry.event_type,
            status=seed_entry.status,
            author=seed_entry.author,
            slug=seed_entry.slug,
            source=PlatformEventJournalSource.SEED.value,
        )
        created_count += 1
    return created_count


def list_platform_event_journal_entries(db: Session) -> list[PlatformEventJournalEntryRead]:
    ensure_platform_event_journal_bootstrap(db)
    db.flush()
    entries = (
        db.query(PlatformEventJournalEntry)
        .order_by(
            PlatformEventJournalEntry.occurred_at.desc(),
            PlatformEventJournalEntry.id.desc(),
        )
        .all()
    )
    return [_serialize_entry(entry) for entry in entries]
