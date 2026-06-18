"""Recover platform owner user from platform_settings when users row is missing."""

from __future__ import annotations

import os
from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.security import hash_password
from app.modules.control_plane.platform_profile.constants import PLATFORM_SETTINGS_SINGLETON_ID
from app.modules.control_plane.platform_profile.models import PlatformSettings
from app.modules.control_plane.platform_profile.owner_service import _resolve_superadmin_role_id
from app.modules.control_plane.platform_users.registry_service import sync_platform_owner_to_registry
from app.modules.users.bootstrap_owner_constants import USER_ACCOUNT_STATUS_ACTIVE
from app.modules.users.bootstrap_owner_service import disable_bootstrap_owner
from app.modules.users.models import User
from app.modules.users.provisioning_credentials import generate_provisioning_password


@dataclass(frozen=True)
class RecoverPlatformOwnerResult:
    created: bool
    user_id: int
    email: str
    temporary_password_set: bool


def _normalize_owner_email(row: PlatformSettings) -> str:
    email = str(row.platform_owner_email or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=400,
            detail="platform_settings.platform_owner_email не задан — восстановление невозможно",
        )
    return email


def recover_platform_owner(
    db: Session,
    *,
    temporary_password: str | None = None,
    commit: bool = True,
) -> RecoverPlatformOwnerResult:
    row = db.get(PlatformSettings, PLATFORM_SETTINGS_SINGLETON_ID)
    if row is None:
        raise HTTPException(status_code=500, detail="platform_settings singleton отсутствует")

    email = _normalize_owner_email(row)
    existing = db.query(User).filter(User.email.ilike(email)).one_or_none()

    if existing is not None:
        if row.platform_owner_user_id != existing.id:
            row.platform_owner_user_id = existing.id
            row.platform_owner_full_name = existing.full_name or row.platform_owner_full_name
            row.platform_owner_phone = existing.phone or row.platform_owner_phone
        if existing.tenant_id is not None:
            existing.tenant_id = None
        existing.is_active = True
        existing.login_disabled = False
        existing.is_hidden_user = False
        existing.is_system_user = False
        existing.account_status = USER_ACCOUNT_STATUS_ACTIVE
        existing.role_id = _resolve_superadmin_role_id(db)
        db.add(existing)
        disable_bootstrap_owner(db)
        sync_platform_owner_to_registry(db, row)
        if commit:
            db.commit()
            db.refresh(existing)
        return RecoverPlatformOwnerResult(
            created=False,
            user_id=existing.id,
            email=existing.email,
            temporary_password_set=False,
        )

    password = (
        str(temporary_password or "").strip()
        or str(os.getenv("YASNOPRO_RECOVER_OWNER_PASSWORD", "")).strip()
        or generate_provisioning_password()
    )
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Временный пароль должен быть не короче 8 символов",
        )

    user = User(
        email=email,
        full_name=str(row.platform_owner_full_name or "").strip() or None,
        phone=str(row.platform_owner_phone or "").strip() or None,
        hashed_password=hash_password(password),
        is_active=True,
        is_hidden_user=False,
        is_system_user=False,
        login_disabled=False,
        account_status=USER_ACCOUNT_STATUS_ACTIVE,
        tenant_id=None,
        role_id=_resolve_superadmin_role_id(db),
    )
    db.add(user)
    db.flush()

    row.platform_owner_user_id = user.id
    if not row.platform_owner_full_name:
        row.platform_owner_full_name = user.full_name
    if not row.platform_owner_phone:
        row.platform_owner_phone = user.phone

    disable_bootstrap_owner(db)
    sync_platform_owner_to_registry(db, row)

    if commit:
        db.commit()
        db.refresh(user)

    return RecoverPlatformOwnerResult(
        created=True,
        user_id=user.id,
        email=user.email,
        temporary_password_set=True,
    )
