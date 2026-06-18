"""ORM model for immutable tenant module configuration diffs."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from app.db.base import Base
from app.modules.tenant_module_configuration_diffs.constants import (
    DEFAULT_CONFIGURATION_DIFF_RISK_LEVEL,
)


class TenantModuleConfigurationDiff(Base):
    """Immutable configuration diff for module update preview (read-only MVP)."""

    __tablename__ = "tenant_module_configuration_diffs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    module_key = Column(
        String(120),
        ForeignKey("platform_modules.module_key", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    offer_id = Column(
        Integer,
        ForeignKey("tenant_module_update_offers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    release_id = Column(Integer, ForeignKey("platform_releases.id", ondelete="SET NULL"), nullable=True, index=True)
    from_module_version = Column(String(32), nullable=False)
    to_module_version = Column(String(32), nullable=False)
    from_config_version = Column(String(32), nullable=False)
    to_config_version = Column(String(32), nullable=False)
    diff_payload = Column(JSONB, nullable=False, default=dict)
    risk_level = Column(String(32), nullable=False, default=DEFAULT_CONFIGURATION_DIFF_RISK_LEVEL, index=True)
    generated_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
