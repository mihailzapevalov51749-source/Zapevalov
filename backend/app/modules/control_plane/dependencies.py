from fastapi import Depends, HTTPException, status

from app.modules.auth.dependencies import get_current_user
from app.modules.tenant_roles.access import is_platform_owner, is_tenant_scoped_user
from app.modules.users.models import User


def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    if is_platform_owner(current_user):
        return current_user

    if is_tenant_scoped_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для управления платформой",
        )

    role_name = (current_user.role.name if current_user.role else "").strip().lower()

    if role_name not in {"admin", "superadmin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для управления платформой",
        )

    return current_user
