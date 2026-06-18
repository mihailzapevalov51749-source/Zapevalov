#!/usr/bin/env python3
"""Full demo environment audit (read-only)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import func, text

from app.db.session import SessionLocal
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_users.models import PlatformUser
from app.modules.portals.models import Portal
from app.modules.tenant_management.tenant_write_policy import is_protected_tenant_portal
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.models import User


def main() -> int:
    db = SessionLocal()
    try:
        settings = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
        owner_id = settings.platform_owner_user_id if settings else None
        owner = db.get(User, owner_id) if owner_id else None

        portals = db.query(Portal).order_by(Portal.id.asc()).all()
        protected = []
        test_tenants = []
        for p in portals:
            row = {
                "id": p.id,
                "title": p.name,
                "code": p.code,
                "environment_role": p.environment_role,
                "tenant_type": p.tenant_type,
                "is_protected": bool(p.is_protected),
                "status": p.tenant_status,
                "is_active": bool(p.is_active),
                "created_at": str(p.created_at) if getattr(p, "created_at", None) else None,
            }
            if is_protected_tenant_portal(p):
                protected.append(row)
            else:
                test_tenants.append(row)

        users = (
            db.query(User)
            .filter(User.is_hidden_user.is_(False))
            .order_by(User.id.asc())
            .all()
        )
        protected_users = []
        test_users = []
        unknown_users = []
        for u in users:
            row = {
                "id": u.id,
                "email": u.email,
                "display_name": u.full_name,
                "tenant_id": u.tenant_id,
                "is_active": bool(u.is_active),
                "login_disabled": bool(getattr(u, "login_disabled", False)),
                "created_at": str(u.created_at) if getattr(u, "created_at", None) else None,
            }
            email = str(u.email or "").lower()
            if owner_id and u.id == owner_id:
                row["reason"] = "platform_owner"
                protected_users.append(row)
            elif email in {"zmn8@ya.ru"}:
                row["reason"] = "protected_demo_email"
                protected_users.append(row)
            elif email.endswith("@example.com") or email.endswith("@test.local") or "company_admin" in email or "invite_" in email or "global_admin" in email or "new_admin" in email or "owner_recover" in email or "dev_member" in email:
                row["reason"] = "test_email_pattern"
                test_users.append(row)
            elif u.full_name and any(m in str(u.full_name).lower() for m in ("company admin", "global admin", "новый админ", "иван иванов")):
                row["reason"] = "test_name_marker"
                test_users.append(row)
            elif u.tenant_id in {1, 2, 21}:
                row["reason"] = "protected_demo_tenant_user"
                protected_users.append(row)
            else:
                row["reason"] = "unknown_review"
                unknown_users.append(row)

        memberships = db.query(func.count()).select_from(TenantUserMembership).scalar()
        profiles = db.query(func.count()).select_from(TenantUserProfile).scalar()
        test_memberships = (
            db.query(func.count())
            .select_from(TenantUserMembership)
            .filter(~TenantUserMembership.tenant_id.in_([1, 2, 21]))
            .scalar()
        )
        test_profiles = (
            db.query(func.count())
            .select_from(TenantUserProfile)
            .filter(~TenantUserProfile.tenant_id.in_([1, 2, 21]))
            .scalar()
        )

        report = {
            "protected_tenants": protected,
            "test_tenants": test_tenants,
            "protected_users": protected_users,
            "test_users": test_users,
            "unknown_users": unknown_users,
            "counts": {
                "portals_total": len(portals),
                "protected_tenants": len(protected),
                "test_tenants": len(test_tenants),
                "visible_users": len(users),
                "protected_users": len(protected_users),
                "test_users": len(test_users),
                "unknown_users": len(unknown_users),
                "memberships_total": memberships,
                "profiles_total": profiles,
                "test_memberships": test_memberships,
                "test_profiles": test_profiles,
            },
            "platform_owner": (
                None
                if owner is None
                else {
                    "id": owner.id,
                    "email": owner.email,
                    "is_active": owner.is_active,
                    "tenant_id": owner.tenant_id,
                }
            ),
            "purge_candidates_tenant_ids": [t["id"] for t in test_tenants],
            "purge_candidates_user_ids": [u["id"] for u in test_users],
        }
        print(json.dumps(report, ensure_ascii=False, indent=2, default=str))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
