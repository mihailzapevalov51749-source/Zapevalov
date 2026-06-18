"""ORM models for platform environment version registry."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.base import Base
from app.modules.platform_version_registry.constants import (
    PlatformEnvironmentKey,
    PlatformVersionInstallationStatus,
)


class PlatformEnvironmentVersion(Base):
    """Current active platform version per portal (environment slot)."""

    __tablename__ = "platform_environment_versions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id"), nullable=False, unique=True, index=True)
    environment_key = Column(String(32), nullable=False, index=True)
    platform_version = Column(String(40), nullable=False)
    status = Column(
        String(32),
        nullable=False,
        default=PlatformVersionInstallationStatus.ACTIVE.value,
        index=True,
    )
    installed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    installed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    change_description = Column(Text, nullable=True)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class PlatformVersionHistory(Base):
    """Append-only history of platform version installations per environment."""

    __tablename__ = "platform_version_history"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id"), nullable=False, index=True)
    environment_key = Column(String(32), nullable=False, index=True)
    platform_version = Column(String(40), nullable=False)
    status = Column(String(32), nullable=False, index=True)
    installed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    installed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    change_description = Column(Text, nullable=True)
    recorded_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    superseded_at = Column(DateTime, nullable=True)
