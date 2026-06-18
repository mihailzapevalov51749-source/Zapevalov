"""ORM models for migration rollback foundation."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, UniqueConstraint

from app.db.base import Base


class PlatformVersionSchemaCatalog(Base):
    """Canonical binding: platform_version -> Alembic schema_revision."""

    __tablename__ = "platform_version_schema_catalog"
    __table_args__ = (
        UniqueConstraint("platform_version", name="uq_platform_version_schema_catalog_version"),
    )

    id = Column(Integer, primary_key=True, index=True)
    platform_version = Column(String(40), nullable=False, index=True)
    schema_revision = Column(String(64), nullable=False, index=True)
    rollback_mode_default = Column(String(32), nullable=False, default="backup_restore")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
