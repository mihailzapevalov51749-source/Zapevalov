"""Idempotent backfill of DEV journal entries by slug across databases."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.modules.platform_event_journal.dev_journal_database import (
    LEGACY_CURSOR_DATABASE_NAME,
    build_database_url,
    load_dev_stack_manifest,
    open_dev_journal_db_session,
    resolve_dev_database_name,
)
from app.modules.platform_event_journal.models import PlatformEventJournalEntry


@dataclass(frozen=True)
class DevJournalBackfillResult:
    slug: str
    action: str
    target_id: int | None = None
    source_id: int | None = None


def _copy_entry_fields(source: PlatformEventJournalEntry) -> dict[str, Any]:
    return {
        "slug": source.slug,
        "title": source.title,
        "description": source.description,
        "event_type": source.event_type,
        "scope": source.scope,
        "journal_kind": source.journal_kind,
        "event_category": source.event_category,
        "status": source.status,
        "author": source.author,
        "author_user_id": source.author_user_id,
        "actor_email": source.actor_email,
        "target_type": source.target_type,
        "target_id": source.target_id,
        "target_name": source.target_name,
        "tenant_id": source.tenant_id,
        "company_id": source.company_id,
        "metadata_json": source.metadata_json,
        "source": source.source,
        "occurred_at": source.occurred_at,
        "created_at": source.created_at,
    }


def backfill_dev_journal_slugs_from_database(
    slugs: list[str],
    *,
    source_database_name: str = LEGACY_CURSOR_DATABASE_NAME,
    dry_run: bool = False,
) -> list[DevJournalBackfillResult]:
    manifest = load_dev_stack_manifest()
    target_database_name = resolve_dev_database_name(manifest)
    source_url = build_database_url(source_database_name, manifest)

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    source_session = sessionmaker(bind=create_engine(source_url))()
    results: list[DevJournalBackfillResult] = []

    try:
        with open_dev_journal_db_session(manifest) as target_db:
            for slug in slugs:
                existing = (
                    target_db.query(PlatformEventJournalEntry)
                    .filter(PlatformEventJournalEntry.slug == slug)
                    .one_or_none()
                )
                if existing is not None:
                    results.append(
                        DevJournalBackfillResult(
                            slug=slug,
                            action="skipped_exists",
                            target_id=existing.id,
                        )
                    )
                    continue

                source = (
                    source_session.query(PlatformEventJournalEntry)
                    .filter(PlatformEventJournalEntry.slug == slug)
                    .one_or_none()
                )
                if source is None:
                    results.append(DevJournalBackfillResult(slug=slug, action="missing_source"))
                    continue

                if dry_run:
                    results.append(
                        DevJournalBackfillResult(
                            slug=slug,
                            action="would_copy",
                            source_id=source.id,
                        )
                    )
                    continue

                target_db.add(PlatformEventJournalEntry(**_copy_entry_fields(source)))
                target_db.flush()
                copied = (
                    target_db.query(PlatformEventJournalEntry)
                    .filter(PlatformEventJournalEntry.slug == slug)
                    .one()
                )
                results.append(
                    DevJournalBackfillResult(
                        slug=slug,
                        action="copied",
                        source_id=source.id,
                        target_id=copied.id,
                    )
                )

            if not dry_run:
                target_db.commit()
    finally:
        source_session.close()

    return results
