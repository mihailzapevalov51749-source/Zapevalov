"""Tenant-scoped user administration service."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.security import hash_password
from app.modules.tenant_roles.constants import TENANT_SYSTEM_ROLES
from app.modules.tenant_users.constants import (
    MEMBERSHIP_STATUS_ACTIVE,
    MEMBERSHIP_STATUS_DISMISSED,
)
from app.modules.tenant_users.membership_service import (
    dismiss_membership,
    find_global_user_by_email,
    get_tenant_membership,
    lookup_email_for_tenant,
    membership_conflict_detail,
    normalize_email,
    restore_membership,
    upsert_active_membership,
    user_has_other_active_memberships,
)
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.tenant_users.profile_service import (
    ensure_tenant_user_profile,
    get_tenant_user_profile,
    profile_to_public_dict,
    update_tenant_user_profile,
)
from app.modules.users.models import Role, User
from app.modules.portals.public_tenant_url import resolve_company_portal_url_for_tenant
from app.modules.users.router import generate_temp_password, send_invite_email


def _resolve_tenant_role(db: Session, role_id: int | None) -> Role:
    if role_id is None:
        raise HTTPException(status_code=400, detail="role_id обязателен")

    role = db.query(Role).filter(Role.id == role_id).one_or_none()
    if role is None or role.name not in TENANT_SYSTEM_ROLES:
        raise HTTPException(status_code=400, detail="Недопустимая роль компании")

    return role


def _get_tenant_user_row(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    active_only: bool = True,
) -> tuple[User, TenantUserMembership, TenantUserProfile | None] | None:
    query = (
        db.query(User, TenantUserMembership, TenantUserProfile)
        .join(
            TenantUserMembership,
            TenantUserMembership.user_id == User.id,
        )
        .outerjoin(
            TenantUserProfile,
            (TenantUserProfile.user_id == User.id)
            & (TenantUserProfile.tenant_id == tenant_id),
        )
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.user_id == user_id)
        .filter(User.is_hidden_user.is_(False))
    )

    if active_only:
        query = query.filter(TenantUserMembership.membership_status == MEMBERSHIP_STATUS_ACTIVE)

    row = query.one_or_none()
    if row is None:
        return None

    return row[0], row[1], row[2]


def serialize_tenant_admin_user(
    db: Session,
    *,
    user: User,
    membership: TenantUserMembership,
    profile: TenantUserProfile | None,
) -> dict:
    role = db.query(Role).filter(Role.name == membership.role_key).one_or_none()
    profile_data = profile_to_public_dict(profile)
    if not profile_data.get("full_name") and not profile_data.get("display_name"):
        profile_data["full_name"] = user.full_name
        profile_data["display_name"] = user.full_name
    if not profile_data.get("phone"):
        profile_data["phone"] = user.phone
    if not profile_data.get("position"):
        profile_data["position"] = user.position
    if not profile_data.get("department"):
        profile_data["department"] = user.department

    return {
        "id": user.id,
        "email": user.email,
        **profile_data,
        "is_active": membership.membership_status == MEMBERSHIP_STATUS_ACTIVE,
        "membership_status": membership.membership_status,
        "tenant_id": membership.tenant_id,
        "role_id": role.id if role else user.role_id,
        "role": membership.role_key,
        "role_description": role.description if role else None,
        "is_company_owner": bool(getattr(user, "is_company_owner", False)),
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def list_tenant_users(db: Session, tenant_id: int) -> list[dict]:
    rows = (
        db.query(User, TenantUserMembership, TenantUserProfile)
        .join(TenantUserMembership, TenantUserMembership.user_id == User.id)
        .outerjoin(
            TenantUserProfile,
            (TenantUserProfile.user_id == User.id)
            & (TenantUserProfile.tenant_id == tenant_id),
        )
        .filter(TenantUserMembership.tenant_id == tenant_id)
        .filter(TenantUserMembership.membership_status == MEMBERSHIP_STATUS_ACTIVE)
        .filter(User.is_hidden_user.is_(False))
        .order_by(User.id.asc())
        .all()
    )

    users = [
        serialize_tenant_admin_user(db, user=user, membership=membership, profile=profile)
        for user, membership, profile in rows
    ]
    seen_user_ids = {item["id"] for item in users}

    legacy_users = (
        db.query(User)
        .filter(User.tenant_id == tenant_id)
        .filter(User.is_hidden_user.is_(False))
        .order_by(User.id.asc())
        .all()
    )
    for user in legacy_users:
        if user.id in seen_user_ids:
            continue

        membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user.id)
        if membership is not None and membership.membership_status == MEMBERSHIP_STATUS_DISMISSED:
            continue

        role = db.query(Role).filter(Role.id == user.role_id).one_or_none()
        role_key = role.name if role else "user"
        if membership is None:
            membership = TenantUserMembership(
                tenant_id=tenant_id,
                user_id=user.id,
                role_key=role_key,
                is_active=True,
                membership_status=MEMBERSHIP_STATUS_ACTIVE,
            )
        profile = get_tenant_user_profile(db, tenant_id=tenant_id, user_id=user.id)
        users.append(
            serialize_tenant_admin_user(db, user=user, membership=membership, profile=profile)
        )

    return users


def list_tenant_system_roles(db: Session) -> list[Role]:
    roles = (
        db.query(Role)
        .filter(Role.name.in_(tuple(TENANT_SYSTEM_ROLES)))
        .order_by(Role.id.asc())
        .all()
    )
    by_name = {role.name: role for role in roles}
    return [by_name[name] for name in sorted(TENANT_SYSTEM_ROLES) if name in by_name]


def lookup_tenant_user_email(db: Session, *, tenant_id: int, email: str) -> dict:
    return lookup_email_for_tenant(db, tenant_id=tenant_id, email=email)


def _create_global_user(
    db: Session,
    *,
    email: str,
    role: Role,
    payload: dict,
    password: str,
) -> User:
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
        tenant_id=None,
        role_id=None,
        is_company_owner=False,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.flush()
    return user


def _attach_user_to_tenant(
    db: Session,
    *,
    tenant_id: int,
    user: User,
    role: Role,
    payload: dict,
    membership: TenantUserMembership | None = None,
) -> tuple[User, TenantUserProfile]:
    if membership is not None and membership.membership_status == MEMBERSHIP_STATUS_DISMISSED:
        restore_membership(db, membership, role_key=role.name)
    else:
        upsert_active_membership(
            db,
            tenant_id=tenant_id,
            user_id=user.id,
            role_key=role.name,
        )

    profile = ensure_tenant_user_profile(
        db,
        tenant_id=tenant_id,
        user=user,
        payload=payload,
    )
    return user, profile


def create_tenant_user(
    db: Session,
    *,
    tenant_id: int,
    payload: dict,
) -> tuple[dict, str | None]:
    email = normalize_email(str(payload.get("email") or ""))
    if not email:
        raise HTTPException(status_code=400, detail="Email обязателен")

    role = _resolve_tenant_role(db, payload.get("role_id"))
    restore_dismissed = bool(payload.get("restore_dismissed"))
    existing_user = find_global_user_by_email(db, email)
    temp_password = None

    if existing_user is None:
        password = payload.get("password") or generate_temp_password()
        temp_password = None if payload.get("password") else password
        user = _create_global_user(
            db,
            email=email,
            role=role,
            payload=payload,
            password=password,
        )
        membership = upsert_active_membership(
            db,
            tenant_id=tenant_id,
            user_id=user.id,
            role_key=role.name,
        )
        profile = ensure_tenant_user_profile(
            db,
            tenant_id=tenant_id,
            user=user,
            payload=payload,
        )
    else:
        membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=existing_user.id)
        if membership is not None and membership.membership_status == MEMBERSHIP_STATUS_ACTIVE:
            raise HTTPException(
                status_code=409,
                detail=membership_conflict_detail(
                    "membership_active",
                    "Пользователь уже добавлен в эту компанию",
                ),
            )

        if membership is not None and membership.membership_status == MEMBERSHIP_STATUS_DISMISSED:
            if not restore_dismissed:
                raise HTTPException(
                    status_code=409,
                    detail=membership_conflict_detail(
                        "membership_dismissed",
                        "Пользователь ранее работал в этой компании. Требуется восстановление.",
                    ),
                )
            user, profile = _attach_user_to_tenant(
                db,
                tenant_id=tenant_id,
                user=existing_user,
                role=role,
                payload=payload,
                membership=membership,
            )
        else:
            user, profile = _attach_user_to_tenant(
                db,
                tenant_id=tenant_id,
                user=existing_user,
                role=role,
                payload=payload,
                membership=membership,
            )
            membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user.id)

    db.commit()
    db.refresh(user)
    if membership is None:
        membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user.id)
    result = serialize_tenant_admin_user(db, user=user, membership=membership, profile=profile)
    return result, temp_password


def update_tenant_user(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    payload: dict,
) -> dict:
    row = _get_tenant_user_row(db, tenant_id=tenant_id, user_id=user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user, membership, profile = row

    profile_payload = {
        key: payload[key]
        for key in (
            "full_name",
            "phone",
            "position",
            "department",
            "city",
            "manager",
            "mentor",
            "avatar_url",
            "avatar_settings",
        )
        if key in payload
    }

    if "is_active" in payload:
        if payload.get("is_active"):
            restore_membership(db, membership, role_key=membership.role_key)
        else:
            dismiss_membership(db, membership)

    if profile_payload:
        profile = update_tenant_user_profile(
            db,
            tenant_id=tenant_id,
            user_id=user.id,
            payload=profile_payload,
        )

    if "role_id" in payload and payload.get("role_id") is not None:
        role = _resolve_tenant_role(db, payload.get("role_id"))
        membership.role_key = role.name
        if user.tenant_id == tenant_id:
            user.role_id = role.id
        db.add(membership)

    password = payload.get("password")
    if password:
        user.hashed_password = hash_password(password)

    db.add(user)
    db.commit()
    db.refresh(user)
    db.refresh(membership)
    if profile is not None:
        db.refresh(profile)

    return serialize_tenant_admin_user(db, user=user, membership=membership, profile=profile)


def dismiss_tenant_user(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    current_user: User,
) -> dict:
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Нельзя уволить самого себя")

    row = _get_tenant_user_row(db, tenant_id=tenant_id, user_id=user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user, membership, _profile = row

    if bool(getattr(user, "is_company_owner", False)):
        raise HTTPException(
            status_code=400,
            detail="Нельзя уволить владельца компании",
        )

    dismiss_membership(db, membership)

    if user.tenant_id == tenant_id and not user_has_other_active_memberships(
        db,
        user_id=user.id,
        exclude_tenant_id=tenant_id,
    ):
        user.is_active = False
        db.add(user)

    db.commit()
    return {
        "status": "ok",
        "message": "Доступ сотрудника в компании отключён",
        "user_id": user_id,
        "membership_status": MEMBERSHIP_STATUS_DISMISSED,
    }


def restore_tenant_user(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    role_id: int | None = None,
) -> dict:
    membership = get_tenant_membership(db, tenant_id=tenant_id, user_id=user_id)
    if membership is None or membership.membership_status != MEMBERSHIP_STATUS_DISMISSED:
        raise HTTPException(status_code=404, detail="Уволенный сотрудник не найден")

    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    role = _resolve_tenant_role(db, role_id or user.role_id)
    restore_membership(db, membership, role_key=role.name)
    user.is_active = True
    db.add(user)
    db.commit()

    profile = get_tenant_user_profile(db, tenant_id=tenant_id, user_id=user.id)
    return serialize_tenant_admin_user(db, user=user, membership=membership, profile=profile)


def delete_tenant_user(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    current_user: User,
) -> int:
    result = dismiss_tenant_user(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        current_user=current_user,
    )
    return int(result["user_id"])


def send_tenant_user_invite(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> dict:
    row = _get_tenant_user_row(db, tenant_id=tenant_id, user_id=user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user, _membership, _profile = row

    if not user.email:
        raise HTTPException(status_code=400, detail="У пользователя не указан email")

    temp_password = generate_temp_password()
    portal_url = resolve_company_portal_url_for_tenant(db, tenant_id)
    send_invite_email(
        to_email=user.email,
        login=user.email,
        password=temp_password,
        portal_url=portal_url,
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
