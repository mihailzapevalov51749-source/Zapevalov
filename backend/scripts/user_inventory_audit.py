"""Audit platform/tenant users for demo cleanup."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.user_management.demo_user_inventory import build_user_inventory


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit users for demo cleanup")
    parser.add_argument("--json", action="store_true", help="Print full JSON inventory")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        inventory = build_user_inventory(db)
    finally:
        db.close()

    if args.json:
        payload = {
            "stats": inventory["stats"],
            "protected_users": [asdict(row) for row in inventory["protected_users"]],
            "test_users": [asdict(row) for row in inventory["test_users"]],
            "unknown_users": [asdict(row) for row in inventory["unknown_users"]],
            "rows": [asdict(row) for row in inventory["rows"]],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    print("USER INVENTORY STATS")
    print(json.dumps(inventory["stats"], ensure_ascii=False, indent=2))
    print(f"\nProtected users: {len(inventory['protected_users'])}")
    for row in inventory["protected_users"]:
        print(
            f"  id={row.id} email={row.email} name={row.full_name} "
            f"tenant={row.tenant} reasons={','.join(row.reasons)}"
        )
    print(f"\nTest users: {len(inventory['test_users'])}")
    for row in inventory["test_users"][:20]:
        print(
            f"  id={row.id} email={row.email} name={row.full_name} "
            f"tenant={row.tenant} reasons={','.join(row.reasons)}"
        )
    if len(inventory["test_users"]) > 20:
        print(f"  ... and {len(inventory['test_users']) - 20} more")
    print(f"\nUnknown users: {len(inventory['unknown_users'])}")
    for row in inventory["unknown_users"]:
        print(
            f"  id={row.id} email={row.email} name={row.full_name} "
            f"tenant={row.tenant} role={row.role}"
        )


if __name__ == "__main__":
    main()
