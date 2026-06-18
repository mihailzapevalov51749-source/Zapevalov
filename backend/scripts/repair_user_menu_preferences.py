"""Dry-run / apply cleanup for user_menu_preferences (left menu personalization disabled).

Usage (from backend/):
  python scripts/repair_user_menu_preferences.py
  python scripts/repair_user_menu_preferences.py --tenant-id 2
  YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 python scripts/repair_user_menu_preferences.py --apply
  YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 python scripts/repair_user_menu_preferences.py --apply --tenant-id 2
"""

from __future__ import annotations

import argparse
import os

from app.db.session import SessionLocal
from app.modules.platform.runtime.menu_settings.models import UserMenuPreference


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair user_menu_preferences rows")
    parser.add_argument("--tenant-id", type=int, default=None, help="Limit to one tenant")
    parser.add_argument("--apply", action="store_true", help="Delete matching rows")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        query = db.query(UserMenuPreference).order_by(
            UserMenuPreference.tenant_id.asc(),
            UserMenuPreference.user_id.asc(),
            UserMenuPreference.item_key.asc(),
        )
        if args.tenant_id is not None:
            query = query.filter(UserMenuPreference.tenant_id == args.tenant_id)

        rows = query.all()
        print("user_menu_preferences repair (dry-run)" if not args.apply else "user_menu_preferences repair (apply)")
        print("=" * 72)
        print(f"Total rows: {len(rows)}")

        if not rows:
            print("Nothing to repair.")
            return

        by_tenant: dict[int, int] = {}
        for row in rows:
            by_tenant[row.tenant_id] = by_tenant.get(row.tenant_id, 0) + 1

        print("Counts by tenant_id:")
        for tenant_id, count in sorted(by_tenant.items()):
            print(f"  tenant {tenant_id}: {count}")

        print()
        print(f"{'tenant':>8}  {'user':>8}  {'item_key':<28}  sort  hidden  personal_block")
        print("-" * 72)
        for row in rows:
            print(
                f"{row.tenant_id:8d}  {row.user_id:8d}  {row.item_key:<28}  "
                f"{row.sort_order!s:>4}  {str(row.is_hidden):>6}  {row.personal_block_key or '-'}"
            )

        if not args.apply:
            print()
            print("Dry-run only. Re-run with --apply to delete these rows.")
            print("Requires YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 for --apply.")
            return

        if os.environ.get("YASNOPRO_ALLOW_PLATFORM_DATA_WRITE") != "1":
            raise SystemExit(
                "Refusing --apply without YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1"
            )

        deleted = (
            db.query(UserMenuPreference)
            .filter(UserMenuPreference.id.in_([row.id for row in rows]))
            .delete(synchronize_session=False)
        )
        db.commit()
        print()
        print(f"Deleted {deleted} user_menu_preferences row(s).")
        print("tenant_runtime_menu_settings and navigation_items were not modified.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
