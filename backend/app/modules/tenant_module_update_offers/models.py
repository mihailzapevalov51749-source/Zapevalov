"""ORM model for tenant module update offers."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.base import Base


class TenantModuleUpdateOffer(Base):
    """
    Per-tenant module update offer (read-only MVP).

    Future pipeline: Offer → Apply → Rollback (not implemented).
    """

    __tablename__ = "tenant_module_update_offers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_version = Column(String(32), nullable=False)
    to_version = Column(String(32), nullable=False)
    release_id = Column(Integer, ForeignKey("platform_releases.id", ondelete="SET NULL"), nullable=True, index=True)
    publication_id = Column(
        Integer,
        ForeignKey("platform_module_publications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status = Column(String(32), nullable=False, default="available", index=True)
    offered_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    applied_at = Column(DateTime, nullable=True)
    skipped_at = Column(DateTime, nullable=True)
    change_summary = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
