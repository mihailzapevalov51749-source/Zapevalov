"""Platform-scoped Event Journal API access (role isolation, not tenant-bound)."""

from __future__ import annotations

from fastapi import Depends

from app.modules.auth.dependencies import get_current_user
from app.modules.control_plane.dependencies import require_platform_admin
from app.modules.platform.shared.registry_access import ensure_platform_registry_reader
from app.modules.users.models import User

_PLATFORM_EVENT_JOURNAL_FORBIDDEN_DETAIL = (
    "Недостаточно прав для доступа к журналу событий платформы"
)


def require_platform_event_journal_read_access(
    current_user: User = Depends(get_current_user),
) -> User:
    ensure_platform_registry_reader(
        current_user,
        forbidden_detail=_PLATFORM_EVENT_JOURNAL_FORBIDDEN_DETAIL,
    )
    return current_user


require_platform_event_journal_write_access = require_platform_admin
