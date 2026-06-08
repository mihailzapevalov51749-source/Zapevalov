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
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class DesignerActionPlacement(Base):
    __tablename__ = "designer_action_placements"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "object_type_id",
            "action_definition_id",
            "placement_key",
            name="uq_designer_action_placements_tenant_object_action_placement",
        ),
        Index(
            "ix_designer_action_placements_tenant_object_placement_active",
            "tenant_id",
            "object_type_id",
            "placement_key",
            "is_active",
        ),
        Index(
            "ix_designer_action_placements_action_definition_id",
            "action_definition_id",
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

    action_definition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_action_definitions.id", ondelete="CASCADE"),
        nullable=False,
    )

    placement_key = Column(String(64), nullable=False)

    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    sort_order = Column(Integer, nullable=False, default=100, server_default="100")

    label_override = Column(String(255), nullable=True)
    icon_key = Column(String(64), nullable=True)

    config_json = Column(JSONB, nullable=True)
    visibility_condition_json = Column(JSONB, nullable=True)
    enabled_condition_json = Column(JSONB, nullable=True)

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

    action_definition = relationship(
        "DesignerActionDefinition",
        back_populates="placements",
    )
