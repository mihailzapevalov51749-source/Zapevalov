"""Shared role gates for platform-wide registries (no tenant_id boundary)."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.modules.auth.dependencies import get_current_user
from app.modules.tenant_roles.access import (
    can_access_designer,
    is_platform_owner,
    is_tenant_scoped_user,
)
from app.modules.users.models import User

PLATFORM_REGISTRY_FORBIDDEN_DETAIL = (
    "Недостаточно прав для доступа к platform-wide данным платформы"
)


def ensure_platform_registry_reader(
    user: User | None,
    *,
    forbidden_detail: str = PLATFORM_REGISTRY_FORBIDDEN_DETAIL,
) -> None:
    if is_platform_owner(user):
        return

    if is_tenant_scoped_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=forbidden_detail,
        )

    if not can_access_designer(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=forbidden_detail,
        )


def require_platform_registry_read_access(
    current_user: User = Depends(get_current_user),
) -> User:
    ensure_platform_registry_reader(current_user)
    return current_user
