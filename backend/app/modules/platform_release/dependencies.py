"""Access control for platform release pipeline."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.platform_event_journal.seed_classification import resolve_dev_tenant_portal_id
from app.modules.tenant_roles.access import (
    can_access_designer,
    is_platform_owner,
    is_tenant_scoped_user,
    user_can_access_designer,
)
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User


def _is_platform_reviewer_user(user: User) -> bool:
    if is_platform_owner(user):
        return True
    if is_tenant_scoped_user(user):
        return False
    role_name = (user.role.name if user.role else "").strip().lower()
    return role_name in {"admin", "superadmin"}


def require_platform_reviewer(
    current_user: User = Depends(get_current_user),
) -> User:
    """Platform admin / owner — review, approve, publish, offer."""
    if not _is_platform_reviewer_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для управления платформой",
        )
    return current_user


def require_release_developer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """
    DEV developer — create, edit, submit for review.
    Platform reviewers also qualify.
    """
    if _is_platform_reviewer_user(current_user):
        return current_user

    if not user_can_access_designer(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для работы с релизами платформы",
        )

    dev_tenant_id = resolve_dev_tenant_portal_id(db)
    if dev_tenant_id is None or not user_has_tenant_access(db, current_user, dev_tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для работы с релизами в DEV",
        )

    return current_user


def assert_reviewer_action(actor: User) -> None:
    """Block non-platform-reviewer users from reviewer-only service actions."""
    if not _is_platform_reviewer_user(actor):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только Platform reviewer может выполнить это действие",
        )
