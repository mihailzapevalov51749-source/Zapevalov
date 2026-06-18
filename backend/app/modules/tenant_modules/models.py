"""ORM model for tenant modules registry."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint

from app.db.base import Base


class TenantModule(Base):
    """
    Per-tenant installed module state (read-only MVP).

    Future pipeline (not implemented):
    tenant_modules → module_update_offers → module_apply → module_rollback
    """

    __tablename__ = "tenant_modules"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    portal_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    installed_version = Column(String(32), nullable=False, default="1.0.0")
    enabled = Column(Boolean, nullable=False, default=True)
    installed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    source = Column(String(64), nullable=False, default="backfill")
    notes = Column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "module_key", name="uq_tenant_modules_tenant_module"),
    )
