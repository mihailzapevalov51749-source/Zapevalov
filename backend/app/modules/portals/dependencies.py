"""Portal access dependencies."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.portals import service
from app.modules.tenant_roles.access import (
    can_access_tenant_administration,
    is_platform_owner,
    is_tenant_scoped_user,
)
from app.modules.tenant_roles.constants import (
    LEGACY_TENANT_ROLE_ALIASES,
    TENANT_ADMINISTRATION_ROLES,
)
from app.modules.tenant_users.constants import ACTIVE_MEMBERSHIP_STATUSES
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import User

TENANT_COMPANY_SETTINGS_FORBIDDEN_DETAIL = (
    "Недостаточно прав для управления настройками компании"
)


def _resolve_membership_role_key(membership: TenantUserMembership) -> str:
    raw = str(membership.role_key or "").strip().lower()
    return LEGACY_TENANT_ROLE_ALIASES.get(raw, raw)


def user_can_manage_tenant_company_settings(
    db: Session,
    user: User,
    tenant_id: int,
) -> bool:
    if is_platform_owner(user):
        return True

    if not user_has_tenant_access(db, user, tenant_id):
        return False

    membership = (
        db.query(TenantUserMembership)
        .filter(TenantUserMembership.user_id == user.id)
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.membership_status.in_(ACTIVE_MEMBERSHIP_STATUSES))
        .first()
    )
    if membership is not None:
        return _resolve_membership_role_key(membership) in TENANT_ADMINISTRATION_ROLES

    if is_tenant_scoped_user(user) and int(user.tenant_id) == int(tenant_id):
        return can_access_tenant_administration(user)

    return False


def _is_platform_level_admin(user: User) -> bool:
    if is_platform_owner(user):
        return True

    if is_tenant_scoped_user(user):
        return False

    role_name = (user.role.name if user.role else "").strip().lower()
    return role_name in {"admin", "superadmin"}


def require_portal_profile_read_access(
    portal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    portal = service.get_portal(db, portal_id)
    if portal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тенант (portal) не найден",
        )

    if _is_platform_level_admin(current_user):
        return current_user

    if user_can_manage_tenant_company_settings(db, current_user, portal_id):
        return current_user

    if user_has_tenant_access(db, current_user, portal_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=TENANT_COMPANY_SETTINGS_FORBIDDEN_DETAIL,
        )

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Нет доступа к компании",
    )


def require_portal_profile_manage_access(
    portal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    return require_portal_profile_read_access(portal_id, db=db, current_user=current_user)
