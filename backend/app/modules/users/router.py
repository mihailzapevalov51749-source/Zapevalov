from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

import logging
import os
import secrets
import smtplib
import socket
import string
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.security import hash_password, verify_password
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import PlatformEventJournalSource
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_event_journal.service import record_platform_event
from app.modules.tenant_users.membership_access import list_active_tenant_memberships
from app.modules.users.bootstrap_owner_service import (
    ensure_bootstrap_owner_recovery,
    is_bootstrap_owner,
    is_visible_platform_user,
)
from app.modules.users.models import Role, User
from app.modules.users.schemas import ChangePasswordRequest, UserResponse, UserUpdate

router = APIRouter(tags=["Users"])

PORTAL_LOGIN_URL = os.getenv("PORTAL_LOGIN_URL", "http://localhost:5173/login")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM") or SMTP_USER


def generate_temp_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def build_invite_email_message(to_email: str, login: str, password: str) -> MIMEText:
    subject = "Приглашение в систему ЯсноПро"

    body = f"""Здравствуйте!

Для вас создана учётная запись в системе ЯсноПро.

ЯсноПро — платформа для совместной работы, управления задачами, коммуникаций и организации рабочих процессов.

Для входа используйте следующие данные:

Ссылка для входа:
{PORTAL_LOGIN_URL}

Логин:
{login}

Временный пароль:
{password}

После первого входа рекомендуем изменить пароль в настройках профиля.

Если у вас возникли вопросы или сложности со входом, обратитесь к администратору системы.

С уважением,
Команда ЯсноПро
"""

    message = MIMEText(body, "plain", "utf-8")
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = to_email
    return message


def send_invite_email(to_email: str, login: str, password: str):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD or not SMTP_FROM:
        raise HTTPException(
            status_code=500,
            detail="SMTP не настроен. Проверьте SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM.",
        )

    message = build_invite_email_message(to_email, login, password)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
    except smtplib.SMTPAuthenticationError as error:
        logger.exception("SMTP authentication failed for invite to %s", to_email)
        raise HTTPException(
            status_code=500,
            detail="Ошибка SMTP-аутентификации. Проверьте пароль приложения и доступ к SMTP.",
        ) from error
    except (TimeoutError, socket.timeout) as error:
        logger.exception("SMTP timeout for invite to %s", to_email)
        raise HTTPException(
            status_code=500,
            detail="Таймаут SMTP. Сервер не ответил вовремя. Попробуйте позже.",
        ) from error
    except (smtplib.SMTPConnectError, ConnectionRefusedError, OSError) as error:
        logger.exception("SMTP connection failed for invite to %s", to_email)
        raise HTTPException(
            status_code=500,
            detail="Ошибка подключения к SMTP. Проверьте SMTP_HOST и SMTP_PORT.",
        ) from error
    except smtplib.SMTPException as error:
        logger.exception("SMTP send failed for invite to %s", to_email)
        raise HTTPException(
            status_code=500,
            detail="Ошибка отправки письма. Проверьте настройки SMTP и адрес получателя.",
        ) from error
    except Exception as error:
        logger.exception("Unexpected invite email error for %s", to_email)
        raise HTTPException(
            status_code=500,
            detail="Ошибка отправки письма. Попробуйте позже или обратитесь к администратору.",
        ) from error


