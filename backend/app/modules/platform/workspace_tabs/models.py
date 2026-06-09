import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.db.base import Base


class UserWorkspaceTab(Base):
    __tablename__ = "user_workspace_tabs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    tenant_id = Column(
        Integer,
        ForeignKey("portals.id", ondelete="SET NULL"),
        nullable=True,
    )

    title = Column(String(255), nullable=False)
    route = Column(String(2048), nullable=False)

    module_key = Column(String(64), nullable=False)
    page_type = Column(String(64), nullable=False)

    icon_key = Column(String(64), nullable=True)

    context_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    is_pinned = Column(Boolean, nullable=False, default=False, server_default="false")
    is_minimized = Column(Boolean, nullable=False, default=False, server_default="false")

    sort_order = Column(Integer, nullable=False, default=100, server_default="100")

    last_opened_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "route", name="uq_user_workspace_tabs_user_route"),
        Index("ix_user_workspace_tabs_user_id", "user_id"),
        Index("ix_user_workspace_tabs_tenant_id", "tenant_id"),
        Index("ix_user_workspace_tabs_module_key", "module_key"),
        Index("ix_user_workspace_tabs_last_opened_at", "last_opened_at"),
    )
