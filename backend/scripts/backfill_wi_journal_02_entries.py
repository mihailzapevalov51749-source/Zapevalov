#!/usr/bin/env python3
"""Backfill WI-JOURNAL-02 DEV journal entries from portal_constructor_v2 into yasnopro_dev."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.modules.platform_event_journal.dev_journal_database import (
    resolve_dev_database_name,
    resolve_dev_journal_database_url,
)

os.environ["DATABASE_URL"] = resolve_dev_journal_database_url()

from app.modules.platform_event_journal.constants import PlatformEventJournalType
from app.modules.platform_event_journal.dev_journal_backfill import (
    DevJournalBackfillResult,
    backfill_dev_journal_slugs_from_database,
)
from app.modules.platform_event_journal.dev_journal_database import open_dev_journal_db_session
from app.modules.platform_event_journal.work_item_journal import (
    WorkItemJournalPayload,
    create_work_item_journal_entry,
)

COPY_SLUGS = (
    "wi-arch-03-architecture-navigator-mvp",
    "wi-arch-03b-fix-architecture-component-card-500",
    "wi-arch-03c-platform-ui-architecture-layer",
    "wi-ui-01-recalibrate-sidebar-scale-baseline",
)

ARCH_03A_SLUG = "wi-arch-03a-fix-architecture-navigator-api-registration"

ARCH_03A_PAYLOAD = WorkItemJournalPayload(
    slug=ARCH_03A_SLUG,
    title="WI-ARCH-03A: регистрация Architecture Navigator API",
    summary=(
        "WI-ARCH-03A исправил регистрацию Architecture Navigator API routes. "
        "Результат: /dev/architecture/* routes зарегистрированы и видны в OpenAPI."
    ),
    work_item_type="fix",
    root_cause="Router Architecture Navigator не был загружен в backend-процесс.",
    changed_files=[
        "backend/app/main.py",
        "backend/app/modules/platform/architecture_navigator/bootstrap.py",
        "backend/tests/test_architecture_navigator_api_registration.py",
    ],
    tests="test_architecture_navigator_api_registration.py",
    manual_smoke="NOT PERFORMED — backfill entry; verify /dev/architecture/* in OpenAPI.",
    event_type=PlatformEventJournalType.FIX.value,
    category_ru="Архитектура",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill WI-JOURNAL-02 DEV journal entries")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def _print_report(
    *,
    copy_results: list[DevJournalBackfillResult],
    created: list[tuple[str, int | None]],
    skipped_create: list[str],
) -> None:
    copied = [item for item in copy_results if item.action == "copied"]
    skipped_exists = [item for item in copy_results if item.action == "skipped_exists"]
    missing_source = [item for item in copy_results if item.action == "missing_source"]
    would_copy = [item for item in copy_results if item.action == "would_copy"]

    print(f"Database: {resolve_dev_database_name()}\n")
    print("copied:")
    for item in copied or would_copy:
        suffix = ""
        if item.target_id is not None:
            suffix = f" -> id={item.target_id}"
        elif item.source_id is not None:
            suffix = f" (source id={item.source_id})"
        print(f"  {item.slug}{suffix}")

    print("skipped_exists:")
    for item in skipped_exists:
        print(f"  {item.slug} (id={item.target_id})")

    print("missing_source:")
    for item in missing_source:
        print(f"  {item.slug}")

    print("created:")
    for slug, entry_id in created:
        print(f"  {slug} -> id={entry_id}")
    for slug in skipped_create:
        print(f"  {slug} (already exists)")


def main() -> None:
    args = parse_args()
    copy_results = backfill_dev_journal_slugs_from_database(
        list(COPY_SLUGS),
        dry_run=args.dry_run,
    )

    created: list[tuple[str, int | None]] = []
    skipped_create: list[str] = []

    if args.dry_run:
        created.append((ARCH_03A_SLUG, None))
    else:
        with open_dev_journal_db_session() as db:
            result = create_work_item_journal_entry(db, ARCH_03A_PAYLOAD, commit=True)
            if result is None:
                skipped_create.append(ARCH_03A_SLUG)
            else:
                created.append((ARCH_03A_SLUG, result.id))

    _print_report(
        copy_results=copy_results,
        created=created,
        skipped_create=skipped_create,
    )


if __name__ == "__main__":
    main()
