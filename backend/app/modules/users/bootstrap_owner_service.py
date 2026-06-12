from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.modules.auth.security import hash_password
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.users.bootstrap_owner_constants import (
    BOOTSTRAP_OWNER_EMAIL,
    BOOTSTRAP_OWNER_FULL_NAME,
    LEGACY_BOOTSTRAP_OWNER_EMAIL,
    USER_ACCOUNT_STATUS_BOOTSTRAP,
    USER_ACCOUNT_STATUS_DISABLED,
    resolve_bootstrap_owner_password,
)
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.platform_event_journal.audit_constants import (
    PlatformAuditStatus,
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.constants import PlatformEventJournalSource
from app.modules.platform_event_journal.service import record_platform_event
from app.modules.users.models import Role, User

logger = logging.getLogger(__name__)

PLATFORM_OWNER_LEGACY_ROLE = "superadmin"


def is_bootstrap_owner(user: User | None) -> bool:
    if user is None:
        return False
    return bool(getattr(user, "is_system_user", False)) and str(user.email or "").lower() == BOOTSTRAP_OWNER_EMAIL


def is_visible_platform_user(user: User | None) -> bool:
    if user is None:
        return False
    if getattr(user, "tenant_id", None) is not None:
        return False
    return not bool(getattr(user, "is_hidden_user", False))


def _resolve_superadmin_role_id(db: Session) -> int:
    role = db.query(Role).filter(Role.name == PLATFORM_OWNER_LEGACY_ROLE).first()
    if role is None:
        role = Role(name=PLATFORM_OWNER_LEGACY_ROLE, description="Platform Owner")
        db.add(role)
        db.flush()
    return role.id


def find_bootstrap_owner(db: Session) -> User | None:
    return (
        db.query(User)
        .filter(User.email.ilike(BOOTSTRAP_OWNER_EMAIL))
        .first()
    )


def _find_legacy_bootstrap_owner(db: Session) -> User | None:
    return (
        db.query(User)
        .filter(User.email.ilike(LEGACY_BOOTSTRAP_OWNER_EMAIL))
        .first()
    )


def _reconcile_legacy_bootstrap_email(db: Session) -> User | None:
    current_user = find_bootstrap_owner(db)
    legacy_user = _find_legacy_bootstrap_owner(db)

    if legacy_user is None:
        return current_user

    if current_user is not None and current_user.id != legacy_user.id:
        db.delete(legacy_user)
        db.flush()
        logger.info(
            "Removed duplicate legacy Bootstrap Owner: %s",
            LEGACY_BOOTSTRAP_OWNER_EMAIL,
        )
        return current_user

    legacy_user.email = BOOTSTRAP_OWNER_EMAIL
    legacy_user.is_system_user = True
    legacy_user.is_hidden_user = True
    db.flush()
    logger.info(
        "Bootstrap Owner email migrated: %s -> %s",
        LEGACY_BOOTSTRAP_OWNER_EMAIL,
        BOOTSTRAP_OWNER_EMAIL,
    )
    return legacy_user


def get_real_platform_owner_user(db: Session, row: PlatformSettings | None = None) -> User | None:
    settings_row = row or db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings_row is None or settings_row.platform_owner_user_id is None:
        return None

    user = db.get(User, settings_row.platform_owner_user_id)
    if user is None or is_bootstrap_owner(user):
        return None
    if not user.is_active or bool(getattr(user, "login_disabled", False)):
        return None
    return user


def has_real_platform_owner(db: Session) -> bool:
    return get_real_platform_owner_user(db) is not None


def user_is_platform_owner(db: Session, user: User | None) -> bool:
    if user is None:
        return False

    owner = get_real_platform_owner_user(db)
    return owner is not None and owner.id == user.id


def attach_platform_owner_flag(db: Session, user: User) -> User:
    setattr(user, "is_platform_owner", user_is_platform_owner(db, user))
    return user


def _apply_bootstrap_owner_state(user: User, *, role_id: int, enabled_for_login: bool) -> User:
    user.full_name = BOOTSTRAP_OWNER_FULL_NAME
    user.role_id = role_id
    user.is_system_user = True
    user.is_hidden_user = True
    user.is_active = enabled_for_login
    user.login_disabled = not enabled_for_login
    user.account_status = (
        USER_ACCOUNT_STATUS_BOOTSTRAP if enabled_for_login else USER_ACCOUNT_STATUS_DISABLED
    )
    return user


def ensure_bootstrap_owner(db: Session, *, commit: bool = False) -> User:
    role_id = _resolve_superadmin_role_id(db)
    user = _reconcile_legacy_bootstrap_email(db)
    password = resolve_bootstrap_owner_password()

    created_new = False
    was_login_disabled = bool(user.login_disabled) if user is not None else False

    if user is None:
        user = User(
            email=BOOTSTRAP_OWNER_EMAIL,
            hashed_password=hash_password(password),
        )
        db.add(user)
        db.flush()
        created_new = True
        logger.info("Bootstrap Owner created: %s", BOOTSTRAP_OWNER_EMAIL)
    elif not user.hashed_password:
        user.hashed_password = hash_password(password)

    needs_login = not has_real_platform_owner(db)
    _apply_bootstrap_owner_state(user, role_id=role_id, enabled_for_login=needs_login)
    db.flush()

    if created_new:
        record_platform_event(
            db,
            event_code=PlatformEventCode.BOOTSTRAP_OWNER_CREATED.value,
            event_category=PlatformEventCategory.BOOTSTRAP.value,
            title="Создан Bootstrap Owner",
            description="Системный Bootstrap Owner создан для первичной инициализации платформы.",
            status=PlatformAuditStatus.DONE.value,
            source=PlatformEventJournalSource.MANUAL.value,
            actor_user=user,
            target_type="bootstrap_owner",
            target_id=user.id,
            target_name=user.full_name,
            metadata={"email": user.email},
            slug=f"bootstrap-owner-created-{user.id}",
            commit=False,
        )
    elif was_login_disabled and needs_login:
        record_platform_event(
            db,
            event_code=PlatformEventCode.BOOTSTRAP_OWNER_REACTIVATED.value,
            event_category=PlatformEventCategory.BOOTSTRAP.value,
            title="Восстановлен Bootstrap Owner",
            description="Bootstrap Owner снова доступен для аварийного входа.",
            status=PlatformAuditStatus.DONE.value,
            source=PlatformEventJournalSource.MANUAL.value,
            actor_user=user,
            target_type="bootstrap_owner",
            target_id=user.id,
            target_name=user.full_name,
            metadata={"email": user.email},
            slug=f"bootstrap-owner-reactivated-{user.id}-{int(utc_now().timestamp() * 1000)}",
            commit=False,
        )

    if commit:
        db.commit()
        db.refresh(user)

    return user


def disable_bootstrap_owner(db: Session) -> User | None:
    user = find_bootstrap_owner(db)
    if user is None:
        return None

    role_id = _resolve_superadmin_role_id(db)
    was_enabled = bool(user.is_active) and not bool(user.login_disabled)
    _apply_bootstrap_owner_state(user, role_id=role_id, enabled_for_login=False)
    db.flush()

    if was_enabled:
        record_platform_event(
            db,
            event_code=PlatformEventCode.BOOTSTRAP_OWNER_DISABLED.value,
            event_category=PlatformEventCategory.BOOTSTRAP.value,
            title="Отключён Bootstrap Owner",
            description="Bootstrap Owner отключён после назначения реального владельца платформы.",
            status=PlatformAuditStatus.DONE.value,
            source=PlatformEventJournalSource.MANUAL.value,
            actor_user=user,
            target_type="bootstrap_owner",
            target_id=user.id,
            target_name=user.full_name,
            metadata={"email": user.email},
            slug=f"bootstrap-owner-disabled-{user.id}-{int(utc_now().timestamp() * 1000)}",
            commit=False,
        )

    return user


def ensure_bootstrap_owner_recovery(db: Session) -> User | None:
    if has_real_platform_owner(db):
        disable_bootstrap_owner(db)
        return find_bootstrap_owner(db)

    return ensure_bootstrap_owner(db, commit=False)


def build_platform_setup_state(db: Session, current_user: User | None = None) -> dict:
    ensure_bootstrap_owner_recovery(db)
    has_owner = has_real_platform_owner(db)
    bootstrap_user = find_bootstrap_owner(db)

    return {
        "needs_owner_setup": not has_owner,
        "has_real_owner": has_owner,
        "is_bootstrap_session": is_bootstrap_owner(current_user),
        "bootstrap_email": BOOTSTRAP_OWNER_EMAIL if bootstrap_user is not None else None,
    }
