"""Safe recovery helpers for demo global users deleted by platform-users-reset."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.portals.models import Portal
from app.modules.tenant_users.administration_service import create_tenant_user
from app.modules.tenant_users.membership_service import find_global_user_by_email, normalize_email
from app.modules.users.models import Role, User


@dataclass(frozen=True)
class DemoUserRecoverySpec:
    email: str
    full_name: str
    display_name: str
    role_name: str
    is_company_owner: bool = False


DEMO_GLOBAL_USERS_TO_RESTORE: tuple[DemoUserRecoverySpec, ...] = ()


@dataclass(frozen=True)
class DemoUserRecoveryPlanItem:
    email: str
    action: str
    tenant_id: int | None = None
    user_id: int | None = None
    details: str | None = None


def resolve_recovery_tenant_id(db: Session) -> int:
    dev_portal = (
        db.query(Portal)
        .filter(Portal.tenant_type == "DEV")
        .order_by(Portal.id.asc())
        .first()
    )
    if dev_portal is not None:
        return int(dev_portal.id)

    fallback = db.query(Portal).order_by(Portal.id.asc()).first()
    if fallback is None:
        raise RuntimeError("No tenant portal found for demo user recovery")
    return int(fallback.id)


def _resolve_role_id(db: Session, role_name: str) -> int:
    role = db.query(Role).filter(Role.name == role_name).one_or_none()
    if role is None:
        raise RuntimeError(f"Role '{role_name}' is missing")
    return int(role.id)


def plan_demo_global_users_recovery(db: Session) -> list[DemoUserRecoveryPlanItem]:
    tenant_id = resolve_recovery_tenant_id(db)
    plan: list[DemoUserRecoveryPlanItem] = []

    for spec in DEMO_GLOBAL_USERS_TO_RESTORE:
        normalized = normalize_email(spec.email)
        existing = find_global_user_by_email(db, normalized)
        if existing is not None:
            plan.append(
                DemoUserRecoveryPlanItem(
                    email=normalized,
                    action="skip_exists",
                    tenant_id=tenant_id,
                    user_id=existing.id,
                    details="user already present in users",
                )
            )
            continue

        plan.append(
            DemoUserRecoveryPlanItem(
                email=normalized,
                action="create_user_with_membership",
                tenant_id=tenant_id,
                details=f"role={spec.role_name}, company_owner={spec.is_company_owner}",
            )
        )

    return plan


def restore_demo_global_users(
    db: Session,
    *,
    dry_run: bool = True,
    confirm: bool = False,
) -> list[DemoUserRecoveryPlanItem]:
    plan = plan_demo_global_users_recovery(db)
    if dry_run or not confirm:
        return plan

    tenant_id = resolve_recovery_tenant_id(db)
    for spec, item in zip(DEMO_GLOBAL_USERS_TO_RESTORE, plan, strict=True):
        if item.action != "create_user_with_membership":
            continue

        role_id = _resolve_role_id(db, spec.role_name)
        payload = {
            "email": spec.email,
            "full_name": spec.full_name,
            "display_name": spec.display_name,
            "role_id": role_id,
            "is_active": True,
            "password": "DemoRestore2026!",
        }
        user_data, _ = create_tenant_user(db, tenant_id=tenant_id, payload=payload)
        user = db.get(User, user_data["id"])
        if user is not None and spec.is_company_owner:
            user.is_company_owner = True
            db.flush()

    return plan
