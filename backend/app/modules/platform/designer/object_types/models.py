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
from app.modules.platform.shared.enums import ObjectTypeStatus


class DesignerObjectType(Base):
    __tablename__ = "designer_object_types"

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
    icon = Column(String(64), nullable=True)
    color = Column(String(7), nullable=True)

    sort_order = Column(Integer, nullable=False, default=0, server_default="0")

    status = Column(
        String(32),
        nullable=False,
        default=ObjectTypeStatus.ACTIVE.value,
        server_default=ObjectTypeStatus.ACTIVE.value,
    )

    is_system = Column(Boolean, nullable=False, default=False, server_default="false")
    is_default_entity = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    settings_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    governance_json = Column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    draft_revision = Column(Integer, nullable=False, default=1, server_default="1")

    last_published_at = Column(DateTime(timezone=True), nullable=True)

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
            "ix_designer_object_types_tenant_status",
            "tenant_id",
            "status",
        ),
        Index(
            "ix_designer_object_types_tenant_sort_order",
            "tenant_id",
            "sort_order",
        ),
        Index(
            "uq_designer_object_types_tenant_key_active",
            "tenant_id",
            "key",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )
