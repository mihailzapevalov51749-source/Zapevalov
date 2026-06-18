"""Verify that DEV journal entries exist for required work item slugs."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.platform_event_journal.audit_service import get_journal_entry_by_slug

ALIAS_SLUGS = {
    "runtime-navigation-duplicates-repair": "repair-dev-runtime-navigation-duplicates",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify DEV journal slugs exist")
    parser.add_argument("slugs", nargs="+", help="Work item slugs to verify")
    args = parser.parse_args()

    db = SessionLocal()
    missing: list[str] = []
    try:
        for slug in args.slugs:
            entry = get_journal_entry_by_slug(db, slug)
            if entry is not None:
                print(f"OK {slug} id={entry.id} tenant_id={entry.tenant_id}")
                continue

            alias = ALIAS_SLUGS.get(slug)
            if alias:
                alias_entry = get_journal_entry_by_slug(db, alias)
                if alias_entry is not None:
                    print(f"OK {slug} via alias {alias} id={alias_entry.id}")
                    continue

            missing.append(slug)
            print(f"MISSING {slug}")
    finally:
        db.close()

    if missing:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
