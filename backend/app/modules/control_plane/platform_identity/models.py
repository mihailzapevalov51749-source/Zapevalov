"""Platform Identity Store ORM models (ADR-010)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.platform_dashboard.datetime_utils import utc_now


def _uuid_pk() -> uuid.UUID:
    return uuid.uuid4()


class PlatformIdentity(Base):
    """Canonical platform-level identity (Control Plane SoT)."""

    __tablename__ = "platform_identities"
    __table_args__ = (
        UniqueConstraint("email", name="uq_platform_identities_email"),
        Index("ix_platform_identities_status", "status"),
    )

    platform_identity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=_uuid_pk,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    role_bindings: Mapped[list[PlatformRoleBinding]] = relationship(
        "PlatformRoleBinding",
        back_populates="identity",
        cascade="all, delete-orphan",
    )
    credentials: Mapped[list[PlatformCredential]] = relationship(
        "PlatformCredential",
        back_populates="identity",
        cascade="all, delete-orphan",
    )


class PlatformRoleBinding(Base):
    """Platform role assignment for a platform identity."""

    __tablename__ = "platform_role_bindings"
    __table_args__ = (
        UniqueConstraint(
            "platform_identity_id",
            "platform_role",
            name="uq_platform_role_bindings_identity_role",
        ),
        Index("ix_platform_role_bindings_platform_identity_id", "platform_identity_id"),
        Index("ix_platform_role_bindings_platform_role", "platform_role"),
        Index("ix_platform_role_bindings_status", "status"),
        Index(
            "uq_platform_role_bindings_single_active_owner",
            "platform_role",
            unique=True,
            postgresql_where=text(
                "platform_role = 'platform_owner' AND status = 'active'"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    platform_identity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("platform_identities.platform_identity_id", ondelete="CASCADE"),
        nullable=False,
    )
    platform_role: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    identity: Mapped[PlatformIdentity] = relationship(
        "PlatformIdentity",
        back_populates="role_bindings",
    )


class PlatformCredential(Base):
    """Authentication method or factor for a platform identity (1:N)."""

    __tablename__ = "platform_credentials"
    __table_args__ = (
        Index("ix_platform_credentials_platform_identity_id", "platform_identity_id"),
        Index("ix_platform_credentials_credential_kind", "credential_kind"),
        Index("ix_platform_credentials_provider_key", "provider_key"),
        Index("ix_platform_credentials_status", "status"),
        Index(
            "uq_platform_credentials_single_active_password",
            "platform_identity_id",
            unique=True,
            postgresql_where=text(
                "credential_kind = 'password' AND status = 'active'"
            ),
        ),
        Index(
            "uq_platform_credentials_federated_subject",
            "provider_key",
            "issuer_key",
            "external_subject_id",
            unique=True,
            postgresql_where=text(
                "credential_kind = 'federated' AND external_subject_id IS NOT NULL"
            ),
        ),
    )

    credential_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=_uuid_pk,
    )
    platform_identity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("platform_identities.platform_identity_id", ondelete="CASCADE"),
        nullable=False,
    )
    credential_kind: Mapped[str] = mapped_column(String(32), nullable=False)
    provider_key: Mapped[str] = mapped_column(String(64), nullable=False)
    issuer_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    external_subject_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    identity: Mapped[PlatformIdentity] = relationship(
        "PlatformIdentity",
        back_populates="credentials",
    )
