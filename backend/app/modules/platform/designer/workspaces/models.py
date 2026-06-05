from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class DesignerWorkspace(Base):
    __tablename__ = "designer_workspaces"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    slug = Column(String(120), nullable=False)
    status = Column(String(20), nullable=False, default="active")
    icon = Column(String(255), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    navigation_item_id = Column(Integer, nullable=True, index=True)
    home_page_id = Column(Integer, ForeignKey("pages.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_designer_workspace_tenant_slug"),
    )


class DesignerWorkspaceTab(Base):
    __tablename__ = "designer_workspace_tabs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, index=True)
    workspace_id = Column(Integer, ForeignKey("designer_workspaces.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    slug = Column(String(120), nullable=False)
    icon = Column(String(255), nullable=True)

    sort_order = Column(Integer, nullable=False, default=0)
    is_system = Column(Boolean, nullable=False, default=False)
    is_visible = Column(Boolean, nullable=False, default=True)
    slug_is_manual = Column(Boolean, nullable=False, default=False)

    object_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_object_types.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    tab_type = Column(String(30), nullable=False, default="object")
    target_type = Column(String(30), nullable=True)
    target_id = Column(String(255), nullable=True)
    url = Column(Text, nullable=True)
    open_in_new_tab = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("workspace_id", "slug", name="uq_designer_workspace_tab_slug"),
    )
