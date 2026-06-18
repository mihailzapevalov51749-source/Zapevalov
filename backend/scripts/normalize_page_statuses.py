"""
Normalize pages.status to match publication placements.

Usage (from backend/):
  python scripts/normalize_page_statuses.py --dry-run
  python scripts/normalize_page_statuses.py --apply
  python scripts/normalize_page_statuses.py --dry-run --tenant-id 1
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from structure_write_script_guard import guard_script_structure_write  # noqa: E402

from app.db.session import SessionLocal
from app.modules.platform.designer.pages.page_status_normalization import (
    format_change_report,
    normalize_page_statuses,
)
from app.modules.users.models import User  # noqa: F401 - ensure users mapper is registered
from sqlalchemy import text

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize pages.status by publication placements")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Report planned changes without writing")
    mode.add_argument("--apply", action="store_true", help="Apply normalization changes")
    parser.add_argument("--tenant-id", type=int, default=None, help="Limit to portal/tenant id")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.apply:
            if args.tenant_id is not None:
                guard_script_structure_write(db, args.tenant_id, "normalize_page_statuses")
            else:
                portal_ids = {
                    int(row[0])
                    for row in db.execute(
                        text("SELECT DISTINCT portal_id FROM pages WHERE deleted_at IS NULL")
                    )
                }
                for portal_id in sorted(portal_ids):
                    guard_script_structure_write(db, portal_id, "normalize_page_statuses")

        result = normalize_page_statuses(
            db,
            dry_run=not args.apply,
            tenant_id=args.tenant_id,
        )

        print("=" * 80)
        print(f"Mode: {'dry-run' if result.dry_run else 'apply'}")
        print(f"Checked pages: {result.checked_count}")
        print(f"Changed pages: {result.changed_count}")
        print(f"Skipped soft-deleted: {result.skipped_soft_deleted}")
        print(f"Result published: {result.result_published}")
        print(f"Result hidden: {result.result_hidden}")
        print(f"Result draft: {result.result_draft}")
        print(f"Nav items to reset is_visible: {result.nav_items_reset_visible}")
        if result.errors:
            print(f"Errors: {result.errors}")
        print("=" * 80)

        for change in result.changes:
            if change.old_status == change.new_status and not change.nav_item_ids_to_reset_visible:
                continue
            print(format_change_report(change))
            print("-" * 40)

    finally:
        db.close()


if __name__ == "__main__":
    main()
