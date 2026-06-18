"""Remove legacy demo company owner global user (mihailzapevalov51749@gmail.com).

Default: dry-run impact audit only.
Execute requires --execute --confirm and explicit user id/email match.
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
from app.modules.tenant_roles.owner_service import get_company_owner
from app.modules.user_management.demo_user_inventory import (
    LEGACY_DEMO_COMPANY_OWNER_EMAIL,
    audit_legacy_demo_company_owner_impact,
    delete_legacy_demo_company_owner_user,
    list_visible_users,
)
from app.modules.users.models import User


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove legacy demo company owner user")
    parser.add_argument("--user-id", type=int, default=1148)
    parser.add_argument("--email", default=LEGACY_DEMO_COMPANY_OWNER_EMAIL)
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


def _global_users_snapshot(db) -> list[dict]:
    return list_global_users(db)


def _protected_tenants_snapshot(db) -> list[dict]:
    rows = db.query(Portal).filter(Portal.id.in_([1, 2, 21])).order_by(Portal.id.asc()).all()
    return [{"id": row.id, "name": row.name, "code": row.code, "tenant_type": row.tenant_type} for row in rows]


def main() -> None:
    args = parse_args()
    db = SessionLocal()
    try:
        user = db.get(User, args.user_id)
        if user is None:
            raise SystemExit(f"User id={args.user_id} not found")
        if str(user.email or "").strip().lower() != str(args.email).strip().lower():
            raise SystemExit(
                f"Email mismatch for user id={args.user_id}: expected {args.email}, got {user.email}"
            )

        impact = audit_legacy_demo_company_owner_impact(db, user)
        report = {
            "mode": "execute" if args.execute and args.confirm else "dry_run",
            "impact": impact,
            "platform_owner_before": _platform_owner_snapshot(db),
            "global_users_before": _global_users_snapshot(db),
            "protected_tenants_before": _protected_tenants_snapshot(db),
        }

        if args.execute and args.confirm:
            delete_legacy_demo_company_owner_user(db, user)
            db.commit()
            report["platform_owner_after"] = _platform_owner_snapshot(db)
            report["global_users_after"] = _global_users_snapshot(db)
            report["dev_company_owner_after"] = (
                {
                    "user_id": owner.id,
                    "email": owner.email,
                    "full_name": owner.full_name,
                }
                if (owner := get_company_owner(db, 1)) is not None
                else None
            )
            report["protected_tenants_after"] = _protected_tenants_snapshot(db)
            report["visible_users_after"] = [
                {"id": u.id, "email": u.email, "full_name": u.full_name}
                for u in list_visible_users(db)
            ]

        json.dump(report, sys.stdout, ensure_ascii=False, indent=2, default=str)
        sys.stdout.write("\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
