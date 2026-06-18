"""Tenant vs platform service identity resolution for tenant-scoped UI."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.tenant_roles.access import is_tenant_scoped_user
from app.modules.users.bootstrap_owner_service import user_is_platform_owner
from app.modules.users.models import User

IDENTITY_CONTEXT_TENANT_MEMBER = "tenant_member"
IDENTITY_CONTEXT_PLATFORM_SERVICE = "platform_service_access"

PLATFORM_OWNER_ROLE_LABEL = "Platform Owner"
PLATFORM_OWNER_SERVICE_DESCRIPTION = "Служебный доступ владельца платформы"
PLATFORM_ADMIN_ROLE_LABEL = "Platform Administrator"
PLATFORM_ADMIN_SERVICE_DESCRIPTION = "Служебный доступ администратора платформы"

PLATFORM_SERVICE_ROLES = frozenset({"admin", "superadmin"})


def has_platform_service_access(db: Session, user: User) -> bool:
    if user_is_platform_owner(db, user):
        return True

    if is_tenant_scoped_user(user):
        return False

    role_name = (user.role.name if user.role else "").strip().lower()
    return role_name in PLATFORM_SERVICE_ROLES


def resolve_identity_context(
    db: Session,
    *,
    user: User,
    has_active_membership: bool,
) -> str:
    if has_active_membership:
        return IDENTITY_CONTEXT_TENANT_MEMBER

    if has_platform_service_access(db, user):
        return IDENTITY_CONTEXT_PLATFORM_SERVICE

    return ""
