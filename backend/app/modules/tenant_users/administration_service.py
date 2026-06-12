"""Tenant-scoped user administration service."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.security import hash_password
from app.modules.tenant_roles.constants import TENANT_SYSTEM_ROLES
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import Role, User
from app.modules.users.router import generate_temp_password, send_invite_email


def _get_tenant_user(db: Session, *, tenant_id: int, user_id: int) -> User | None:
    return (
        db.query(User)
        .filter(User.id == user_id)
        .filter(User.tenant_id == tenant_id)
        .filter(User.is_hidden_user.is_(False))
        .one_or_none()
    )


def list_tenant_users(db: Session, tenant_id: int) -> list[User]:
    return (
        db.query(User)
        .filter(User.tenant_id == tenant_id)
        .filter(User.is_hidden_user.is_(False))
        .order_by(User.id.asc())
        .all()
    )


def list_tenant_system_roles(db: Session) -> list[Role]:
    roles = (
        db.query(Role)
        .filter(Role.name.in_(tuple(TENANT_SYSTEM_ROLES)))
        .order_by(Role.id.asc())
        .all()
    )
    by_name = {role.name: role for role in roles}
    return [by_name[name] for name in sorted(TENANT_SYSTEM_ROLES) if name in by_name]


def _resolve_tenant_role(db: Session, role_id: int | None) -> Role:
    if role_id is None:
        raise HTTPException(status_code=400, detail="role_id обязателен")

    role = db.query(Role).filter(Role.id == role_id).one_or_none()
    if role is None or role.name not in TENANT_SYSTEM_ROLES:
        raise HTTPException(status_code=400, detail="Недопустимая роль компании")

    return role


def _sync_membership_role(db: Session, *, tenant_id: int, user: User, role: Role) -> None:
    membership = (
        db.query(TenantUserMembership)
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.user_id == user.id)
        .one_or_none()
    )

    if membership is None:
        membership = TenantUserMembership(
            tenant_id=tenant_id,
            user_id=user.id,
            role_key=role.name,
            is_active=True,
        )
        db.add(membership)
    else:
        membership.role_key = role.name
        membership.is_active = True
        db.add(membership)


def create_tenant_user(
    db: Session,
    *,
    tenant_id: int,
    payload: dict,
) -> tuple[User, str | None]:
    email = str(payload.get("email") or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email обязателен")

    existing = db.query(User).filter(User.email.ilike(email)).first()
    if existing is not None:
        raise HTTPException(status_code=400, detail="Email уже используется")

    role = _resolve_tenant_role(db, payload.get("role_id"))
    password = payload.get("password") or generate_temp_password()
    temp_password = None if payload.get("password") else password

    user = User(
        email=email,
        full_name=payload.get("full_name"),
        phone=payload.get("phone"),
        position=payload.get("position"),
        department=payload.get("department"),
        city=payload.get("city"),
        manager=payload.get("manager"),
        mentor=payload.get("mentor"),
        avatar_url=payload.get("avatar_url"),
        avatar_settings=payload.get("avatar_settings"),
        is_active=payload.get("is_active", True),
        tenant_id=tenant_id,
        role_id=role.id,
        is_company_owner=False,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.flush()
    _sync_membership_role(db, tenant_id=tenant_id, user=user, role=role)
    db.commit()
    db.refresh(user)
    return user, temp_password


def update_tenant_user(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    payload: dict,
) -> User:
    user = _get_tenant_user(db, tenant_id=tenant_id, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    allowed_fields = {
        "full_name",
        "phone",
        "position",
        "department",
        "city",
        "manager",
        "mentor",
        "is_active",
        "avatar_url",
        "avatar_settings",
    }

    for field, value in payload.items():
        if field in allowed_fields:
            setattr(user, field, value)

    if "role_id" in payload and payload.get("role_id") is not None:
        role = _resolve_tenant_role(db, payload.get("role_id"))
        user.role_id = role.id
        _sync_membership_role(db, tenant_id=tenant_id, user=user, role=role)

    password = payload.get("password")
    if password:
        user.hashed_password = hash_password(password)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_tenant_user(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    current_user: User,
) -> int:
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")

    user = _get_tenant_user(db, tenant_id=tenant_id, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if bool(getattr(user, "is_company_owner", False)):
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить владельца компании",
        )

    deleted_user_id = user.id
    db.delete(user)
    db.commit()
    return deleted_user_id


def send_tenant_user_invite(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> dict:
    user = _get_tenant_user(db, tenant_id=tenant_id, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if not user.email:
        raise HTTPException(status_code=400, detail="У пользователя не указан email")

    temp_password = generate_temp_password()
    send_invite_email(
        to_email=user.email,
        login=user.email,
        password=temp_password,
    )

    user.hashed_password = hash_password(temp_password)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "ok",
        "message": "Приглашение отправлено",
        "email": user.email,
    }