def serialize_user(user: User, db: Session | None = None) -> dict:
    tenant_id = getattr(user, "tenant_id", None)
    memberships: list[dict] = []
    is_platform_owner = bool(getattr(user, "is_platform_owner", False))

    if db is not None:
        if not is_platform_owner:
            from app.modules.users.bootstrap_owner_service import user_is_platform_owner

            is_platform_owner = user_is_platform_owner(db, user)

        memberships = [
            {
                "tenant_id": membership.tenant_id,
                "role_key": membership.role_key,
                "is_active": bool(membership.is_active),
            }
            for membership in list_active_tenant_memberships(db, user.id)
        ]

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "position": user.position,
        "department": user.department,
        "city": user.city,
        "manager": user.manager,
        "mentor": user.mentor,
        "avatar_url": user.avatar_url,
        "avatar_settings": user.avatar_settings,
        "is_active": user.is_active,
        "is_system_user": bool(getattr(user, "is_system_user", False)),
        "is_hidden_user": bool(getattr(user, "is_hidden_user", False)),
        "login_disabled": bool(getattr(user, "login_disabled", False)),
        "account_status": getattr(user, "account_status", "active"),
        "tenant_id": tenant_id,
        "tenant_memberships": memberships,
        "is_platform_user": tenant_id is None,
        "is_platform_owner": is_platform_owner,
        "is_company_owner": bool(getattr(user, "is_company_owner", False)),
        "role_id": user.role_id,
        "role": user.role.name if user.role else None,
        "role_description": user.role.description if user.role else None,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def check_admin(user: User):
    if not user.role or user.role.name not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Нет прав доступа")


