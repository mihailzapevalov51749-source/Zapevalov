from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.security import create_access_token, hash_password
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_profile.schemas import (
    PlatformOwnerFirstSetupResponse,
    PlatformOwnerRead,
    PlatformOwnerUpsert,
)
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import PlatformEventJournalSource
from app.modules.platform_event_journal.service import record_platform_event
from app.modules.control_plane.platform_users.registry_service import (
    sync_platform_owner_to_registry,
)
from app.modules.users.bootstrap_owner_constants import USER_ACCOUNT_STATUS_ACTIVE
from app.modules.users.bootstrap_owner_service import (
    disable_bootstrap_owner,
    has_real_platform_owner,
    is_bootstrap_owner,
)
from app.modules.users.models import Role, User

PLATFORM_OWNER_LEGACY_ROLE = "superadmin"


def _resolve_superadmin_role_id(db: Session) -> int:
    role = (
        db.query(Role)
        .filter(Role.name == PLATFORM_OWNER_LEGACY_ROLE)
        .first()
    )
    if role is None:
        raise HTTPException(
            status_code=500,
            detail="Роль Platform Owner (superadmin) не найдена в системе",
        )
    return role.id


def _find_legacy_platform_owner_user(db: Session) -> User | None:
    return (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.name == PLATFORM_OWNER_LEGACY_ROLE)
        .filter(User.is_hidden_user.is_(False))
        .order_by(User.id.asc())
        .first()
    )


def _resolve_owner_user(db: Session, row: PlatformSettings) -> User | None:
    if row.platform_owner_user_id is None:
        return None

    user = db.get(User, row.platform_owner_user_id)
    if user is None or is_bootstrap_owner(user):
        return None

    return user


def _serialize_owner(db: Session, row: PlatformSettings) -> PlatformOwnerRead | None:
    if not row.platform_owner_user_id and not row.platform_owner_email:
        return None

    user = _resolve_owner_user(db, row)
    is_active = bool(user.is_active) if user is not None else None
    position = user.position if user is not None else None
    avatar_url = user.avatar_url if user is not None else row.platform_owner_avatar_url
    avatar_settings = (
        user.avatar_settings if user is not None else row.platform_owner_avatar_settings
    )

    return PlatformOwnerRead(
        user_id=row.platform_owner_user_id,
        full_name=row.platform_owner_full_name,
        email=row.platform_owner_email,
        phone=row.platform_owner_phone,
        position=position,
        avatar_url=avatar_url,
        avatar_settings=avatar_settings,
        is_active=is_active,
        exists=row.platform_owner_user_id is not None and has_real_platform_owner(db),
        updated_at=row.updated_at,
    )


def bootstrap_platform_owner_from_legacy(db: Session, row: PlatformSettings) -> PlatformSettings:
    if row.platform_owner_user_id is not None:
        linked = db.get(User, row.platform_owner_user_id)
        if linked is not None and not is_bootstrap_owner(linked):
            return row
        row.platform_owner_user_id = None

    legacy_owner = _find_legacy_platform_owner_user(db)
    if legacy_owner is None or is_bootstrap_owner(legacy_owner):
        return row

    row.platform_owner_user_id = legacy_owner.id
    row.platform_owner_full_name = legacy_owner.full_name
    row.platform_owner_email = legacy_owner.email
    row.platform_owner_phone = legacy_owner.phone
    row.updated_at = utc_now()
    db.flush()
    return row


def get_platform_owner(db: Session, row: PlatformSettings) -> PlatformOwnerRead | None:
    if not has_real_platform_owner(db):
        return None

    row = bootstrap_platform_owner_from_legacy(db, row)
    return _serialize_owner(db, row)


def _ensure_email_available(db: Session, email: str, *, exclude_user_id: int | None = None) -> None:
    normalized_email = str(email or "").strip().lower()
    if not normalized_email:
        raise HTTPException(status_code=400, detail="Email обязателен")

    query = db.query(User).filter(User.email.ilike(normalized_email))
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)

    if query.first() is not None:
        raise HTTPException(status_code=400, detail="Email уже используется")


def _sync_owner_user_from_row(
    db: Session,
    row: PlatformSettings,
    user: User,
    *,
    position: str | None = None,
) -> User:
    user.full_name = str(row.platform_owner_full_name or "").strip() or None
    user.email = str(row.platform_owner_email or "").strip()
    user.phone = str(row.platform_owner_phone or "").strip() or None
    user.position = str(position or "").strip() or None
    user.is_active = True
    user.login_disabled = False
    user.is_hidden_user = False
    user.is_system_user = False
    user.account_status = USER_ACCOUNT_STATUS_ACTIVE
    user.role_id = _resolve_superadmin_role_id(db)
    db.flush()
    return user


