"""Platform Identity Store service layer (basic operations only)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.models import (
    PlatformCredential,
    PlatformIdentity,
    PlatformRoleBinding,
)
from app.modules.control_plane.platform_identity.repository import (
    PlatformCredentialRepository,
    PlatformIdentityRepository,
    PlatformRoleBindingRepository,
)

_identity_repo = PlatformIdentityRepository()
_role_binding_repo = PlatformRoleBindingRepository()
_credential_repo = PlatformCredentialRepository()


def create_platform_identity(
    db: Session,
    *,
    email: str,
    status: str,
    full_name: str | None = None,
    phone: str | None = None,
    avatar_url: str | None = None,
    avatar_settings: dict | None = None,
    platform_identity_id: uuid.UUID | None = None,
    commit: bool = False,
) -> PlatformIdentity:
    row = _identity_repo.create(
        db,
        email=email,
        status=status,
        full_name=full_name,
        phone=phone,
        avatar_url=avatar_url,
        avatar_settings=avatar_settings,
        platform_identity_id=platform_identity_id,
    )
    if commit:
        db.commit()
        db.refresh(row)
    return row


def get_platform_identity(
    db: Session,
    platform_identity_id: uuid.UUID,
) -> PlatformIdentity | None:
    return _identity_repo.get_by_id(db, platform_identity_id)


def get_platform_identity_by_email(db: Session, email: str) -> PlatformIdentity | None:
    return _identity_repo.get_by_email(db, email)


def list_platform_identities(db: Session) -> list[PlatformIdentity]:
    return _identity_repo.list_all(db)


def create_platform_role_binding(
    db: Session,
    *,
    platform_identity_id: uuid.UUID,
    platform_role: str,
    status: str,
    commit: bool = False,
) -> PlatformRoleBinding:
    row = _role_binding_repo.create(
        db,
        platform_identity_id=platform_identity_id,
        platform_role=platform_role,
        status=status,
    )
    if commit:
        db.commit()
        db.refresh(row)
    return row


def get_platform_role_binding(db: Session, binding_id: int) -> PlatformRoleBinding | None:
    return _role_binding_repo.get_by_id(db, binding_id)


def list_platform_role_bindings(
    db: Session,
    platform_identity_id: uuid.UUID,
) -> list[PlatformRoleBinding]:
    return _role_binding_repo.list_for_identity(db, platform_identity_id)


def create_platform_credential(
    db: Session,
    *,
    platform_identity_id: uuid.UUID,
    credential_kind: str,
    provider_key: str,
    status: str,
    password_hash: str | None = None,
    issuer_key: str | None = None,
    external_subject_id: str | None = None,
    credential_id: uuid.UUID | None = None,
    commit: bool = False,
) -> PlatformCredential:
    row = _credential_repo.create(
        db,
        platform_identity_id=platform_identity_id,
        credential_kind=credential_kind,
        provider_key=provider_key,
        status=status,
        password_hash=password_hash,
        issuer_key=issuer_key,
        external_subject_id=external_subject_id,
        credential_id=credential_id,
    )
    if commit:
        db.commit()
        db.refresh(row)
    return row


def get_platform_credential(
    db: Session,
    credential_id: uuid.UUID,
) -> PlatformCredential | None:
    return _credential_repo.get_by_id(db, credential_id)


def list_platform_credentials(
    db: Session,
    platform_identity_id: uuid.UUID,
) -> list[PlatformCredential]:
    return _credential_repo.list_for_identity(db, platform_identity_id)


def touch_platform_credential_last_used(
    db: Session,
    row: PlatformCredential,
    *,
    used_at: datetime,
    commit: bool = False,
) -> PlatformCredential:
    updated = _credential_repo.update(db, row, last_used_at=used_at)
    if commit:
        db.commit()
        db.refresh(updated)
    return updated
