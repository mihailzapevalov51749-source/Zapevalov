#!/usr/bin/env python3
"""Backfill legacy Platform Owner into Platform Identity Store (WI-02).

Usage (from backend/):
  python scripts/backfill_platform_owner_identity.py --dry-run
  YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 python scripts/backfill_platform_owner_identity.py --execute
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.control_plane.platform_identity.legacy_owner_audit import (
    resolve_legacy_platform_owner_audit,
)
from app.modules.control_plane.platform_identity.owner_backfill_service import (
    PlatformOwnerBackfillError,
    backfill_platform_owner_identity,
    build_platform_owner_mapping_audit,
    verify_dual_readiness,
)
from scripts.platform_data_write_guard import require_platform_data_write_approval


def _print_legacy_audit(db) -> int:
    legacy = resolve_legacy_platform_owner_audit(db)
    if legacy is None:
        print("legacy_owner: NOT CONFIGURED")
        print("chain: platform_settings.platform_owner_user_id is NULL or user missing")
        return 1

    print("legacy_owner:")
    print(f"  platform_settings.id={legacy.platform_settings_id}")
    print(f"  platform_owner_user_id={legacy.platform_owner_user_id}")
    print(f"  users.id={legacy.user_id}")
    print(f"  email={legacy.email!r}")
    print(f"  full_name={legacy.full_name!r}")
    print(f"  status={legacy.status_label}")
    print(f"  tenant_id={legacy.tenant_id}")
    print(f"  hashed_password_present={legacy.hashed_password_present}")
    return 0


def dry_run(db) -> int:
    code = _print_legacy_audit(db)
    if code != 0:
        return code

    mapping = build_platform_owner_mapping_audit(db)
    dual = verify_dual_readiness(db)

    print("\nstore_mapping:")
    if mapping is None:
        print("  not present — execute will CREATE identity + role_binding + credential")
    else:
        print(f"  legacy_user_id={mapping.legacy_user_id}")
        print(f"  platform_identity_id={mapping.platform_identity_id}")
        print(f"  email={mapping.email!r}")
        print(f"  role_binding_id={mapping.role_binding_id}")
        print(f"  credential_id={mapping.credential_id}")

    print("\ndual_readiness:")
    print(json.dumps(dual, ensure_ascii=False, indent=2))
    return 0


def execute(db) -> int:
    require_platform_data_write_approval(script_name="backfill_platform_owner_identity.py")

    result = backfill_platform_owner_identity(db, commit=True)
    dual = verify_dual_readiness(db)

    print("backfill_result:")
    print(json.dumps(result.to_audit_dict(), ensure_ascii=False, indent=2))
    print("\ndual_readiness:")
    print(json.dumps(dual, ensure_ascii=False, indent=2))

    if not dual.get("ready"):
        print("ERROR: dual readiness check failed after backfill", file=sys.stderr)
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill Platform Owner into Platform Identity Store"
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()

    if args.dry_run == args.execute:
        parser.error("Specify exactly one of --dry-run or --execute")

    db = SessionLocal()
    try:
        if args.dry_run:
            return dry_run(db)
        return execute(db)
    except PlatformOwnerBackfillError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
