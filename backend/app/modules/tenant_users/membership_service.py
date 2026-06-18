"""Tenant membership lifecycle helpers."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.tenant_users.constants import (
    ACTIVE_MEMBERSHIP_STATUSES,
    LOOKUP_OUTCOME_ALREADY_MEMBER,
    LOOKUP_OUTCOME_DISMISSED,
    LOOKUP_OUTCOME_FOUND_EXISTING,
    LOOKUP_OUTCOME_NEW,
    LOOKUP_OUTCOME_NOT_FOUND,
    MEMBERSHIP_STATUS_ACTIVE,
    MEMBERSHIP_STATUS_DISMISSED,
)
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import User


def normalize_email(email: str) -> str:
    return str(email or "").strip().lower()


def find_global_user_by_email(db: Session, email: str) -> User | None:
    normalized = normalize_email(email)
    if not normalized:
        return None

    return db.query(User).filter(User.email.ilike(normalized)).one_or_none()


def get_tenant_membership(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> TenantUserMembership | None:
    return (
        db.query(TenantUserMembership)
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.user_id == user_id)
        .one_or_none()
    )


def _apply_membership_status(membership: TenantUserMembership, status: str) -> None:
    membership.membership_status = status
    membership.is_active = status in ACTIVE_MEMBERSHIP_STATUSES


def upsert_active_membership(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    role_key: str,
) -> TenantUserMembership:
    membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user_id)
    if membership is None:
        membership = TenantUserMembership(
            tenant_id=tenant_id,
            user_id=user_id,
            role_key=role_key,
        )
        db.add(membership)

    membership.role_key = role_key
    _apply_membership_status(membership, MEMBERSHIP_STATUS_ACTIVE)
    db.add(membership)
    db.flush()
    return membership


def dismiss_membership(db: Session, membership: TenantUserMembership) -> None:
    _apply_membership_status(membership, MEMBERSHIP_STATUS_DISMISSED)
    db.add(membership)


def restore_membership(db: Session, membership: TenantUserMembership, *, role_key: str) -> None:
    membership.role_key = role_key
    _apply_membership_status(membership, MEMBERSHIP_STATUS_ACTIVE)
    db.add(membership)


def lookup_email_for_tenant(
    db: Session,
    *,
    tenant_id: int,
    email: str,
) -> dict:
    normalized = normalize_email(email)
    if not normalized:
        raise HTTPException(status_code=400, detail="Email обязателен")

    user = find_global_user_by_email(db, normalized)
    if user is None:
        return {
            "outcome": LOOKUP_OUTCOME_NEW,
            "email": normalized,
        }

    membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user.id)
    if membership is not None and membership.membership_status == MEMBERSHIP_STATUS_ACTIVE:
        return {
            "outcome": LOOKUP_OUTCOME_ALREADY_MEMBER,
            "email": user.email,
        }

    if membership is not None and membership.membership_status == MEMBERSHIP_STATUS_DISMISSED:
        return {
            "outcome": LOOKUP_OUTCOME_DISMISSED,
            "email": user.email,
        }

    return {
        "outcome": LOOKUP_OUTCOME_FOUND_EXISTING,
        "email": user.email,
    }


def user_has_other_active_memberships(
    db: Session,
    *,
    user_id: int,
    exclude_tenant_id: int,
) -> bool:
    return (
        db.query(TenantUserMembership.id)
        .filter(TenantUserMembership.user_id == user_id)
        .filter(TenantUserMembership.tenant_id != exclude_tenant_id)
        .filter(TenantUserMembership.is_active.is_(True))
        .first()
        is not None
    )


def membership_conflict_detail(code: str, message: str) -> dict:
    return {"code": code, "message": message}
