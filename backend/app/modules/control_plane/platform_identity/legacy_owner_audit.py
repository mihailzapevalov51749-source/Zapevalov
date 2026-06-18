"""Audit helpers for legacy Platform Owner resolution (pre-migration)."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.users.bootstrap_owner_service import get_real_platform_owner_user
from app.modules.users.models import User


@dataclass(frozen=True)
class LegacyPlatformOwnerAudit:
    """Resolved legacy Platform Owner chain for backfill preparation."""

    platform_settings_id: int
    platform_owner_user_id: int
    user_id: int
    email: str
    full_name: str | None
    phone: str | None
    avatar_url: str | None
    avatar_settings: dict | None
    is_active: bool
    login_disabled: bool
    account_status: str
    tenant_id: int | None
    hashed_password_present: bool

    @property
    def status_label(self) -> str:
        if not self.is_active or self.login_disabled:
            return "inactive"
        return self.account_status or "active"


def resolve_legacy_platform_owner_audit(db: Session) -> LegacyPlatformOwnerAudit | None:
    """Resolve Platform Owner via platform_settings.platform_owner_user_id (SoT)."""
    settings_row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if settings_row is None or settings_row.platform_owner_user_id is None:
        return None

    user = get_real_platform_owner_user(db, settings_row)
    if user is None:
        raw_user = db.get(User, settings_row.platform_owner_user_id)
        if raw_user is None:
            return None
        user = raw_user

    return LegacyPlatformOwnerAudit(
        platform_settings_id=settings_row.id,
        platform_owner_user_id=settings_row.platform_owner_user_id,
        user_id=user.id,
        email=str(user.email or ""),
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        avatar_settings=user.avatar_settings,
        is_active=bool(user.is_active),
        login_disabled=bool(getattr(user, "login_disabled", False)),
        account_status=str(getattr(user, "account_status", "active") or "active"),
        tenant_id=getattr(user, "tenant_id", None),
        hashed_password_present=bool(user.hashed_password),
    )
