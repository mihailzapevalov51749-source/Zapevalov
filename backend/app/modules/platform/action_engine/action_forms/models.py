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


class DesignerActionForm(Base):
    __tablename__ = "designer_action_forms"
    __table_args__ = (
        UniqueConstraint(
            "action_definition_id",
            name="uq_designer_action_forms_action_definition_id",
        ),
        Index(
            "ix_designer_action_forms_tenant_object",
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

    action_definition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_action_definitions.id", ondelete="CASCADE"),
        nullable=False,
    )

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    submit_label = Column(String(128), nullable=False, default="Создать", server_default="Создать")
    cancel_label = Column(String(128), nullable=False, default="Отмена", server_default="Отмена")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")

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
        back_populates="form",
        uselist=False,
    )
    fields = relationship(
        "DesignerActionFormField",
        back_populates="action_form",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="DesignerActionFormField.sort_order",
    )


class DesignerActionFormField(Base):
    __tablename__ = "designer_action_form_fields"
    __table_args__ = (
        UniqueConstraint(
            "action_form_id",
            "field_definition_id",
            name="uq_designer_action_form_fields_form_field_definition",
        ),
        Index(
            "ix_designer_action_form_fields_action_form_id",
            "action_form_id",
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

    action_form_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_action_forms.id", ondelete="CASCADE"),
        nullable=False,
    )

    field_definition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_field_definitions.id", ondelete="CASCADE"),
        nullable=False,
    )

    label_override = Column(String(255), nullable=True)
    placeholder = Column(String(255), nullable=True)
    help_text = Column(Text, nullable=True)
    required = Column(Boolean, nullable=False, default=False, server_default="false")
    sort_order = Column(Integer, nullable=False, default=100, server_default="100")
    is_visible = Column(Boolean, nullable=False, default=True, server_default="true")

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

    action_form = relationship(
        "DesignerActionForm",
        back_populates="fields",
    )
