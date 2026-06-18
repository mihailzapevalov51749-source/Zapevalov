from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from app.db.base import Base


class TenantRuntimeMenuSetting(Base):
    """Tenant-level runtime menu overrides (admin/superadmin)."""

    __tablename__ = "tenant_runtime_menu_settings"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    item_key = Column(String(120), nullable=False)
    navigation_item_id = Column(Integer, nullable=True)
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
        UniqueConstraint("tenant_id", "item_key", name="uq_tenant_runtime_menu_tenant_item"),
    )


class UserMenuPreference(Base):
    """Personal runtime menu preferences (per user within tenant)."""

    __tablename__ = "user_menu_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("portals.id", ondelete="CASCADE"), nullable=False, index=True)
    item_key = Column(String(120), nullable=False)
    navigation_item_id = Column(Integer, nullable=True)
    sort_order = Column(Integer, nullable=True)
    is_hidden = Column(Boolean, nullable=True)
    color = Column(String(50), nullable=True)
    is_bold = Column(Boolean, nullable=True)
    is_collapsed = Column(Boolean, nullable=True)
    personal_block_key = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "tenant_id", "item_key", name="uq_user_menu_pref_user_tenant_item"),
    )
