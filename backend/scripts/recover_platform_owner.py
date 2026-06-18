#!/usr/bin/env python3
"""Recover platform owner from platform_settings when users row is missing.

Usage (from backend/):
  python scripts/recover_platform_owner.py --dry-run
  YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 python scripts/recover_platform_owner.py --execute
  YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 YASNOPRO_RECOVER_OWNER_PASSWORD='...' python scripts/recover_platform_owner.py --execute
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_profile.recover_owner_service import recover_platform_owner
from app.modules.control_plane.platform_users.models import PlatformUser
from app.modules.users.models import User
from scripts.platform_data_write_guard import require_platform_data_write_approval


def dry_run(db) -> int:
    row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if row is None:
        print("platform_settings: MISSING")
        return 1

    print(f"platform_owner_email={row.platform_owner_email!r}")
    print(f"platform_owner_user_id={row.platform_owner_user_id}")
    print(f"platform_owner_full_name={row.platform_owner_full_name!r}")

    if not row.platform_owner_email:
        print("ERROR: platform_owner_email is empty")
        return 1

    user = db.query(User).filter(User.email.ilike(row.platform_owner_email)).one_or_none()
    if user is None:
        print("users: NOT FOUND — execute will CREATE global user + link platform_owner_user_id")
    else:
        print(
            f"users: FOUND id={user.id} tenant_id={user.tenant_id} "
            f"active={user.is_active}"
        )
        if row.platform_owner_user_id != user.id:
            print("execute will RELINK platform_owner_user_id")

    return 0


def execute(db) -> int:
    require_platform_data_write_approval(script_name="recover_platform_owner.py")
    result = recover_platform_owner(db, commit=True)
    pu = db.query(PlatformUser).filter(PlatformUser.user_id == result.user_id).one_or_none()
    user = db.get(User, result.user_id)

    print(f"created={result.created}")
    print(f"user_id={result.user_id}")
    print(f"email={result.email}")
    print(f"tenant_id={user.tenant_id if user else None}")
    print(f"platform_owner_user_id linked={result.user_id}")
    print(f"platform_users registry={'yes' if pu else 'no'}")
    if result.temporary_password_set:
        print(
            "temporary_password: set via YASNOPRO_RECOVER_OWNER_PASSWORD or generated at runtime "
            "(not logged — check env or reset via invite flow)"
        )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Recover platform owner user")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        parser.error("Specify --dry-run or --execute")

    db = SessionLocal()
    try:
        if args.dry_run:
            return dry_run(db)
        return execute(db)
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
