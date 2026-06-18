"""Tenant-scoped Superadmin resolution and assignment."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.portals.schemas import CompanySuperadminRead
from app.modules.tenant_roles.constants import TENANT_ADMIN, TENANT_SUPERADMIN
from app.modules.tenant_roles.role_registry import resolve_tenant_role_id
from app.modules.tenant_users.constants import (
    ACTIVE_MEMBERSHIP_STATUSES,
    MEMBERSHIP_STATUS_ACTIVE,
    MEMBERSHIP_STATUS_DISMISSED,
)
from app.modules.tenant_users.membership_service import (
    get_tenant_membership,
    restore_membership,
    upsert_active_membership,
)
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.tenant_users.profile_service import (
    ensure_tenant_user_profile,
    get_tenant_user_profile,
    profile_to_public_dict,
)
from app.modules.users.models import User


def get_active_tenant_superadmin_membership(
    db: Session,
    tenant_id: int,
) -> TenantUserMembership | None:
    return (
        db.query(TenantUserMembership)
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.role_key == TENANT_SUPERADMIN)
        .filter(TenantUserMembership.membership_status.in_(ACTIVE_MEMBERSHIP_STATUSES))
        .order_by(TenantUserMembership.id.asc())
        .first()
    )


def user_is_active_tenant_superadmin(db: Session, *, tenant_id: int, user: User) -> bool:
    membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user.id)
    if membership is None:
        return False
    if membership.membership_status not in ACTIVE_MEMBERSHIP_STATUSES:
        return False
    return str(membership.role_key or "").strip().lower() == TENANT_SUPERADMIN


def resolve_company_superadmin_read(db: Session, tenant_id: int) -> CompanySuperadminRead | None:
    membership = get_active_tenant_superadmin_membership(db, tenant_id)
    if membership is None:
        return None

    user = db.get(User, membership.user_id)
    if user is None:
        return None

    profile = get_tenant_user_profile(db, tenant_id=tenant_id, user_id=user.id)
    profile_data = profile_to_public_dict(profile)

    return CompanySuperadminRead(
        user_id=user.id,
        full_name=profile_data.get("display_name") or user.full_name,
        email=user.email,
        phone=profile_data.get("phone") or user.phone,
        position=profile_data.get("position") or user.position,
        is_active=bool(user.is_active)
        and membership.membership_status == MEMBERSHIP_STATUS_ACTIVE,
        last_login_at=user.last_login_at,
        role=TENANT_SUPERADMIN,
        role_label="Superadmin",
        is_owner=False,
    )


def _apply_tenant_role_to_user_if_legacy(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    role_id: int,
) -> None:
    if user.tenant_id == tenant_id:
        user.role_id = role_id
        db.add(user)


def demote_other_tenant_superadmins(
    db: Session,
    *,
    tenant_id: int,
    keep_user_id: int,
) -> list[int]:
    demoted_user_ids: list[int] = []
    admin_role_id = resolve_tenant_role_id(db, TENANT_ADMIN)

    memberships = (
        db.query(TenantUserMembership)
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.role_key == TENANT_SUPERADMIN)
        .filter(TenantUserMembership.membership_status.in_(ACTIVE_MEMBERSHIP_STATUSES))
        .all()
    )

    for membership in memberships:
        if int(membership.user_id) == int(keep_user_id):
            continue

        user = db.get(User, membership.user_id)
        if user is not None:
            user.is_company_owner = False
            _apply_tenant_role_to_user_if_legacy(
                db,
                tenant_id=tenant_id,
                user=user,
                role_id=admin_role_id,
            )
            db.add(user)

        upsert_active_membership(
            db,
            tenant_id=tenant_id,
            user_id=membership.user_id,
            role_key=TENANT_ADMIN,
        )
        demoted_user_ids.append(int(membership.user_id))

    return demoted_user_ids


def assign_tenant_superadmin(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    profile_payload: dict | None = None,
) -> User:
    demote_other_tenant_superadmins(db, tenant_id=tenant_id, keep_user_id=user.id)

    user.is_active = True
    user.is_company_owner = False
    db.add(user)

    membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user.id)
    if membership is not None and membership.membership_status == MEMBERSHIP_STATUS_DISMISSED:
        restore_membership(db, membership, role_key=TENANT_SUPERADMIN)
    else:
        upsert_active_membership(
            db,
            tenant_id=tenant_id,
            user_id=user.id,
            role_key=TENANT_SUPERADMIN,
        )

    payload = profile_payload or {"full_name": user.full_name}
    ensure_tenant_user_profile(
        db,
        tenant_id=tenant_id,
        user=user,
        payload=payload,
    )
    return user
