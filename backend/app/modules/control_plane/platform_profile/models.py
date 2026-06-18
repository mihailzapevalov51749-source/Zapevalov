from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.modules.platform_dashboard.datetime_utils import utc_now


class PlatformSettings(Base):
    """Singleton platform-wide settings (not tenant_settings)."""

    __tablename__ = "platform_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    platform_name: Mapped[str] = mapped_column(String(255), nullable=False)
    platform_short_name: Mapped[str] = mapped_column(String(64), nullable=False)
    public_slug: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True, index=True)
    public_slug_locked: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="false")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    timezone: Mapped[str] = mapped_column(String(128), nullable=False)
    date_format: Mapped[str] = mapped_column(String(32), nullable=False)
    time_format: Mapped[str] = mapped_column(String(16), nullable=False)
    week_start_day: Mapped[str] = mapped_column(String(32), nullable=False)
    default_language: Mapped[str] = mapped_column(String(16), nullable=False)
    platform_owner_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
    platform_owner_full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    platform_owner_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    platform_owner_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    platform_owner_avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    platform_owner_avatar_settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )
