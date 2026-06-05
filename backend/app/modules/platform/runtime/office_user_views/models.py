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


class RuntimeOfficeUserTableView(Base):
    __tablename__ = "runtime_office_user_table_views"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    tenant_id = Column(
        Integer,
        ForeignKey("portals.id", ondelete="CASCADE"),
        nullable=False,
    )
    owner_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    object_type_key = Column(String(64), nullable=False)

    view_key = Column(String(64), nullable=False)
    name = Column(String(255), nullable=False)
    view_type = Column(String(32), nullable=False, default="table", server_default="table")

    is_default = Column(Boolean, nullable=False, default=False, server_default="false")
    is_visible = Column(Boolean, nullable=False, default=True, server_default="true")

    settings_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    filters_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    layout_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    visibility_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "owner_user_id",
            "object_type_key",
            "view_key",
            name="uq_runtime_office_user_table_views_scope_key",
        ),
        Index(
            "ix_runtime_office_user_table_views_scope",
            "tenant_id",
            "owner_user_id",
            "object_type_key",
        ),
    )
