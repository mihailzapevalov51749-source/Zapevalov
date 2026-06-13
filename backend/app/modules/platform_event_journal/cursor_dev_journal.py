"""Canonical DEV development journal writer for Cursor agent tasks."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.audit_service import record_dev_development_event
from app.modules.platform_event_journal.constants import (
    PlatformEventJournalSource,
    PlatformEventJournalStatus,
)
from app.modules.platform_event_journal.schemas import PlatformEventJournalEntryRead


def record_cursor_dev_event(
    db: Session,
    *,
    slug: str,
    title: str,
    description: str | None = None,
    event_type: str = "development",
    status: str = PlatformEventJournalStatus.DONE.value,
    author: str = "Cursor",
    commit: bool = True,
) -> PlatformEventJournalEntryRead | None:
    """
    Record a completed Cursor task in the DEV tenant development journal.

    Title and description must be Russian product language; slug stays English.
    English titles are normalized automatically when possible.
    """
    return record_dev_development_event(
        db,
        title=title,
        description=description,
        event_type=event_type,
        status=status,
        author=author,
        slug=slug,
        source=PlatformEventJournalSource.CURSOR.value,
        commit=commit,
    )
