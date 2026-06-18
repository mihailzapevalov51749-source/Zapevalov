#!/usr/bin/env python3
"""Read-only dry-run audit for recover_platform_owner.py --execute (no DB writes)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_users.constants import PLATFORM_ROLE_OWNER, PLATFORM_STATUS_ACTIVE
from app.modules.control_plane.platform_users.models import PlatformUser
from app.modules.users.bootstrap_owner_constants import BOOTSTRAP_OWNER_EMAIL
from app.modules.users.bootstrap_owner_service import find_bootstrap_owner
from app.modules.users.models import Role, User


def _next_user_id(db) -> int | None:
    row = db.execute(text("SELECT nextval(pg_get_serial_sequence('users', 'id'))")).one_or_none()
    if row is not None:
        return int(row[0])
    max_id = db.execute(text("SELECT COALESCE(MAX(id), 0) + 1 FROM users")).scalar()
    return int(max_id) if max_id else None


def main() -> int:
    db = SessionLocal()
    try:
        row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
        if row is None:
            print(json.dumps({"error": "platform_settings singleton missing"}, ensure_ascii=False, indent=2))
            return 1

        email = str(row.platform_owner_email or "").strip().lower()
        existing = db.query(User).filter(User.email.ilike(email)).one_or_none() if email else None
        bootstrap = find_bootstrap_owner(db)
        superadmin = db.query(Role).filter(Role.name == "superadmin").first()
        predicted_user_id = existing.id if existing else _next_user_id(db)

        platform_user_for_owner = None
        if row.platform_owner_user_id:
            platform_user_for_owner = (
                db.query(PlatformUser).filter(PlatformUser.user_id == row.platform_owner_user_id).first()
            )
        platform_user_for_predicted = None
        if predicted_user_id:
            platform_user_for_predicted = (
                db.query(PlatformUser).filter(PlatformUser.user_id == predicted_user_id).first()
            )

        tables_affected: list[str] = []
        creates: list[dict] = []
        updates: list[dict] = []
        deletes: list[dict] = []

        if existing is None:
            # Branch: CREATE new global user
            tables_affected.extend(["users", "platform_settings", "platform_users"])
            creates.append(
                {
                    "table": "users",
                    "predicted_id": predicted_user_id,
                    "email": email,
                    "full_name": row.platform_owner_full_name,
                    "phone": row.platform_owner_phone,
                    "tenant_id": None,
                    "is_active": True,
                    "is_hidden_user": False,
                    "is_system_user": False,
                    "login_disabled": False,
                    "account_status": "active",
                    "role_id": superadmin.id if superadmin else "(create superadmin role first)",
                    "hashed_password": "(set via YASNOPRO_RECOVER_OWNER_PASSWORD or generated)",
                }
            )
            updates.append(
                {
                    "table": "platform_settings",
                    "id": PLATFORM_SETTINGS_SINGLETON_ID,
                    "field": "platform_owner_user_id",
                    "before": row.platform_owner_user_id,
                    "after": predicted_user_id,
                }
            )
            if not row.platform_owner_full_name:
                updates.append(
                    {
                        "table": "platform_settings",
                        "id": PLATFORM_SETTINGS_SINGLETON_ID,
                        "field": "platform_owner_full_name",
                        "before": row.platform_owner_full_name,
                        "after": "(from new user.full_name)",
                    }
                )
            if not row.platform_owner_phone:
                updates.append(
                    {
                        "table": "platform_settings",
                        "id": PLATFORM_SETTINGS_SINGLETON_ID,
                        "field": "platform_owner_phone",
                        "before": row.platform_owner_phone,
                        "after": "(from new user.phone)",
                    }
                )
            if platform_user_for_predicted is None:
                creates.append(
                    {
                        "table": "platform_users",
                        "user_id": predicted_user_id,
                        "platform_role": PLATFORM_ROLE_OWNER,
                        "status": PLATFORM_STATUS_ACTIVE,
                    }
                )
            else:
                updates.append(
                    {
                        "table": "platform_users",
                        "id": platform_user_for_predicted.id,
                        "user_id": predicted_user_id,
                        "fields": {
                            "platform_role": PLATFORM_ROLE_OWNER,
                            "status": PLATFORM_STATUS_ACTIVE,
                        },
                    }
                )
        else:
            # Branch: RELINK existing user
            tables_affected.extend(["users", "platform_settings", "platform_users"])
            user_updates: dict = {}
            if row.platform_owner_user_id != existing.id:
                updates.append(
                    {
                        "table": "platform_settings",
                        "id": PLATFORM_SETTINGS_SINGLETON_ID,
                        "field": "platform_owner_user_id",
                        "before": row.platform_owner_user_id,
                        "after": existing.id,
                    }
                )
            if existing.tenant_id is not None:
                user_updates["tenant_id"] = {"before": existing.tenant_id, "after": None}
            for field, after in [
                ("is_active", True),
                ("login_disabled", False),
                ("is_hidden_user", False),
                ("is_system_user", False),
                ("account_status", "active"),
                ("role_id", superadmin.id if superadmin else None),
            ]:
                before = getattr(existing, field)
                if before != after:
                    user_updates[field] = {"before": before, "after": after}
            if user_updates:
                updates.append(
                    {
                        "table": "users",
                        "id": existing.id,
                        "email": existing.email,
                        "fields": user_updates,
                    }
                )
            pu = db.query(PlatformUser).filter(PlatformUser.user_id == existing.id).first()
            if pu is None:
                creates.append(
                    {
                        "table": "platform_users",
                        "user_id": existing.id,
                        "platform_role": PLATFORM_ROLE_OWNER,
                        "status": PLATFORM_STATUS_ACTIVE,
                    }
                )
            else:
                pu_updates = {}
                if pu.platform_role != PLATFORM_ROLE_OWNER:
                    pu_updates["platform_role"] = {"before": pu.platform_role, "after": PLATFORM_ROLE_OWNER}
                if pu.status != PLATFORM_STATUS_ACTIVE:
                    pu_updates["status"] = {"before": pu.status, "after": PLATFORM_STATUS_ACTIVE}
                if pu_updates:
                    updates.append(
                        {
                            "table": "platform_users",
                            "id": pu.id,
                            "user_id": existing.id,
                            "fields": pu_updates,
                        }
                    )

        if bootstrap is not None and bool(bootstrap.is_active) and not bool(bootstrap.login_disabled):
            tables_affected.append("users")
            tables_affected.append("platform_event_journal_entries")
            updates.append(
                {
                    "table": "users",
                    "id": bootstrap.id,
                    "email": bootstrap.email,
                    "action": "disable_bootstrap_owner",
                    "fields": {
                        "is_active": {"before": bootstrap.is_active, "after": False},
                        "login_disabled": {"before": bootstrap.login_disabled, "after": True},
                    },
                }
            )
            creates.append(
                {
                    "table": "platform_event_journal_entries",
                    "event_code": "bootstrap_owner_disabled",
                    "target_id": bootstrap.id,
                    "note": "only if bootstrap was enabled for login",
                }
            )

        if superadmin is None:
            tables_affected.append("roles")
            creates.append(
                {
                    "table": "roles",
                    "name": "superadmin",
                    "description": "Platform Owner",
                    "note": "created by _resolve_superadmin_role_id if missing",
                }
            )

        tables_affected = sorted(set(tables_affected))

        report = {
            "mode": "READ_ONLY_DRY_RUN",
            "db_writes": False,
            "current_state": {
                "platform_settings": {
                    "id": PLATFORM_SETTINGS_SINGLETON_ID,
                    "platform_owner_email": row.platform_owner_email,
                    "platform_owner_full_name": row.platform_owner_full_name,
                    "platform_owner_phone": row.platform_owner_phone,
                    "platform_owner_user_id": row.platform_owner_user_id,
                },
                "owner_user": (
                    None
                    if existing is None
                    else {
                        "id": existing.id,
                        "email": existing.email,
                        "tenant_id": existing.tenant_id,
                        "is_active": existing.is_active,
                        "login_disabled": existing.login_disabled,
                    }
                ),
                "bootstrap_owner": (
                    None
                    if bootstrap is None
                    else {
                        "id": bootstrap.id,
                        "email": bootstrap.email,
                        "is_active": bootstrap.is_active,
                        "login_disabled": bootstrap.login_disabled,
                    }
                ),
                "superadmin_role_id": superadmin.id if superadmin else None,
                "platform_users_for_owner": (
                    None
                    if platform_user_for_predicted is None and platform_user_for_owner is None
                    else {
                        "by_current_owner_user_id": (
                            None
                            if platform_user_for_owner is None
                            else {
                                "id": platform_user_for_owner.id,
                                "user_id": platform_user_for_owner.user_id,
                                "platform_role": platform_user_for_owner.platform_role,
                                "status": platform_user_for_owner.status,
                            }
                        ),
                        "by_predicted_owner": (
                            None
                            if platform_user_for_predicted is None
                            else {
                                "id": platform_user_for_predicted.id,
                                "user_id": platform_user_for_predicted.user_id,
                                "platform_role": platform_user_for_predicted.platform_role,
                                "status": platform_user_for_predicted.status,
                            }
                        ),
                    }
                ),
            },
            "execute_plan": {
                "branch": "CREATE_NEW_USER" if existing is None else "RELINK_EXISTING_USER",
                "user_to_restore": {
                    "email": email,
                    "action": "create" if existing is None else "relink_and_activate",
                    "predicted_or_existing_user_id": predicted_user_id,
                },
                "platform_owner_user_id_after": predicted_user_id,
                "tables_affected": tables_affected,
                "rows_created": creates,
                "rows_updated": updates,
                "rows_deleted": deletes,
            },
        }

        print(json.dumps(report, ensure_ascii=False, indent=2, default=str))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
