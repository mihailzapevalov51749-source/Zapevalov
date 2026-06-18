"""ORM models for tenant module configurations and snapshots."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base


class TenantModuleConfiguration(Base):
    """Per-tenant module configuration storage (read-only MVP)."""

    __tablename__ = "tenant_module_configurations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    module_version = Column(String(32), nullable=False, default="1.0.0")
    config_version = Column(String(32), nullable=False, default="1.0.0")
    schema_version = Column(String(32), nullable=False, default="1.0.0")
    settings = Column(JSONB, nullable=False, default=dict)
    permissions = Column(JSONB, nullable=False, default=dict)
    views = Column(JSONB, nullable=False, default=dict)
    rules = Column(JSONB, nullable=False, default=dict)
    templates = Column(JSONB, nullable=False, default=dict)
    source = Column(String(64), nullable=False, default="manifest_defaults")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "module_key", name="uq_tenant_module_config_tenant_module"),
    )


class TenantModuleConfigSnapshot(Base):
    """Immutable configuration snapshots for future Apply/Rollback."""

    __tablename__ = "tenant_module_config_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    snapshot_reason = Column(String(64), nullable=True)
    source_module_version = Column(String(32), nullable=True)
    target_module_version = Column(String(32), nullable=True)
    source_config_version = Column(String(32), nullable=True)
    config_payload = Column(JSONB, nullable=False, default=dict)
    offer_id = Column(Integer, ForeignKey("tenant_module_update_offers.id", ondelete="SET NULL"), nullable=True)
    apply_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
