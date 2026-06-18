"""Tenant role and company-owner access helpers."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_roles.constants import (
    LEGACY_TENANT_ROLE_ALIASES,
    PLATFORM_DESIGNER_ROLES,
    TENANT_ADMINISTRATION_ROLES,
    TENANT_DESIGNER_ROLES,
    TENANT_USER_MANAGEMENT_ROLES,
)
from app.modules.users.models import User


def is_platform_owner(user: User | None) -> bool:
    return bool(user and getattr(user, "is_platform_owner", False))


def is_tenant_scoped_user(user: User | None) -> bool:
    return user is not None and getattr(user, "tenant_id", None) is not None


def resolve_role_name(user: User | None) -> str | None:
    if not user or not user.role:
        return None

    normalized = str(user.role.name or "").strip().lower()
    if not normalized:
        return None

    if is_tenant_scoped_user(user):
        return LEGACY_TENANT_ROLE_ALIASES.get(normalized, normalized)

    return normalized


def _resolve_membership_role_key(role_key: str | None) -> str:
    raw = str(role_key or "").strip().lower()
    return LEGACY_TENANT_ROLE_ALIASES.get(raw, raw)


def _collect_active_membership_role_keys(db: Session, user: User) -> set[str]:
    from app.modules.tenant_users.membership_access import list_active_tenant_memberships

    memberships = list_active_tenant_memberships(db, user.id)
    return {
        role_key
        for membership in memberships
        if (role_key := _resolve_membership_role_key(membership.role_key))
    }


def user_has_designer_membership(db: Session, user: User) -> bool:
    role_keys = _collect_active_membership_role_keys(db, user)
    return bool(role_keys.intersection(TENANT_DESIGNER_ROLES))


def user_has_tenant_administration_membership(db: Session, user: User) -> bool:
    role_keys = _collect_active_membership_role_keys(db, user)
    return bool(role_keys.intersection(TENANT_ADMINISTRATION_ROLES))


def user_has_tenant_user_management_membership(db: Session, user: User) -> bool:
    role_keys = _collect_active_membership_role_keys(db, user)
    return bool(role_keys.intersection(TENANT_USER_MANAGEMENT_ROLES))


def can_access_designer(user: User | None) -> bool:
    if is_platform_owner(user):
        return True

    role_name = resolve_role_name(user)
    if role_name is None:
        return False

    if is_tenant_scoped_user(user):
        return role_name in TENANT_DESIGNER_ROLES

    return role_name in PLATFORM_DESIGNER_ROLES


def user_can_access_designer(db: Session, user: User | None) -> bool:
    if user is None:
        return False

    if can_access_designer(user):
        return True

    return user_has_designer_membership(db, user)


def can_access_tenant_administration(user: User | None) -> bool:
    if is_platform_owner(user):
        return True

    if not is_tenant_scoped_user(user):
        return False

    role_name = resolve_role_name(user)
    return role_name in TENANT_ADMINISTRATION_ROLES


def user_can_access_tenant_administration(db: Session, user: User | None) -> bool:
    if user is None:
        return False

    if can_access_tenant_administration(user):
        return True

    return user_has_tenant_administration_membership(db, user)


def can_manage_tenant_users(user: User | None) -> bool:
    if is_platform_owner(user):
        return True

    if not is_tenant_scoped_user(user):
        return False

    role_name = resolve_role_name(user)
    return role_name in TENANT_USER_MANAGEMENT_ROLES


def user_can_manage_tenant_users(db: Session, user: User | None) -> bool:
    if user is None:
        return False

    if can_manage_tenant_users(user):
        return True

    return user_has_tenant_user_management_membership(db, user)


def resolve_active_membership_role_key_for_tenant(
    db: Session,
    user: User,
    tenant_id: int,
) -> str | None:
    from app.modules.tenant_users.constants import ACTIVE_MEMBERSHIP_STATUSES
    from app.modules.tenant_users.models import TenantUserMembership

    membership = (
        db.query(TenantUserMembership)
        .filter(TenantUserMembership.user_id == user.id)
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.membership_status.in_(ACTIVE_MEMBERSHIP_STATUSES))
        .first()
    )
    if membership is None:
        return None

    return _resolve_membership_role_key(membership.role_key)


def user_can_manage_tenant_users_in_tenant(
    db: Session,
    user: User,
    tenant_id: int,
) -> bool:
    if is_platform_owner(user):
        return True

    membership_role_key = resolve_active_membership_role_key_for_tenant(
        db,
        user,
        tenant_id,
    )
    if membership_role_key is not None:
        return membership_role_key in TENANT_USER_MANAGEMENT_ROLES

    if is_tenant_scoped_user(user) and int(user.tenant_id) == int(tenant_id):
        return can_manage_tenant_users(user)

    return False


def is_company_owner(user: User | None) -> bool:
    return bool(user and getattr(user, "is_company_owner", False))
