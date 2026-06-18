"""ORM models for platform module versions and release linkage."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint

from app.db.base import Base


class PlatformModuleVersion(Base):
    """
    Platform module version registry (read-only MVP).

    Linked to manifests via (module_key, manifest_version).
    Future pipeline: module_update_offers → module_apply → module_rollback.
    """

    __tablename__ = "platform_module_versions"

    id = Column(Integer, primary_key=True, index=True)
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version = Column(String(32), nullable=False)
    status = Column(String(40), nullable=False, default="released", index=True)
    release_id = Column(
        Integer,
        ForeignKey("platform_releases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    release_date = Column(DateTime, nullable=True)
    change_log = Column(Text, nullable=True)
    breaking_changes = Column(Text, nullable=True)
    manifest_version = Column(String(32), nullable=False, default="1.0.0")
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
            "version",
            name="uq_platform_module_versions_key_version",
        ),
    )


class PlatformReleaseModule(Base):
    """Links a platform release to module version transitions."""

    __tablename__ = "platform_release_modules"

    id = Column(Integer, primary_key=True, index=True)
    release_id = Column(
        Integer,
        ForeignKey("platform_releases.id", ondelete="CASCADE"),
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
    change_summary = Column(Text, nullable=True)
