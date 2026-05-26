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


class DesignerRelationDefinition(Base):
    __tablename__ = "designer_relation_definitions"

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

    key = Column(String(64), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    source_object_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_object_types.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_object_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_object_types.id", ondelete="CASCADE"),
        nullable=False,
    )

    relation_type = Column(String(32), nullable=False)
    reverse_name = Column(String(255), nullable=True)

    sort_order = Column(Integer, nullable=False, default=0, server_default="0")

    is_required = Column(Boolean, nullable=False, default=False, server_default="false")
    is_system = Column(Boolean, nullable=False, default=False, server_default="false")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    bidirectional = Column(Boolean, nullable=False, default=True, server_default="true")
    cascade_delete = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    settings_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    validation_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

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
            "ix_designer_relation_definitions_tenant_source",
            "tenant_id",
            "source_object_type_id",
        ),
        Index(
            "ix_designer_relation_definitions_tenant_target",
            "tenant_id",
            "target_object_type_id",
        ),
        Index(
            "ix_designer_relation_definitions_tenant_relation_type",
            "tenant_id",
            "relation_type",
        ),
        Index(
            "ix_designer_relation_definitions_tenant_is_active",
            "tenant_id",
            "is_active",
        ),
        Index(
            "uq_designer_relation_definitions_tenant_key_active",
            "tenant_id",
            "key",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )
