from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from app.db.base import Base


class DesignerSystemMenuSetting(Base):
    __tablename__ = "designer_system_menu_settings"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    item_key = Column(String(120), nullable=False)
    title = Column(String(255), nullable=True)
    icon = Column(String(255), nullable=True)
    icon_type = Column(String(50), nullable=True)
    icon_file_url = Column(String(1000), nullable=True)
    color = Column(String(50), nullable=True)
    sort_order = Column(Integer, nullable=True)
    is_visible = Column(Boolean, nullable=True)
    is_bold = Column(Boolean, nullable=True)
    is_italic = Column(Boolean, nullable=True)
    is_expanded = Column(Boolean, nullable=True)
    block_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "item_key", name="uq_designer_system_menu_tenant_item"),
    )
