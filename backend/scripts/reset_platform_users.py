#!/usr/bin/env python3
"""Reset platform_users registry bindings (never deletes global users)."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.control_plane.platform_users.reset_service import reset_platform_users
from app.modules.platform_data_safety.destructive_guard import DestructiveOperationBlocked
from scripts.platform_data_write_guard import require_platform_data_write_approval


def _print_plan(result) -> None:
    plan = result.plan
    print("Platform users registry reset plan")
    print(f"Dry run: {result.dry_run}")
    print(f"Global users preserved: {len(plan.global_users_preserved)}")
    for user in plan.global_users_preserved:
        print(f"  - #{user.id} {user.email} ({user.full_name or 'без имени'})")
    print(f"Registry bindings to remove: {len(plan.registry_bindings_to_remove)}")
    for binding in plan.registry_bindings_to_remove:
        print(
            f"  - user_id={binding.user_id} {binding.email} "
            f"role={binding.platform_role} status={binding.status}"
        )
    print(f"Owner fields to clear: {plan.owner_fields_to_clear}")
    print(f"Roles preserved ({len(plan.roles_preserved)}): {', '.join(plan.roles_preserved)}")
    print("users / tenant_user_memberships / tenant_user_profiles: NOT MODIFIED")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reset platform_users registry bindings without deleting global users",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show affected rows only (default when --confirm is not passed)",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Apply registry reset after explicit approval",
    )
    parser.add_argument("--json", action="store_true", help="Print result as JSON")
    args = parser.parse_args()

    dry_run = not args.confirm
    if args.dry_run:
        dry_run = True

    if args.confirm:
        require_platform_data_write_approval(script_name="reset_platform_users.py")

    db = SessionLocal()
    try:
        result = reset_platform_users(
            db,
            dry_run=dry_run,
            confirm=args.confirm,
            commit=args.confirm,
        )
    except DestructiveOperationBlocked as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(2) from error
    finally:
        db.close()

    if args.json:
        print(
            json.dumps(
                {
                    "dry_run": result.dry_run,
                    "plan": asdict(result.plan),
                    "removed_registry_bindings": [
                        asdict(item) for item in result.removed_registry_bindings
                    ],
                    "owner_fields_cleared": result.owner_fields_cleared,
                    "journal_entry_created": result.journal_entry_created,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return

    _print_plan(result)
    if result.dry_run:
        print("\nDRY RUN — no changes committed")
        print("To apply: YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 python scripts/reset_platform_users.py --confirm")
        return

    print("\nRegistry reset completed.")
    print(f"Removed registry bindings: {len(result.removed_registry_bindings)}")
    print(f"Owner fields cleared: {result.owner_fields_cleared}")
    print(f"Journal entry created: {result.journal_entry_created}")


if __name__ == "__main__":
    main()
