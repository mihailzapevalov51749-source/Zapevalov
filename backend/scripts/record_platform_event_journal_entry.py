#!/usr/bin/env python3
"""Record a completed platform task in Platform Event Journal."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.platform_event_journal.constants import (
    PlatformEventJournalStatus,
    PlatformEventJournalType,
)
from app.modules.platform_event_journal.service import record_platform_event_journal_entry


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a Platform Event Journal entry after a completed platform task.",
    )
    parser.add_argument("--title", required=True, help="Entry title")
    parser.add_argument("--description", default="", help="Entry description")
    parser.add_argument(
        "--event-type",
        default=PlatformEventJournalType.ARCHITECTURE.value,
        choices=[item.value for item in PlatformEventJournalType],
    )
    parser.add_argument(
        "--status",
        default=PlatformEventJournalStatus.DONE.value,
        choices=[item.value for item in PlatformEventJournalStatus],
    )
    parser.add_argument("--author", default="Cursor")
    parser.add_argument("--slug", default=None, help="Unique slug for idempotent writes")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    db = SessionLocal()
    try:
        entry = record_platform_event_journal_entry(
            db,
            title=args.title,
            description=args.description,
            event_type=args.event_type,
            status=args.status,
            author=args.author,
            slug=args.slug,
            commit=True,
        )
    finally:
        db.close()

    if entry is None:
        print("Skipped: entry with this slug already exists.")
        return

    print(f"Created journal entry #{entry.id}: {entry.title}")


if __name__ == "__main__":
    main()
