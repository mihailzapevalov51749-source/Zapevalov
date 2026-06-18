#!/usr/bin/env python3
"""Repair duplicate / broken runtime navigation items for the DEV tenant."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from structure_write_script_guard import guard_script_structure_write  # noqa: E402

from app.db.session import SessionLocal
from app.modules.navigation.runtime_navigation_reconcile import (
    apply_runtime_navigation_repair_plan,
    build_runtime_navigation_repair_plan,
    reconcile_runtime_navigation,
)
from app.modules.platform_event_journal.seed_classification import (
    resolve_dev_tenant_portal_id,
    resolve_tenant_type,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantType


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Repair duplicate runtime navigation items for the DEV tenant.",
    )
    parser.add_argument(
        "--portal-id",
        type=int,
        default=None,
        help="Target portal id (defaults to resolved DEV tenant)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes (default: dry-run only)",
    )
    parser.add_argument(
        "--allow-non-dev",
        action="store_true",
        help="Allow running against a non-DEV tenant (explicit override)",
    )
    return parser.parse_args()


def _resolve_target_portal(db, portal_id: int | None) -> tuple[int, Portal]:
    target_id = int(portal_id or resolve_dev_tenant_portal_id(db))
    portal = db.query(Portal).filter(Portal.id == target_id).one()
    return target_id, portal


def _print_plan(plan) -> None:
    print(f"portal_id={plan.portal_id}")
    print(f"actions={len(plan.actions)} hide={plan.hide_count} flags={plan.flag_count}")
    if not plan.actions:
        print("No changes required.")
        return

    for action in plan.actions:
        print(
            f"- [{action.action}] nav_id={action.nav_id} title={action.title!r} "
            f"system_key={action.system_key!r} page_id={action.page_id} "
            f"reason={action.reason}"
        )


def main() -> int:
    args = parse_args()
    db = SessionLocal()

    try:
        portal_id, portal = _resolve_target_portal(db, args.portal_id)
        tenant_type = resolve_tenant_type(db, portal_id)

        if tenant_type != TenantType.DEV.value and not args.allow_non_dev:
            print(
                f"Refusing to repair portal_id={portal_id} with tenant_type={tenant_type}. "
                "Use --allow-non-dev to override.",
                file=sys.stderr,
            )
            return 2

        print(
            f"Target portal_id={portal_id} name={portal.name!r} tenant_type={tenant_type} "
            f"mode={'apply' if args.apply else 'dry-run'}",
        )

        if args.apply:
            guard_script_structure_write(db, portal_id, "repair_dev_runtime_navigation_duplicates")
            plan = reconcile_runtime_navigation(db, portal_id=portal_id, apply=True)
            db.commit()
            print(f"Applied {len(plan.actions)} planned actions.")
        else:
            plan = build_runtime_navigation_repair_plan(db, portal_id=portal_id)
            print("Dry-run plan:")
            _print_plan(plan)
            print("Re-run with --apply to persist changes.")

        return 0
    except Exception as error:
        db.rollback()
        print(f"Repair failed: {error}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
