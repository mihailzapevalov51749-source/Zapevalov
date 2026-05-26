import uuid

from sqlalchemy import (
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
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class RuntimeEntity(Base):
    __tablename__ = "runtime_entities"

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

    object_type_key = Column(String(64), nullable=False)

    object_type_id = Column(UUID(as_uuid=True), nullable=True)

    catalog_version = Column(Integer, nullable=False)

    status = Column(String(32), nullable=False, default="active", server_default="active")

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

    values = relationship(
        "RuntimeEntityValue",
        back_populates="entity",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_runtime_entities_tenant_object_type_key", "tenant_id", "object_type_key"),
        Index("ix_runtime_entities_tenant_catalog_version", "tenant_id", "catalog_version"),
        Index("ix_runtime_entities_tenant_status", "tenant_id", "status"),
        Index("ix_runtime_entities_tenant_deleted_at", "tenant_id", "deleted_at"),
    )


class RuntimeEntityValue(Base):
    __tablename__ = "runtime_entity_values"

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

    entity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("runtime_entities.id", ondelete="CASCADE"),
        nullable=False,
    )

    field_key = Column(String(64), nullable=False)
    field_type = Column(String(32), nullable=False)
    value_json = Column(JSONB, nullable=True)

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

    entity = relationship("RuntimeEntity", back_populates="values")

    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "entity_id",
            "field_key",
            name="uq_runtime_entity_values_tenant_entity_field",
        ),
        Index("ix_runtime_entity_values_tenant_entity", "tenant_id", "entity_id"),
        Index("ix_runtime_entity_values_tenant_field_key", "tenant_id", "field_key"),
    )
