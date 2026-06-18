"""Remove test users leaked by autotests; keep protected demo users.

Usage (from backend/):
  python scripts/user_cleanup_for_demo.py --dry-run
  python scripts/user_cleanup_for_demo.py --execute
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.user_management.demo_user_inventory import (
    audit_user_dependencies,
    build_user_inventory,
    cleanup_test_user_leaks,
    delete_confirmed_test_user,
)
from app.modules.users.models import User


def _row_to_dict(row) -> dict:
    if hasattr(row, "__dataclass_fields__"):
        return asdict(row)
    return dict(row)


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit and cleanup test users for demo")
    parser.add_argument("--dry-run", action="store_true", help="Audit only, do not delete")
    parser.add_argument("--execute", action="store_true", help="Delete confirmed test users")
    parser.add_argument("--json", action="store_true", help="Print inventory JSON")
    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        args.dry_run = True

    db = SessionLocal()
    try:
        inventory = build_user_inventory(db)
        test_users = inventory["test_users"]
        unknown_users = inventory["unknown_users"]
        protected_users = inventory["protected_users"]

        if args.json:
            payload = {
                "stats": inventory["stats"],
                "protected_users": [_row_to_dict(row) for row in protected_users],
                "test_users": [_row_to_dict(row) for row in test_users],
                "unknown_users": [_row_to_dict(row) for row in unknown_users],
            }
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            return

        print("USER CLEANUP AUDIT")
        print(json.dumps(inventory["stats"], ensure_ascii=False, indent=2))
        print(f"\nProtected users ({len(protected_users)}):")
        for row in protected_users:
            print(
                f"  id={row.id} email={row.email} name={row.full_name} "
                f"tenant={row.tenant} reasons={','.join(row.reasons)}"
            )

        print(f"\nUnknown users ({len(unknown_users)}) — skipped:")
        for row in unknown_users:
            print(f"  id={row.id} email={row.email} name={row.full_name} tenant={row.tenant}")

        delete_ids = [row.id for row in test_users]
        deps = audit_user_dependencies(db, delete_ids)
        print(f"\nTest users to delete: {len(delete_ids)}")
        print(f"Dependency audit: {json.dumps(deps, ensure_ascii=False)}")

        print("\nCleanup plan sample (first 20):")
        print("| User | Reason | Safe To Delete |")
        print("|------|--------|----------------|")
        for row in test_users[:20]:
            print(
                f"| {row.email} | {', '.join(row.reasons)} | {'yes' if row.safe_to_delete else 'no'} |"
            )
        if len(test_users) > 20:
            print(f"... and {len(test_users) - 20} more")

        if args.dry_run and not args.execute:
            print("\nDRY RUN — no users deleted")
            return

        deleted: list[int] = []
        for user_id in delete_ids:
            user = db.query(User).filter(User.id == user_id).one_or_none()
            if user is None:
                continue
            deleted.append(delete_confirmed_test_user(db, user))
        if deleted:
            db.commit()

        remaining = build_user_inventory(db)
        print(f"\nEXECUTED — deleted {len(deleted)} users")
        print(f"Remaining stats: {json.dumps(remaining['stats'], ensure_ascii=False)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
