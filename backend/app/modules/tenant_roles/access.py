"""Tenant role and company-owner access helpers."""

from __future__ import annotations

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


def can_access_designer(user: User | None) -> bool:
    if is_platform_owner(user):
        return True

    role_name = resolve_role_name(user)
    if role_name is None:
        return False

    if is_tenant_scoped_user(user):
        return role_name in TENANT_DESIGNER_ROLES

    return role_name in PLATFORM_DESIGNER_ROLES


def can_access_tenant_administration(user: User | None) -> bool:
    if is_platform_owner(user):
        return True

    if not is_tenant_scoped_user(user):
        return False

    role_name = resolve_role_name(user)
    return role_name in TENANT_ADMINISTRATION_ROLES


def can_manage_tenant_users(user: User | None) -> bool:
    if is_platform_owner(user):
        return True

    if not is_tenant_scoped_user(user):
        return False

    role_name = resolve_role_name(user)
    return role_name in TENANT_USER_MANAGEMENT_ROLES


def is_company_owner(user: User | None) -> bool:
    return bool(user and getattr(user, "is_company_owner", False))
