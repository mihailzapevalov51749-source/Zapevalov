from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.db.base import Base


class Portal(Base):
    __tablename__ = "portals"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)

    tenant_type = Column(
        String(32),
        nullable=False,
        default="CLIENT",
        server_default="CLIENT",
        index=True,
    )
    template_version = Column(
        String(32),
        nullable=False,
        default="1.0.0",
        server_default="1.0.0",
    )
    tenant_status = Column(
        String(32),
        nullable=False,
        default="ACTIVE",
        server_default="ACTIVE",
    )
    source_tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())