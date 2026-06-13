"""Platform-wide Quality Issues registry access (role isolation, not tenant-bound)."""

from __future__ import annotations

from fastapi import Depends

from app.modules.auth.dependencies import get_current_user
from app.modules.platform.shared.registry_access import ensure_platform_registry_reader
from app.modules.users.models import User

_QUALITY_ISSUES_FORBIDDEN_DETAIL = (
    "Недостаточно прав для доступа к реестру проблем качества платформы"
)


def require_quality_issues_access(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Quality issues are platform-wide data (no tenant_id).

    Allow: platform owner, platform designer roles (admin/superadmin/
    platform_designer/platform_architect without tenant binding).

    Deny: any tenant-scoped user (including tenant admin) and platform users
    without designer access.
    """
    ensure_platform_registry_reader(
        current_user,
        forbidden_detail=_QUALITY_ISSUES_FORBIDDEN_DETAIL,
    )
    return current_user