@router.post("/admin/users")
def admin_create_user(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_admin(current_user)

    if not payload.get("email"):
        raise HTTPException(status_code=400, detail="Email обязателен")

    existing = db.query(User).filter(User.email == payload["email"]).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email уже используется")

    password = payload.get("password") or generate_temp_password()

    user = User(
        email=payload.get("email"),
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
        role_id=payload.get("role_id"),
        hashed_password=hash_password(password),
    )

    db.add(user)
    db.flush()

    if is_visible_platform_user(user):
        record_platform_event(
            db,
            event_code=PlatformEventCode.PLATFORM_USER_CREATED.value,
            event_category=PlatformEventCategory.PLATFORM_USER.value,
            title=f"Создан пользователь платформы {user.email}",
            description=user.full_name,
            status=PlatformAuditStatus.DONE.value,
            source=PlatformEventJournalSource.MANUAL.value,
            actor_user=current_user,
            target_type="platform_user",
            target_id=user.id,
            target_name=user.full_name,
            metadata={"email": user.email, "role_id": user.role_id},
            slug=f"platform-user-created-{user.id}-{int(utc_now().timestamp() * 1000)}",
            commit=False,
        )

    db.commit()
    db.refresh(user)

    result = serialize_user(user)

    if not payload.get("password"):
        result["temp_password"] = password

    return result


@router.post("/admin/users/{user_id}/invite")
def admin_send_user_invite(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_admin(current_user)

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
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


@router.get("/users/me", response_model=UserResponse)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_user(current_user, db)


@router.patch("/users/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = payload.model_dump(exclude_unset=True)

    allowed_fields = {
        "phone",
        "avatar_url",
        "avatar_settings",
    }

    for field, value in update_data.items():
        if field in allowed_fields:
            setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return serialize_user(current_user, db)


@router.patch("/users/me/password")
def change_my_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_password = (payload.current_password or "").strip()
    new_password = (payload.new_password or "").strip()
    confirm_password = (payload.confirm_password or "").strip()

    if not current_password or not new_password or not confirm_password:
        raise HTTPException(status_code=400, detail="Заполните все поля пароля")

    if new_password != confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Новый пароль и повтор пароля не совпадают",
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Пароль должен содержать не менее 8 символов",
        )

    if new_password == current_password:
        raise HTTPException(
            status_code=400,
            detail="Новый пароль должен отличаться от текущего",
        )

    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Текущий пароль указан неверно",
        )

    current_user.hashed_password = hash_password(new_password)
    db.add(current_user)
    db.commit()

    return {
        "status": "ok",
        "message": "Пароль успешно изменён",
    }


@router.get("/users/", response_model=list[UserResponse])
def get_users(
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(User).filter(User.is_hidden_user.is_(False), User.tenant_id.is_(None))

    value = (search or "").strip()

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

    users = query.order_by(User.full_name.asc()).limit(50).all()

    return [serialize_user(user, db) for user in users]


@router.get("/admin/users")
def admin_get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_admin(current_user)

    users = (
        db.query(User)
        .filter(User.is_hidden_user.is_(False), User.tenant_id.is_(None))
        .order_by(User.id.asc())
        .all()
    )

    return [serialize_user(user, db) for user in users]


@router.patch("/admin/users/{user_id}")
def admin_update_user(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_admin(current_user)

    user = db.query(User).filter(User.id == user_id).first()

    if not user or not is_visible_platform_user(user):
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
        "role_id",
        "avatar_url",
        "avatar_settings",
    }

    previous_is_active = bool(user.is_active)

    for field, value in payload.items():
        if field in allowed_fields:
            setattr(user, field, value)

    password = payload.get("password")

    if password:
        user.hashed_password = hash_password(password)

    settings_row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings_row is not None and settings_row.platform_owner_user_id == user.id:
        if payload.get("is_active") is False:
            settings_row.platform_owner_user_id = None
            settings_row.platform_owner_full_name = None
            settings_row.platform_owner_email = None
            settings_row.platform_owner_phone = None
            settings_row.platform_owner_avatar_url = None
            settings_row.platform_owner_avatar_settings = None

    db.add(user)
    ensure_bootstrap_owner_recovery(db)
    db.flush()

    if is_visible_platform_user(user):
        event_code = PlatformEventCode.PLATFORM_USER_UPDATED.value
        if "is_active" in payload and bool(user.is_active) != previous_is_active:
            event_code = (
                PlatformEventCode.PLATFORM_USER_UNBLOCKED.value
                if user.is_active
                else PlatformEventCode.PLATFORM_USER_BLOCKED.value
            )
        record_platform_event(
            db,
            event_code=event_code,
            event_category=PlatformEventCategory.PLATFORM_USER.value,
            title=f"Изменён пользователь платформы {user.email}",
            description=user.full_name,
            status=PlatformAuditStatus.DONE.value,
            source=PlatformEventJournalSource.MANUAL.value,
            actor_user=current_user,
            target_type="platform_user",
            target_id=user.id,
            target_name=user.full_name,
            metadata={"email": user.email, "role_id": user.role_id, "is_active": user.is_active},
            slug=f"platform-user-updated-{user.id}-{int(utc_now().timestamp() * 1000)}",
            commit=False,
        )

    db.commit()
    db.refresh(user)

    return serialize_user(user)


@router.delete("/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_admin(current_user)

    if current_user.id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить самого себя",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден",
        )

    if not is_visible_platform_user(user):
        raise HTTPException(
            status_code=404,
            detail="Пользователь не найден",
        )

    deleted_user_id = user.id
    deleted_email = user.email
    deleted_name = user.full_name

    settings_row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings_row is not None and settings_row.platform_owner_user_id == user.id:
        settings_row.platform_owner_user_id = None
        settings_row.platform_owner_full_name = None
        settings_row.platform_owner_email = None
        settings_row.platform_owner_phone = None
        settings_row.platform_owner_avatar_url = None
        settings_row.platform_owner_avatar_settings = None

    db.delete(user)
    ensure_bootstrap_owner_recovery(db)
    db.flush()

    record_platform_event(
        db,
        event_code=PlatformEventCode.PLATFORM_USER_DELETED.value,
        event_category=PlatformEventCategory.PLATFORM_USER.value,
        title=f"Удалён пользователь платформы {deleted_email}",
        description=deleted_name,
        status=PlatformAuditStatus.DONE.value,
        source=PlatformEventJournalSource.MANUAL.value,
        actor_user=current_user,
        target_type="platform_user",
        target_id=deleted_user_id,
        target_name=deleted_name,
        metadata={"email": deleted_email},
        slug=f"platform-user-deleted-{deleted_user_id}-{int(utc_now().timestamp() * 1000)}",
        commit=False,
    )

    db.commit()

    return {
        "status": "ok",
        "message": "Пользователь удалён",
        "deleted_user_id": deleted_user_id,
    }


@router.get("/admin/roles")
def admin_get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_admin(current_user)

    roles = db.query(Role).order_by(Role.id.asc()).all()

    return [
        {
            "id": role.id,
            "name": role.name,
            "description": role.description,
        }
        for role in roles
    ]