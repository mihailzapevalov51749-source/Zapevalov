"""ORM model for tenant module configuration rollbacks."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.db.base import Base
from app.modules.tenant_module_configuration_rollbacks.constants import (
    TenantModuleConfigurationRollbackStatus,
)


class TenantModuleConfigurationRollback(Base):
    """Audit record for module configuration rollback operations."""

    __tablename__ = "tenant_module_configuration_rollbacks"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    apply_id = Column(
        Integer,
        ForeignKey("tenant_module_configuration_applies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    snapshot_id = Column(
        Integer,
        ForeignKey("tenant_module_config_snapshots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    from_module_version = Column(String(32), nullable=False)
    to_module_version = Column(String(32), nullable=False)
    from_config_version = Column(String(32), nullable=False)
    to_config_version = Column(String(32), nullable=False)
    status = Column(
        String(32),
        nullable=False,
        default=TenantModuleConfigurationRollbackStatus.STARTED,
        index=True,
    )
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    rolled_back_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    notes = Column(Text, nullable=True)