def upsert_platform_owner(
    db: Session,
    row: PlatformSettings,
    payload: PlatformOwnerUpsert,
    *,
    current_user: User | None = None,
) -> PlatformOwnerRead:
    row = bootstrap_platform_owner_from_legacy(db, row)
    is_create = not has_real_platform_owner(db)

    full_name = str(payload.full_name or "").strip()
    email = str(payload.email or "").strip()
    phone = str(payload.phone or "").strip() or None
    position = str(payload.position or "").strip() or None

    if not full_name:
        raise HTTPException(status_code=400, detail="ФИО обязательно")

    if is_create:
        if not payload.password or not payload.password_confirm:
            raise HTTPException(status_code=400, detail="Укажите пароль и подтверждение пароля")
        if payload.password != payload.password_confirm:
            raise HTTPException(status_code=400, detail="Пароли не совпадают")
        if len(payload.password) < 8:
            raise HTTPException(status_code=400, detail="Пароль должен содержать не менее 8 символов")

        if has_real_platform_owner(db):
            raise HTTPException(
                status_code=409,
                detail="Владелец платформы уже существует. Используйте сохранение изменений.",
            )

        _ensure_email_available(db, email)

        user = User(
            email=email,
            full_name=full_name,
            phone=phone,
            position=position,
            is_active=True,
            role_id=_resolve_superadmin_role_id(db),
            hashed_password=hash_password(payload.password),
            account_status=USER_ACCOUNT_STATUS_ACTIVE,
        )
        db.add(user)
        db.flush()

        row.platform_owner_user_id = user.id
        journal_title = "Создан владелец платформы"
        journal_description = (
            "Через профиль платформы создан владелец и автоматически создан пользователь "
            "платформы с ролью Platform Owner."
        )
    else:
        user = db.get(User, row.platform_owner_user_id)
        if user is None or is_bootstrap_owner(user):
            raise HTTPException(status_code=404, detail="Связанный пользователь владельца не найден")

        _ensure_email_available(db, email, exclude_user_id=user.id)
        journal_title = "Обновлён владелец платформы"
        journal_description = (
            "Изменены данные владельца платформы. Связанный пользователь платформы обновлён автоматически."
        )

    row.platform_owner_full_name = full_name
    row.platform_owner_email = email
    row.platform_owner_phone = phone
    row.updated_at = utc_now()

    user = _sync_owner_user_from_row(
        db,
        row,
        db.get(User, row.platform_owner_user_id),
        position=position,
    )

    if not is_create and payload.password:
        if not payload.password_confirm:
            raise HTTPException(status_code=400, detail="Укажите подтверждение пароля")
        if payload.password != payload.password_confirm:
            raise HTTPException(status_code=400, detail="Пароли не совпадают")
        if len(payload.password) < 8:
            raise HTTPException(status_code=400, detail="Пароль должен содержать не менее 8 символов")
        user.hashed_password = hash_password(payload.password)

    if is_create:
        disable_bootstrap_owner(db)

    record_platform_event(
        db,
        event_code=(
            PlatformEventCode.PLATFORM_OWNER_CREATED.value
            if is_create
            else PlatformEventCode.PLATFORM_OWNER_UPDATED.value
        ),
        event_category=PlatformEventCategory.PLATFORM_OWNER.value,
        title=journal_title,
        description=journal_description,
        status=PlatformAuditStatus.DONE.value,
        source=PlatformEventJournalSource.MANUAL.value,
        actor_user=current_user if current_user and not is_bootstrap_owner(current_user) else None,
        actor_name=current_user.full_name if current_user else None,
        target_type="platform_owner",
        target_id=user.id,
        target_name=full_name,
        metadata={"email": email},
        slug=f"platform-owner-{'created' if is_create else 'updated'}-{int(utc_now().timestamp() * 1000)}",
        commit=False,
    )

    sync_platform_owner_to_registry(db, row)
    db.flush()
    return _serialize_owner(db, row)


def create_first_platform_owner(
    db: Session,
    row: PlatformSettings,
    payload: PlatformOwnerUpsert,
    *,
    current_user: User | None = None,
) -> PlatformOwnerFirstSetupResponse:
    if has_real_platform_owner(db):
        raise HTTPException(status_code=409, detail="Владелец платформы уже назначен")

    if current_user is None or not is_bootstrap_owner(current_user):
        raise HTTPException(
            status_code=403,
            detail="Первичное создание владельца доступно только через Bootstrap Owner",
        )

    owner = upsert_platform_owner(db, row, payload, current_user=current_user)

    created_user = db.get(User, owner.user_id)
    if created_user is None:
        raise HTTPException(status_code=500, detail="Не удалось создать пользователя владельца")

    access_token = create_access_token({"sub": str(created_user.id)})
    return PlatformOwnerFirstSetupResponse(
        owner=owner,
        access_token=access_token,
    )
