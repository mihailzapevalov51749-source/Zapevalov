"""Demo cleanup service — hard purge confirmed test leaks only."""

from __future__ import annotations

import os
from dataclasses import dataclass

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_management.delete_tenant import purge_tenant_hard
from app.modules.tenant_management.demo_environment_audit import assert_demo_environment_clean
from app.modules.tenant_management.demo_test_leak_policy import (
    demo_test_leak_tenant_reason,
    demo_test_leak_user_reason,
    is_demo_test_leak_tenant_candidate,
    is_demo_test_leak_user_candidate,
)
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.user_management.demo_user_inventory import delete_confirmed_test_user, list_visible_users
from app.modules.users.models import User


@dataclass(frozen=True)
class DemoCleanupPlan:
    tenants: list[dict]
    users: list[dict]


@dataclass(frozen=True)
class DemoCleanupResult:
    purged_tenant_ids: list[int]
    deleted_user_ids: list[int]
    errors: list[str]


def build_demo_cleanup_plan(db: Session) -> DemoCleanupPlan:
    tenant_rows: list[dict] = []
    for portal in db.query(Portal).order_by(Portal.id.asc()).all():
        reason = demo_test_leak_tenant_reason(portal)
        if reason is None:
            continue
        memberships = (
            db.query(func.count())
            .select_from(TenantUserMembership)
            .filter(TenantUserMembership.tenant_id == portal.id)
            .scalar()
            or 0
        )
        profiles = (
            db.query(func.count())
            .select_from(TenantUserProfile)
            .filter(TenantUserProfile.tenant_id == portal.id)
            .scalar()
            or 0
        )
        users = (
            db.query(func.count())
            .select_from(User)
            .filter(User.tenant_id == portal.id)
            .scalar()
            or 0
        )
        tenant_rows.append(
            {
                "id": portal.id,
                "code": portal.code,
                "title": portal.name,
                "tenant_type": portal.tenant_type,
                "environment_role": portal.environment_role,
                "is_protected": bool(portal.is_protected),
                "status": portal.tenant_status,
                "reason": reason,
                "memberships": memberships,
                "profiles": profiles,
                "tenant_scoped_users": users,
            }
        )

    user_rows: list[dict] = []
    for user in list_visible_users(db):
        reason = demo_test_leak_user_reason(db, user)
        if reason is None:
            continue
        user_rows.append(
            {
                "id": user.id,
                "email": user.email,
                "tenant_id": user.tenant_id,
                "is_active": bool(user.is_active),
                "reason": reason,
            }
        )

    return DemoCleanupPlan(tenants=tenant_rows, users=user_rows)


def _require_hard_delete_env() -> None:
    if os.environ.get("YASNOPRO_ALLOW_TENANT_HARD_DELETE") != "1":
        raise RuntimeError(
            "Hard delete blocked. Set YASNOPRO_ALLOW_TENANT_HARD_DELETE=1 and pass --confirm.",
        )


def execute_demo_cleanup(db: Session, *, confirm: bool) -> DemoCleanupResult:
    if not confirm:
        raise RuntimeError("Refusing demo cleanup without confirm=True")
    _require_hard_delete_env()

    plan = build_demo_cleanup_plan(db)
    purged: list[int] = []
    errors: list[str] = []

    for item in plan.tenants:
        tenant_id = int(item["id"])
        portal = db.get(Portal, tenant_id)
        if portal is None or not is_demo_test_leak_tenant_candidate(portal):
            errors.append(f"tenant {tenant_id}: no longer a confirmed leak candidate")
            continue
        try:
            purge_tenant_hard(db, tenant_id, confirm=True)
            purged.append(tenant_id)
        except Exception as exc:
            db.rollback()
            errors.append(f"tenant {tenant_id}: {exc}")

    deleted_users: list[int] = []
    for item in plan.users:
        user = db.get(User, int(item["id"]))
        if user is None:
            continue
        if not is_demo_test_leak_user_candidate(db, user):
            errors.append(f"user {item['id']}: no longer a confirmed leak candidate")
            continue
        try:
            deleted_users.append(delete_confirmed_test_user(db, user))
        except Exception as exc:
            db.rollback()
            errors.append(f"user {item['id']}: {exc}")

    if deleted_users:
        db.commit()

    if not errors:
        assert_demo_environment_clean(db)

    return DemoCleanupResult(
        purged_tenant_ids=purged,
        deleted_user_ids=deleted_users,
        errors=errors,
    )
