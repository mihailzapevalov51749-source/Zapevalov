"""Restore demo CLIENT tenant ООО Розетка.

Usage (from backend/):
  python scripts/restore_demo_rozetka.py --dry-run
  python scripts/restore_demo_rozetka.py --execute --confirm
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.tenant_management.demo_tenant_inventory import assert_demo_tenant_inventory
from app.modules.tenant_management.restore_demo_rozetka import (
    RestoreDemoRozetkaPlan,
    RestoreDemoRozetkaResult,
    restore_demo_rozetka,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Restore protected demo CLIENT tenant Rozetka")
    parser.add_argument("--dry-run", action="store_true", help="Show plan only")
    parser.add_argument("--execute", action="store_true", help="Apply restore")
    parser.add_argument("--confirm", action="store_true", help="Required with --execute")
    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        parser.error("Specify --dry-run or --execute")

    db = SessionLocal()
    try:
        if args.dry_run:
            plan = restore_demo_rozetka(db, dry_run=True)
            assert isinstance(plan, RestoreDemoRozetkaPlan)
            print("RESTORE PLAN")
            print(f"  action: {plan.action}")
            print(f"  target_portal_id: {plan.target_portal_id}")
            print(f"  existing_portal_id: {plan.existing_portal_id}")
            print(f"  bootstrap_from_template: {plan.bootstrap_from_template}")
            print(f"  backup: {plan.backup_hint}")
            print(plan.audit.render())
            return 0

        result = restore_demo_rozetka(db, dry_run=False, confirm=args.confirm)
        assert isinstance(result, RestoreDemoRozetkaResult)
        print("RESTORE RESULT")
        print(f"  portal_id: {result.portal_id}")
        print(f"  created: {result.created}")
        print(f"  bootstrapped: {result.bootstrapped}")
        print(result.audit.render())
        assert_demo_tenant_inventory(db)
        print("INVENTORY CHECK: OK")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
