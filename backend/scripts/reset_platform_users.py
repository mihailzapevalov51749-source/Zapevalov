#!/usr/bin/env python3
"""Reset all platform users and clear platform owner profile fields."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.control_plane.platform_users.reset_service import reset_platform_users
from scripts.platform_data_write_guard import require_platform_data_write_approval


def main() -> None:
    require_platform_data_write_approval(script_name="reset_platform_users.py")

    db = SessionLocal()
    try:
        result = reset_platform_users(db, commit=True)
    finally:
        db.close()

    print("Platform users reset completed.")
    print(f"Deleted users: {len(result.deleted_users)}")
    for user in result.deleted_users:
        role_label = user.role_name or "—"
        print(f"  - #{user.id} {user.email} ({user.full_name or 'без имени'}) role={role_label}")

    print(f"Roles preserved ({len(result.roles_preserved)}): {', '.join(result.roles_preserved)}")
    print(f"Owner fields cleared: {result.owner_fields_cleared}")
    print(f"Journal entry created: {result.journal_entry_created}")


if __name__ == "__main__":
    main()
