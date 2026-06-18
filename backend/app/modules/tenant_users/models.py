from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.tenant_users.constants import MEMBERSHIP_STATUS_ACTIVE


class TenantUserMembership(Base):
    __tablename__ = "tenant_user_memberships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("portals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_key: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    membership_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=MEMBERSHIP_STATUS_ACTIVE,
        server_default=MEMBERSHIP_STATUS_ACTIVE,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    tenant = relationship("Portal", foreign_keys=[tenant_id])
    user = relationship("User", foreign_keys=[user_id])


class TenantUserProfile(Base):
    __tablename__ = "tenant_user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tenant_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("portals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    manager: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mentor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    tenant = relationship("Portal", foreign_keys=[tenant_id])
    user = relationship("User", foreign_keys=[user_id])
