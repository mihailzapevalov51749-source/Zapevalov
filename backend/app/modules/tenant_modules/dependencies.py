"""Access control for tenant modules read API."""

from __future__ import annotations

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.tenant_modules.constants import TENANT_MODULE_READER_ROLES
from app.modules.tenant_roles.access import is_platform_owner, is_tenant_scoped_user, resolve_role_name
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User


def _is_platform_admin_user(user: User) -> bool:
    if is_platform_owner(user):
        return True

    if is_tenant_scoped_user(user):
        return False

    role_name = (user.role.name if user.role else "").strip().lower()
    return role_name in {"admin", "superadmin"}


def _is_tenant_modules_reader(db: Session, user: User, tenant_id: int) -> bool:
    if _is_platform_admin_user(user):
        return True

    if not user_has_tenant_access(db, user, tenant_id):
        return False

    role_name = resolve_role_name(user)
    return role_name in TENANT_MODULE_READER_ROLES


def require_tenant_modules_reader(
    tenant_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> int:
    if not _is_tenant_modules_reader(db, current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра модулей компании",
        )
    return tenant_id


def require_tenant_modules_reader_or_platform_admin(
    tenant_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> int:
    """Alias kept for clarity; platform admins are included in reader check."""
    return require_tenant_modules_reader(tenant_id=tenant_id, db=db, current_user=current_user)
