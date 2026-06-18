from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.auth.security import hash_password
from app.modules.control_plane.global_users.constants import (
    GLOBAL_STATUS_ACTIVE,
    GLOBAL_STATUS_BLOCKED,
)
from app.modules.portals.models import Portal
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.user_activity.service import (
    get_last_session_started_at,
    get_last_session_started_at_map,
)
from app.modules.users.bootstrap_owner_service import is_bootstrap_owner
from app.modules.users.models import User


def _resolve_global_status(user: User) -> str:
    return GLOBAL_STATUS_ACTIVE if bool(user.is_active) else GLOBAL_STATUS_BLOCKED


def _resolve_display_name(user: User) -> str:
    full_name = str(user.full_name or "").strip()
    if full_name:
        return full_name
    return str(user.email or "").strip() or f"User #{user.id}"


def _membership_counts_by_user_id(db: Session) -> dict[int, int]:
    rows = (
        db.query(TenantUserMembership.user_id, func.count(TenantUserMembership.id))
        .group_by(TenantUserMembership.user_id)
        .all()
    )
    return {int(user_id): int(count) for user_id, count in rows}


def _serialize_memberships(
    db: Session,
    user_id: int,
) -> list[dict]:
    rows = (
        db.query(TenantUserMembership, Portal)
        .join(Portal, TenantUserMembership.tenant_id == Portal.id)
        .filter(TenantUserMembership.user_id == user_id)
        .order_by(Portal.name.asc(), Portal.id.asc())
        .all()
    )

    return [
        {
            "tenant_id": membership.tenant_id,
            "tenant_name": portal.name,
            "tenant_code": portal.code,
            "role_key": membership.role_key,
            "membership_status": membership.membership_status,
            "is_active": bool(membership.is_active),
        }
        for membership, portal in rows
    ]


def _serialize_global_user(
    user: User,
    *,
    companies_count: int,
    companies: list[dict] | None = None,
    last_login_at=None,
) -> dict:
    payload = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "display_name": _resolve_display_name(user),
        "avatar_url": user.avatar_url,
        "avatar_settings": user.avatar_settings,
        "is_active": bool(user.is_active),
        "global_status": _resolve_global_status(user),
        "created_at": user.created_at,
        "last_login_at": last_login_at,
        "companies_count": companies_count,
    }
    if companies is not None:
        payload["companies"] = companies
    return payload


def _get_visible_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None or is_bootstrap_owner(user) or bool(user.is_hidden_user):
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


def list_global_users(db: Session) -> list[dict]:
    counts = _membership_counts_by_user_id(db)
    users = (
        db.query(User)
        .filter(User.is_hidden_user.is_(False))
        .order_by(User.id.asc())
        .all()
    )

    visible_users = [user for user in users if not is_bootstrap_owner(user)]
    session_map = get_last_session_started_at_map(db, [user.id for user in visible_users])

    result: list[dict] = []
    for user in visible_users:
        result.append(
            _serialize_global_user(
                user,
                companies_count=counts.get(user.id, 0),
                last_login_at=session_map.get(user.id),
            )
        )
    return result


def get_global_user(db: Session, user_id: int) -> dict:
    user = _get_visible_user(db, user_id)
    companies = _serialize_memberships(db, user.id)
    return _serialize_global_user(
        user,
        companies_count=len(companies),
        companies=companies,
        last_login_at=get_last_session_started_at(db, user.id),
    )


def update_global_user_status(db: Session, user_id: int, *, is_active: bool) -> dict:
    user = _get_visible_user(db, user_id)
    user.is_active = bool(is_active)
    db.flush()
    companies = _serialize_memberships(db, user.id)
    return _serialize_global_user(
        user,
        companies_count=len(companies),
        companies=companies,
        last_login_at=get_last_session_started_at(db, user.id),
    )


def reset_global_user_password(db: Session, user_id: int) -> dict:
    from app.modules.users.router import generate_temp_password, send_invite_email

    user = _get_visible_user(db, user_id)
    if not user.email:
        raise HTTPException(status_code=400, detail="У пользователя не указан email")

    temp_password = generate_temp_password()
    user.hashed_password = hash_password(temp_password)
    db.flush()

    try:
        send_invite_email(
            to_email=user.email,
            login=user.email,
            password=temp_password,
        )
        message = "Новый пароль отправлен на email пользователя"
    except Exception:
        message = "Пароль сброшен. Отправка email недоступна — передайте пароль вручную"

    return {
        "status": "ok",
        "message": message,
        "email": user.email,
    }
