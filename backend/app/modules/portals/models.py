from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class Portal(Base):
    __tablename__ = "portals"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    code = Column(String(64), nullable=True, unique=True, index=True)
    short_name = Column(String(64), nullable=True)
    public_slug = Column(String(64), nullable=True, unique=True, index=True)
    public_slug_locked = Column(Boolean, nullable=False, default=False, server_default="false")
    description = Column(Text, nullable=True)

    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_protected = Column(Boolean, nullable=False, default=False, server_default="false")

    tenant_type = Column(
        String(32),
        nullable=False,
        default="CLIENT",
        server_default="CLIENT",
        index=True,
    )
    environment_role = Column(String(32), nullable=True, index=True)
    template_version = Column(
        String(32),
        nullable=False,
        default="1.0.0",
        server_default="1.0.0",
    )
    tenant_status = Column(
        String(32),
        nullable=False,
        default="ACTIVE",
        server_default="ACTIVE",
    )
    source_tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)

    timezone = Column(
        String(128),
        nullable=False,
        default="(UTC+03:00) Москва",
        server_default="(UTC+03:00) Москва",
    )
    date_format = Column(
        String(32),
        nullable=False,
        default="DD.MM.YYYY",
        server_default="DD.MM.YYYY",
    )
    time_format = Column(
        String(16),
        nullable=False,
        default="24h",
        server_default="24h",
    )
    week_start_day = Column(
        String(32),
        nullable=False,
        default="Понедельник",
        server_default="Понедельник",
    )
    default_language = Column(
        String(16),
        nullable=False,
        default="ru",
        server_default="ru",
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())