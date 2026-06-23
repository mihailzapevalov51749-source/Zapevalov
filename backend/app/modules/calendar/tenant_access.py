"""Tenant isolation for company-scoped calendar."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.session_bridge.runtime_actor_access import (
    assert_runtime_actor_has_tenant_access,
)
from app.modules.control_plane.platform_identity.session_bridge.runtime_auth import (
    RuntimeDesignerActor,
)
from app.modules.tenant_users.membership_access import user_has_tenant_access
from app.modules.users.models import User

CALENDAR_TENANT_FORBIDDEN_DETAIL = "Нет доступа к компании"
CALENDAR_PARTICIPANT_FORBIDDEN_DETAIL = "Пользователь принадлежит другой компании"
CALENDAR_PARTICIPANT_HIDDEN_DETAIL = "Пользователь недоступен"


def assert_user_has_calendar_tenant_access(
    db: Session,
    current_user: User | RuntimeDesignerActor,
    tenant_id: int,
) -> int:
    return assert_runtime_actor_has_tenant_access(db, current_user, tenant_id)


def get_user_for_calendar_tenant(
    db: Session,
    *,
    user_id: int,
    tenant_id: int,
) -> User:
    user = db.query(User).filter(User.id == int(user_id)).one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    assert_user_belongs_to_calendar_tenant(user, tenant_id)
    return user


def assert_user_belongs_to_calendar_tenant(
    user: User,
    tenant_id: int,
) -> None:
    if bool(getattr(user, "is_hidden_user", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=CALENDAR_PARTICIPANT_HIDDEN_DETAIL,
        )

    user_tenant_id = getattr(user, "tenant_id", None)
    if user_tenant_id is None or int(user_tenant_id) != int(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=CALENDAR_PARTICIPANT_FORBIDDEN_DETAIL,
        )


def assert_participant_ids_belong_to_tenant(
    db: Session,
    *,
    tenant_id: int,
    participant_ids: list[int],
) -> None:
    normalized_ids = sorted({int(user_id) for user_id in participant_ids if user_id})
    for user_id in normalized_ids:
        get_user_for_calendar_tenant(db, user_id=user_id, tenant_id=tenant_id)


def search_tenant_calendar_users(
    db: Session,
    *,
    tenant_id: int,
    search: str | None = None,
    limit: int = 50,
) -> list[User]:
    query = (
        db.query(User)
        .filter(User.is_hidden_user.is_(False))
        .filter(User.tenant_id == int(tenant_id))
    )

    value = str(search or "").strip()
    if value:
        search_pattern_start = f"{value}%"
        search_pattern_word = f"% {value}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern_start),
                User.full_name.ilike(search_pattern_word),
                User.email.ilike(search_pattern_start),
            )
        )

    return query.order_by(User.full_name.asc()).limit(limit).all()
