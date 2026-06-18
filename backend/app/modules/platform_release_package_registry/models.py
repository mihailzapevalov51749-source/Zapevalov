"""ORM model for platform release package registry."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base
from app.modules.platform_release_package_registry.constants import (
    PlatformReleasePackageStatus,
)


class PlatformReleasePackage(Base):
    """
    Immutable release package metadata between Build and Deployment layers.

    Phase 1 scope:
    - registry storage only (no API/UI/deployment logic)
    - FK to platform_code_builds
    - lifecycle states and audit metadata

    Immutable principle (architectural in Phase 1):
    once package reaches READY/PUBLISHED, fields below must not change:
    build_id, platform_version, package_manifest_json, module_bom_json.
    """

    __tablename__ = "platform_release_packages"

    id = Column(Integer, primary_key=True, index=True)
    package_key = Column(String(32), nullable=False, unique=True, index=True)
    platform_version = Column(String(40), nullable=False, unique=True, index=True)
    build_id = Column(
        Integer,
        ForeignKey("platform_code_builds.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status = Column(
        String(32),
        nullable=False,
        default=PlatformReleasePackageStatus.DRAFT.value,
        index=True,
    )

    package_manifest_json = Column(JSONB, nullable=False, default=dict)
    module_bom_json = Column(JSONB, nullable=False, default=dict)
    release_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    ready_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    deprecated_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    cancelled_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    cancellation_reason = Column(Text, nullable=True)

