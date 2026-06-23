"""ORM model for platform deployment registry."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base
from app.modules.platform_deployment_registry.constants import (
    PlatformDeploymentKind,
    PlatformDeploymentStatus,
)


class PlatformDeployment(Base):
    """
    Deployment attempt metadata between Release Package and Environment Version registries.

    Phase 1 scope:
    - registry table only
    - no execution engine
    - no automatic writes to environment/version history
    """

    __tablename__ = "platform_deployments"

    id = Column(Integer, primary_key=True, index=True)
    deployment_key = Column(String(32), nullable=False, unique=True, index=True)

    release_package_id = Column(
        Integer,
        ForeignKey("platform_release_packages.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    target_environment_type = Column(String(32), nullable=False, index=True)
    deployment_kind = Column(
        String(32),
        nullable=False,
        default=PlatformDeploymentKind.TEMPLATE_PUBLISH.value,
        index=True,
    )
    target_environment_id = Column(String(64), nullable=True)
    target_tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(
        String(32),
        nullable=False,
        default=PlatformDeploymentStatus.PLANNED.value,
        index=True,
    )

    target_platform_version = Column(String(40), nullable=False, index=True)
    target_schema_revision = Column(String(64), nullable=True, index=True)
    previous_platform_version = Column(String(40), nullable=True, index=True)
    previous_release_package_id = Column(
        Integer,
        ForeignKey("platform_release_packages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    deployment_manifest_json = Column(JSONB, nullable=False, default=dict)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    failure_reason = Column(Text, nullable=True)

