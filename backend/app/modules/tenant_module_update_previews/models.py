"""ORM model for tenant module update previews."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base
from app.modules.tenant_module_update_previews.constants import (
    DEFAULT_PREVIEW_RISK_LEVEL,
    TenantModuleUpdatePreviewStatus,
)


class TenantModuleUpdatePreview(Base):
    """
    Per-tenant module update preview (read-only MVP).

    Future pipeline: Preview → Apply → Rollback (Apply/Rollback not implemented).
    """

    __tablename__ = "tenant_module_update_previews"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    offer_id = Column(
        Integer,
        ForeignKey("tenant_module_update_offers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_version = Column(String(32), nullable=False)
    to_version = Column(String(32), nullable=False)
    release_id = Column(Integer, ForeignKey("platform_releases.id", ondelete="SET NULL"), nullable=True, index=True)
    preview_status = Column(
        String(32),
        nullable=False,
        default=TenantModuleUpdatePreviewStatus.GENERATED,
        index=True,
    )
    summary = Column(Text, nullable=True)
    impact_analysis = Column(JSONB, nullable=False, default=dict)
    affected_components = Column(JSONB, nullable=False, default=list)
    affected_routes = Column(JSONB, nullable=False, default=list)
    affected_tables = Column(JSONB, nullable=False, default=list)
    affected_permissions = Column(JSONB, nullable=False, default=list)
    affected_settings = Column(JSONB, nullable=False, default=list)
    affected_views = Column(JSONB, nullable=False, default=list)
    affected_rules = Column(JSONB, nullable=False, default=list)
    affected_templates = Column(JSONB, nullable=False, default=list)
    affected_dependencies = Column(JSONB, nullable=False, default=list)
    risk_level = Column(String(32), nullable=False, default=DEFAULT_PREVIEW_RISK_LEVEL, index=True)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
