#!/usr/bin/env python3
"""Hard-purge confirmed demo test leaks (tenants + users).

Usage (from backend/):
  python scripts/purge_demo_environment.py
  python scripts/purge_demo_environment.py --dry-run
  YASNOPRO_ALLOW_TENANT_HARD_DELETE=1 python scripts/purge_demo_environment.py --execute --confirm
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.tenant_management.demo_cleanup_service import (
    build_demo_cleanup_plan,
    execute_demo_cleanup,
)
from app.modules.tenant_management.demo_environment_audit import (
    assert_demo_environment_clean,
    collect_demo_environment_metrics,
)
from app.modules.tenant_management.demo_tenant_inventory import resolve_protected_tenant_ids
from app.modules.portals.models import Portal
from app.modules.user_management.demo_user_inventory import build_user_inventory


def print_pre_audit(db) -> None:
    protected = resolve_protected_tenant_ids(db)
    print("PROTECTED TENANTS")
    for portal in db.query(Portal).order_by(Portal.id.asc()).all():
        if portal.id in protected:
            print(
                f"  id={portal.id} code={portal.code!r} title={portal.name!r} "
                f"type={portal.tenant_type} env={portal.environment_role} "
                f"is_protected={portal.is_protected} status={portal.tenant_status}"
            )

    inventory = build_user_inventory(db)
    print("\nPROTECTED USERS")
    for row in inventory["protected_users"]:
        print(
            f"  id={row.id} email={row.email} tenant={row.tenant} "
            f"reasons={','.join(row.reasons)}"
        )


def dry_run(db) -> int:
    print_pre_audit(db)
    plan = build_demo_cleanup_plan(db)
    print("\nPURGE PLAN")
    print(json.dumps({"tenants": plan.tenants, "users": plan.users}, ensure_ascii=False, indent=2))
    print(
        f"\nSUMMARY tenants={len(plan.tenants)} users={len(plan.users)} "
        f"destructive=hard_delete"
    )
    return 0


def execute(db, *, confirm: bool) -> int:
    print_pre_audit(db)
    result = execute_demo_cleanup(db, confirm=confirm)
    metrics = collect_demo_environment_metrics(db)
    print("\nEXECUTE RESULT")
    print(
        json.dumps(
            {
                "purged_tenant_ids": result.purged_tenant_ids,
                "deleted_user_ids": result.deleted_user_ids,
                "errors": result.errors,
                "metrics": metrics.__dict__,
            },
            ensure_ascii=False,
            indent=2,
            default=str,
        )
    )
    if result.errors:
        return 1
    assert_demo_environment_clean(db)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Purge confirmed demo test leaks")
    parser.add_argument("--dry-run", action="store_true", help="Audit only (default)")
    parser.add_argument("--execute", action="store_true", help="Run hard purge")
    parser.add_argument("--confirm", action="store_true", help="Required with --execute")
    args = parser.parse_args()

    if args.execute and not args.confirm:
        parser.error("--execute requires --confirm")

    db = SessionLocal()
    try:
        if args.execute:
            return execute(db, confirm=True)
        return dry_run(db)
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
