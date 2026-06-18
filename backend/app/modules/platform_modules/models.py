"""ORM model for platform modules registry."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.db.base import Base


class PlatformModule(Base):
    __tablename__ = "platform_modules"

    id = Column(Integer, primary_key=True, index=True)
    module_key = Column(String(120), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    module_type = Column(String(40), nullable=False, index=True)
    status = Column(String(40), nullable=False, index=True)
    version = Column(String(32), nullable=False, default="1.0.0")
    entry_system_key = Column(String(120), nullable=True, index=True)
    entry_route = Column(String(255), nullable=True)
    is_runtime = Column(Boolean, nullable=False, default=False)
    is_tenant_installable = Column(Boolean, nullable=False, default=False)
    is_enabled_by_default = Column(Boolean, nullable=False, default=False)
    is_core = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
