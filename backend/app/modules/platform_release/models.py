"""ORM models for platform release pipeline."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class PlatformRelease(Base):
    __tablename__ = "platform_releases"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(32), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(40), nullable=False, default="draft", index=True)
    source_tenant_id = Column(Integer, ForeignKey("portals.id"), nullable=False, index=True)
    target_template_tenant_id = Column(Integer, ForeignKey("portals.id"), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    review_started_at = Column(DateTime, nullable=True)
    review_started_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    review_comment = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    changes_requested_at = Column(DateTime, nullable=True)
    changes_requested_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    published_at = Column(DateTime, nullable=True)
    published_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    changes = relationship(
        "ReleaseChange",
        back_populates="release",
        cascade="all, delete-orphan",
        order_by="ReleaseChange.id.asc()",
    )


class ReleaseChange(Base):
    __tablename__ = "release_changes"

    id = Column(Integer, primary_key=True, index=True)
    release_id = Column(Integer, ForeignKey("platform_releases.id"), nullable=False, index=True)
    change_type = Column(String(40), nullable=False, default="other")
    entity_type = Column(String(80), nullable=True)
    entity_id = Column(String(80), nullable=True)
    system_key = Column(String(120), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    risk_level = Column(String(20), nullable=False, default="low")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    release = relationship("PlatformRelease", back_populates="changes")


class TenantVersion(Base):
    __tablename__ = "tenant_versions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id"), nullable=False, unique=True, index=True)
    current_version = Column(String(32), nullable=False, default="1.0.0")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class TenantUpdateOffer(Base):
    __tablename__ = "tenant_update_offers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id"), nullable=False, index=True)
    release_id = Column(
        Integer,
        ForeignKey("platform_release_packages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_version = Column(String(32), nullable=False)
    to_version = Column(String(32), nullable=False)
    status = Column(String(20), nullable=False, default="available", index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    applied_at = Column(DateTime, nullable=True)

    release_package = relationship("PlatformReleasePackage", foreign_keys=[release_id])
