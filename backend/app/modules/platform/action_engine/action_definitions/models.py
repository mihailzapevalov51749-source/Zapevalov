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
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class DesignerActionDefinition(Base):
    __tablename__ = "designer_action_definitions"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "object_type_id",
            "key",
            name="uq_designer_action_definitions_tenant_object_key",
        ),
        Index(
            "ix_designer_action_definitions_tenant_object",
            "tenant_id",
            "object_type_id",
        ),
    )

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

    target_object_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_object_types.id", ondelete="SET NULL"),
        nullable=True,
    )

    auto_link_enabled = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    auto_link_relation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_relation_definitions.id", ondelete="SET NULL"),
        nullable=True,
    )

    key = Column(String(64), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    action_type_key = Column(String(64), nullable=False)

    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    is_system = Column(Boolean, nullable=False, default=False, server_default="false")

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

    placements = relationship(
        "DesignerActionPlacement",
        back_populates="action_definition",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    form = relationship(
        "DesignerActionForm",
        back_populates="action_definition",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
    )
