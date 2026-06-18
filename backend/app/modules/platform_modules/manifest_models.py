"""ORM model for platform module manifests."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base


class PlatformModuleManifest(Base):
    __tablename__ = "platform_module_manifests"

    id = Column(Integer, primary_key=True, index=True)
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    manifest_version = Column(String(32), nullable=False, default="1.0.0")
    module_version = Column(String(32), nullable=False, default="1.0.0")
    frontend_components = Column(JSONB, nullable=False, default=list)
    frontend_routes = Column(JSONB, nullable=False, default=list)
    backend_routers = Column(JSONB, nullable=False, default=list)
    backend_services = Column(JSONB, nullable=False, default=list)
    backend_models = Column(JSONB, nullable=False, default=list)
    db_tables = Column(JSONB, nullable=False, default=list)
    entry_points = Column(JSONB, nullable=False, default=list)
    permissions = Column(JSONB, nullable=False, default=list)
    dependencies = Column(JSONB, nullable=False, default=list)
    notification_targets = Column(JSONB, nullable=False, default=list)
    settings_schema = Column(JSONB, nullable=False, default=dict)
    release_notes = Column(Text, nullable=True)
    status = Column(String(40), nullable=False, default="active", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint(
            "module_key",
            "manifest_version",
            name="uq_platform_module_manifests_key_version",
        ),
    )
