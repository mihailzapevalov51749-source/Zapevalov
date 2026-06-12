"""Audit journal entry taxonomy consistency (scope vs category/type)."""

from __future__ import annotations

from app.db.session import SessionLocal
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_event_journal.tenant_audit_constants import (
    PLATFORM_EVENT_CATEGORY_VALUES,
    PLATFORM_ONLY_EVENT_CATEGORIES,
    TENANT_EVENT_CATEGORY_VALUES,
    TENANT_ONLY_EVENT_CATEGORIES,
)


def main() -> None:
    db = SessionLocal()
    try:
        entries = db.query(PlatformEventJournalEntry).all()
        inconsistent: list[dict] = []

        for entry in entries:
            scope = str(entry.scope or "").strip().lower()
            category = str(entry.event_category or "").strip().lower()
            if not category:
                continue

            if scope == "platform" and category in TENANT_ONLY_EVENT_CATEGORIES:
                inconsistent.append(
                    {
                        "id": entry.id,
                        "scope": scope,
                        "slug": entry.slug,
                        "event_category": category,
                        "issue": "platform scope with tenant category",
                    }
                )
            elif scope == "tenant" and category in PLATFORM_ONLY_EVENT_CATEGORIES:
                inconsistent.append(
                    {
                        "id": entry.id,
                        "scope": scope,
                        "slug": entry.slug,
                        "event_category": category,
                        "issue": "tenant scope with platform category",
                    }
                )

        print(f"total entries: {len(entries)}")
        print(f"inconsistent: {len(inconsistent)}")
        for row in inconsistent:
            print(row)
    finally:
        db.close()


if __name__ == "__main__":
    main()
