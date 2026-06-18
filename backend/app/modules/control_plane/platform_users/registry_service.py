from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_users.constants import (
    PLATFORM_ROLE_OWNER,
    PLATFORM_STATUS_ACTIVE,
)
from app.modules.control_plane.platform_users.models import PlatformUser
from app.modules.platform_dashboard.datetime_utils import utc_now
from app.modules.users.bootstrap_owner_service import is_bootstrap_owner
from app.modules.users.models import User


def can_manage_as_platform_user(db: Session, user: User | None) -> bool:
    from app.modules.users.bootstrap_owner_service import is_visible_platform_user

    if user is None:
        return False
    return is_visible_platform_user(user) or is_platform_registry_user(db, user)


def get_platform_user_by_user_id(db: Session, user_id: int) -> PlatformUser | None:
    return db.query(PlatformUser).filter(PlatformUser.user_id == user_id).first()


def is_platform_registry_user(db: Session, user: User | None) -> bool:
    if user is None or is_bootstrap_owner(user):
        return False
    return get_platform_user_by_user_id(db, user.id) is not None


def upsert_platform_user(
    db: Session,
    *,
    user_id: int,
    platform_role: str,
    status: str = PLATFORM_STATUS_ACTIVE,
) -> PlatformUser:
    existing = get_platform_user_by_user_id(db, user_id)
    if existing is not None:
        existing.platform_role = platform_role
        existing.status = status
        existing.updated_at = utc_now()
        db.flush()
        return existing

    row = PlatformUser(
        user_id=user_id,
        platform_role=platform_role,
        status=status,
    )
    db.add(row)
    db.flush()
    return row


def sync_platform_owner_to_registry(
    db: Session,
    row: PlatformSettings | None = None,
) -> PlatformUser | None:
    settings_row = row or db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings_row is None or settings_row.platform_owner_user_id is None:
        return None

    user = db.get(User, settings_row.platform_owner_user_id)
    if user is None or is_bootstrap_owner(user):
        return None

    return upsert_platform_user(
        db,
        user_id=user.id,
        platform_role=PLATFORM_ROLE_OWNER,
        status=PLATFORM_STATUS_ACTIVE,
    )


def serialize_platform_registry_user(db: Session, registry_row: PlatformUser) -> dict:
    from app.modules.users.router import serialize_user

    user = registry_row.user or db.get(User, registry_row.user_id)
    if user is None:
        raise ValueError(f"Platform user registry row {registry_row.id} has no linked user")

    payload = serialize_user(user, db)
    payload["platform_role"] = registry_row.platform_role
    payload["platform_status"] = registry_row.status
    payload["is_platform_registry_user"] = True
    if registry_row.platform_role == PLATFORM_ROLE_OWNER:
        payload["is_platform_owner"] = True
    return payload


def list_platform_users(db: Session, *, sync_owner: bool = True) -> list[dict]:
    if sync_owner:
        sync_platform_owner_to_registry(db)

    rows = (
        db.query(PlatformUser)
        .join(User, PlatformUser.user_id == User.id)
        .filter(User.is_hidden_user.is_(False))
        .order_by(User.id.asc())
        .all()
    )

    result: list[dict] = []
    for registry_row in rows:
        user = registry_row.user or db.get(User, registry_row.user_id)
        if user is None or is_bootstrap_owner(user):
            continue
        result.append(serialize_platform_registry_user(db, registry_row))
    return result
