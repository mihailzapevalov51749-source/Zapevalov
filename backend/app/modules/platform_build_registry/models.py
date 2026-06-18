"""ORM model for platform code build registry."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base
from app.modules.platform_build_registry.constants import PlatformBuildStatus


class PlatformCodeBuild(Base):
    """
    Immutable metadata record of a platform-wide build attempt.

    Build is a technical artifact snapshot between source code and release package.
    This table intentionally does not store tenant data, deployment state, or offers.
    """

    __tablename__ = "platform_code_builds"

    id = Column(Integer, primary_key=True, index=True)
    build_key = Column(String(32), nullable=False, unique=True, index=True)
    commit_sha = Column(String(40), nullable=False, index=True)
    status = Column(
        String(32),
        nullable=False,
        default=PlatformBuildStatus.PENDING.value,
        index=True,
    )

    backend_digest = Column(String(255), nullable=True)
    frontend_digest = Column(String(255), nullable=True)
    schema_revision = Column(String(64), nullable=True, index=True)
    build_manifest_json = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    failure_reason = Column(Text, nullable=True)
