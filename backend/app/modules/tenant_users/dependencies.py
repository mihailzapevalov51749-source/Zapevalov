"""Dependencies for tenant administration APIs."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.tenant_roles.access import can_manage_tenant_users
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User


def require_tenant_users_manager(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    if not user_has_tenant_access(db, current_user, tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к компании",
        )

    if not can_manage_tenant_users(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав управления пользователями компании",
        )

    return current_user
