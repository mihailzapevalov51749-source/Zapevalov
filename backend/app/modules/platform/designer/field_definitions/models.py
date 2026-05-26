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


class DesignerFieldDefinition(Base):
    __tablename__ = "designer_field_definitions"

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

    field_type = Column(String(32), nullable=False)

    sort_order = Column(Integer, nullable=False, default=0, server_default="0")

    is_required = Column(Boolean, nullable=False, default=False, server_default="false")
    is_unique = Column(Boolean, nullable=False, default=False, server_default="false")
    is_system = Column(Boolean, nullable=False, default=False, server_default="false")

    default_value_json = Column(JSONB, nullable=True)
    settings_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    validation_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
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
            "ix_designer_field_definitions_tenant_object_type",
            "tenant_id",
            "object_type_id",
        ),
        Index(
            "ix_designer_field_definitions_object_type_sort_order",
            "object_type_id",
            "sort_order",
        ),
        Index(
            "ix_designer_field_definitions_tenant_field_type",
            "tenant_id",
            "field_type",
        ),
        Index(
            "uq_designer_field_definitions_object_type_key_active",
            "tenant_id",
            "object_type_id",
            "key",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )
