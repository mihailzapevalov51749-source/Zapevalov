"""Platform Identity Store repositories (CRUD only)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.control_plane.platform_identity.constants import (
    PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
    PLATFORM_ROLE_OWNER,
)
from app.modules.control_plane.platform_identity.models import (
    PlatformCredential,
    PlatformIdentity,
    PlatformRoleBinding,
)


def normalize_email(email: str) -> str:
    return str(email or "").strip().lower()


class PlatformIdentityRepository:
    def create(
        self,
        db: Session,
        *,
        email: str,
        status: str,
        full_name: str | None = None,
        phone: str | None = None,
        avatar_url: str | None = None,
        avatar_settings: dict | None = None,
        platform_identity_id: uuid.UUID | None = None,
    ) -> PlatformIdentity:
        row = PlatformIdentity(
            platform_identity_id=platform_identity_id or uuid.uuid4(),
            email=normalize_email(email),
            status=status,
            full_name=full_name,
            phone=phone,
            avatar_url=avatar_url,
            avatar_settings=avatar_settings,
        )
        db.add(row)
        db.flush()
        return row

    def get_by_id(
        self,
        db: Session,
        platform_identity_id: uuid.UUID,
    ) -> PlatformIdentity | None:
        return db.get(PlatformIdentity, platform_identity_id)

    def get_by_email(self, db: Session, email: str) -> PlatformIdentity | None:
        normalized = normalize_email(email)
        return db.scalars(
            select(PlatformIdentity).where(PlatformIdentity.email == normalized)
        ).first()

    def list_all(self, db: Session) -> list[PlatformIdentity]:
        return list(
            db.scalars(
                select(PlatformIdentity).order_by(PlatformIdentity.created_at.asc())
            ).all()
        )

    def update(
        self,
        db: Session,
        row: PlatformIdentity,
        *,
        status: str | None = None,
        full_name: str | None = None,
        phone: str | None = None,
        avatar_url: str | None = None,
        avatar_settings: dict | None = None,
    ) -> PlatformIdentity:
        if status is not None:
            row.status = status
        if full_name is not None:
            row.full_name = full_name
        if phone is not None:
            row.phone = phone
        if avatar_url is not None:
            row.avatar_url = avatar_url
        if avatar_settings is not None:
            row.avatar_settings = avatar_settings
        db.add(row)
        db.flush()
        return row


class PlatformRoleBindingRepository:
    def create(
        self,
        db: Session,
        *,
        platform_identity_id: uuid.UUID,
        platform_role: str,
        status: str,
    ) -> PlatformRoleBinding:
        row = PlatformRoleBinding(
            platform_identity_id=platform_identity_id,
            platform_role=platform_role,
            status=status,
        )
        db.add(row)
        db.flush()
        return row

    def get_by_id(self, db: Session, binding_id: int) -> PlatformRoleBinding | None:
        return db.get(PlatformRoleBinding, binding_id)

    def list_for_identity(
        self,
        db: Session,
        platform_identity_id: uuid.UUID,
    ) -> list[PlatformRoleBinding]:
        return list(
            db.scalars(
                select(PlatformRoleBinding)
                .where(PlatformRoleBinding.platform_identity_id == platform_identity_id)
                .order_by(PlatformRoleBinding.id.asc())
            ).all()
        )

    def get_active_owner_binding(self, db: Session) -> PlatformRoleBinding | None:
        return db.scalars(
            select(PlatformRoleBinding).where(
                PlatformRoleBinding.platform_role == PLATFORM_ROLE_OWNER,
                PlatformRoleBinding.status == PLATFORM_ROLE_BINDING_STATUS_ACTIVE,
            )
        ).first()

    def update_status(
        self,
        db: Session,
        row: PlatformRoleBinding,
        *,
        status: str,
    ) -> PlatformRoleBinding:
        row.status = status
        db.add(row)
        db.flush()
        return row


class PlatformCredentialRepository:
    def create(
        self,
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
    ) -> PlatformCredential:
        row = PlatformCredential(
            credential_id=credential_id or uuid.uuid4(),
            platform_identity_id=platform_identity_id,
            credential_kind=credential_kind,
            provider_key=provider_key,
            status=status,
            password_hash=password_hash,
            issuer_key=issuer_key,
            external_subject_id=external_subject_id,
        )
        db.add(row)
        db.flush()
        return row

    def get_by_id(
        self,
        db: Session,
        credential_id: uuid.UUID,
    ) -> PlatformCredential | None:
        return db.get(PlatformCredential, credential_id)

    def list_for_identity(
        self,
        db: Session,
        platform_identity_id: uuid.UUID,
    ) -> list[PlatformCredential]:
        return list(
            db.scalars(
                select(PlatformCredential)
                .where(PlatformCredential.platform_identity_id == platform_identity_id)
                .order_by(PlatformCredential.created_at.asc())
            ).all()
        )

    def update(
        self,
        db: Session,
        row: PlatformCredential,
        *,
        status: str | None = None,
        password_hash: str | None = None,
        last_used_at: datetime | None = None,
    ) -> PlatformCredential:
        if status is not None:
            row.status = status
        if password_hash is not None:
            row.password_hash = password_hash
        if last_used_at is not None:
            row.last_used_at = last_used_at
        db.add(row)
        db.flush()
        return row
