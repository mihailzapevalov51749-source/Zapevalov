import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.db.base import Base


class DesignerViewDefinition(Base):
    __tablename__ = "designer_view_definitions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    tenant_id = Column(
        Integer,
        ForeignKey("portals.id", ondelete="CASCADE"),
        nullable=False,
    )

    object_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_object_types.id", ondelete="CASCADE"),
        nullable=False,
    )

    key = Column(String(64), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    view_type = Column(String(32), nullable=False)

    is_default = Column(Boolean, nullable=False, default=False, server_default="false")
    is_system = Column(Boolean, nullable=False, default=False, server_default="false")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")

    sort_order = Column(Integer, nullable=False, default=0, server_default="0")

    settings_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    layout_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    filters_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    visibility_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    draft_revision = Column(Integer, nullable=False, default=1, server_default="1")

    created_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    updated_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    deleted_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index(
            "ix_designer_view_definitions_tenant_object_type",
            "tenant_id",
            "object_type_id",
        ),
        Index(
            "ix_designer_view_definitions_object_type_sort_order",
            "object_type_id",
            "sort_order",
        ),
        Index(
            "ix_designer_view_definitions_tenant_view_type",
            "tenant_id",
            "view_type",
        ),
        Index(
            "ix_designer_view_definitions_tenant_is_active",
            "tenant_id",
            "is_active",
        ),
        Index(
            "uq_designer_view_definitions_object_type_key_active",
            "tenant_id",
            "object_type_id",
            "key",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "uq_designer_view_definitions_object_type_default_active",
            "object_type_id",
            unique=True,
            postgresql_where=text("deleted_at IS NULL AND is_default = true"),
        ),
    )
