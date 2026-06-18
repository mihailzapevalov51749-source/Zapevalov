"""Audit DEV journal entries — list recent rows and check target slugs."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.platform_event_journal.models import PlatformEventJournalEntry

TARGET_SLUGS = (
    "calendar-context-menu-create-event-actions",
    "fix-calendar-context-menu-ui-not-working",
    "calendar-week-sticky-day-header",
    "runtime-menu-settings-inheritance",
    "fix-left-sidebar-missing-menu-items",
    "user-personal-menu-settings-access",
    "user-menu-dnd-fix",
    "disable-user-personal-left-menu-editing",
    "notification-object-opening-audit",
    "runtime-navigation-duplicates-repair",
)


def main() -> None:
    db = SessionLocal()
    try:
        rows = (
            db.query(PlatformEventJournalEntry)
            .order_by(PlatformEventJournalEntry.created_at.desc())
            .limit(30)
            .all()
        )
        print("=== LAST 30 ENTRIES ===")
        for row in rows:
            legacy_type = None
            if row.metadata_json and isinstance(row.metadata_json, dict):
                legacy_type = row.metadata_json.get("legacy_event_type")
            print(
                f"id={row.id} slug={row.slug} title={row.title[:70]!r} "
                f"created_at={row.created_at} tenant_id={row.tenant_id} "
                f"scope={row.scope} journal_kind={row.journal_kind} "
                f"event_type={row.event_type} legacy={legacy_type}"
            )

        print()
        print("=== TARGET SLUGS ===")
        for slug in TARGET_SLUGS:
            hit = (
                db.query(PlatformEventJournalEntry)
                .filter(PlatformEventJournalEntry.slug == slug)
                .first()
            )
            if hit:
                print(f"{slug}: EXISTS id={hit.id}")
            else:
                print(f"{slug}: MISSING")
    finally:
        db.close()


if __name__ == "__main__":
    main()
