"""Remove secondary demo global users (yasno.pro / nino).

Default: dry-run impact audit only.
Execute requires --execute --confirm.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.control_plane.global_users.service import list_global_users
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.portals.models import Portal
from app.modules.tenant_users.membership_service import find_global_user_by_email
from app.modules.user_management.demo_user_inventory import (
    SECONDARY_DEMO_GLOBAL_USER_EMAILS,
    audit_secondary_demo_global_user_impact,
    delete_secondary_demo_global_user,
    list_visible_users,
)
from app.modules.users.models import User


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove secondary demo global users")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--confirm", action="store_true")
    return parser.parse_args()


def _platform_owner_snapshot(db) -> dict:
    settings = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    owner = db.get(User, settings.platform_owner_user_id) if settings and settings.platform_owner_user_id else None
    return {
        "platform_owner_exists": owner is not None,
        "platform_owner_active": bool(owner.is_active) if owner else False,
        "platform_owner_user_id": owner.id if owner else None,
        "platform_owner_email": owner.email if owner else None,
        "platform_owner_tenant_id": owner.tenant_id if owner else None,
    }


def _protected_tenants_snapshot(db) -> list[dict]:
    rows = db.query(Portal).filter(Portal.id.in_([1, 2, 21])).order_by(Portal.id.asc()).all()
    return [{"id": row.id, "name": row.name, "code": row.code, "tenant_type": row.tenant_type} for row in rows]


def main() -> None:
    args = parse_args()
    db = SessionLocal()
    try:
        targets: list[User] = []
        impacts: list[dict] = []
        missing: list[str] = []

        for email in sorted(SECONDARY_DEMO_GLOBAL_USER_EMAILS):
            user = find_global_user_by_email(db, email)
            if user is None:
                missing.append(email)
                continue
            targets.append(user)
            impacts.append(audit_secondary_demo_global_user_impact(db, user))

        report = {
            "mode": "execute" if args.execute and args.confirm else "dry_run",
            "targets": impacts,
            "missing_emails": missing,
            "platform_owner_before": _platform_owner_snapshot(db),
            "global_users_before": list_global_users(db),
            "protected_tenants_before": _protected_tenants_snapshot(db),
        }

        if args.execute and args.confirm:
            deleted: list[dict] = []
            for user in targets:
                deleted.append(delete_secondary_demo_global_user(db, user))
            db.commit()
            report["deleted"] = deleted
            report["platform_owner_after"] = _platform_owner_snapshot(db)
            report["global_users_after"] = list_global_users(db)
            report["global_users_count"] = len(report["global_users_after"])
            report["protected_tenants_after"] = _protected_tenants_snapshot(db)
            report["visible_users_after"] = [
                {"id": user.id, "email": user.email, "full_name": user.full_name}
                for user in list_visible_users(db)
            ]

        json.dump(report, sys.stdout, ensure_ascii=False, indent=2, default=str)
        sys.stdout.write("\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
