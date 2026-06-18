"""ORM models for platform module publications."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base
from app.modules.platform_module_publications.constants import (
    PlatformModulePublicationStatus,
    PlatformModulePublicationType,
)


class PlatformModulePublication(Base):
    """DEV → platform template module configuration publication."""

    __tablename__ = "platform_module_publications"

    id = Column(Integer, primary_key=True, index=True)
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    target_tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    from_module_version = Column(String(32), nullable=False)
    to_module_version = Column(String(32), nullable=False)
    from_config_version = Column(String(32), nullable=False)
    to_config_version = Column(String(32), nullable=False)
    manifest_version = Column(String(32), nullable=True)
    publication_status = Column(
        String(32),
        nullable=False,
        default=PlatformModulePublicationStatus.DRAFT,
        index=True,
    )
    publication_type = Column(
        String(64),
        nullable=False,
        default=PlatformModulePublicationType.MODULE_CONFIGURATION,
    )
    release_summary = Column(Text, nullable=True)
    snapshot_payload = Column(JSONB, nullable=False, default=dict)
    risk_level = Column(String(32), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    review_started_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
