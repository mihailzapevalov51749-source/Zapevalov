#!/usr/bin/env python3
"""Restore demo global users removed by platform-users-reset."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.user_management.demo_user_recovery import restore_demo_global_users
from scripts.platform_data_write_guard import require_platform_data_write_approval


def main() -> None:
    parser = argparse.ArgumentParser(description="Restore protected demo global users")
    parser.add_argument("--dry-run", action="store_true", help="Show recovery plan only")
    parser.add_argument("--confirm", action="store_true", help="Apply recovery")
    parser.add_argument("--json", action="store_true", help="Print JSON output")
    args = parser.parse_args()

    dry_run = not args.confirm
    if args.dry_run:
        dry_run = True

    if args.confirm:
        require_platform_data_write_approval(script_name="restore_demo_global_users.py")

    db = SessionLocal()
    try:
        plan = restore_demo_global_users(db, dry_run=dry_run, confirm=args.confirm)
        if args.confirm:
            db.commit()
    finally:
        db.close()

    if args.json:
        print(json.dumps([asdict(item) for item in plan], ensure_ascii=False, indent=2))
        return

    print("Demo global users recovery plan")
    for item in plan:
        print(
            f"- {item.email}: {item.action}"
            + (f" (user_id={item.user_id})" if item.user_id else "")
            + (f" [{item.details}]" if item.details else "")
        )

    if dry_run:
        print("\nDRY RUN — no users created")
        print(
            "To apply: YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 "
            "python scripts/restore_demo_global_users.py --confirm"
        )
        return

    print("\nRecovery completed.")


if __name__ == "__main__":
    main()
