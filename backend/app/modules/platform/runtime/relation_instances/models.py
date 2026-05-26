import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class RuntimeRelationInstance(Base):
    __tablename__ = "runtime_relation_instances"

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

    relation_key = Column(String(64), nullable=False)
    relation_id = Column(UUID(as_uuid=True), nullable=True)
    catalog_version = Column(Integer, nullable=False)

    source_entity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("runtime_entities.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_entity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("runtime_entities.id", ondelete="CASCADE"),
        nullable=False,
    )

    source_object_type_key = Column(String(64), nullable=False)
    target_object_type_key = Column(String(64), nullable=False)

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

    __table_args__ = (
        Index(
            "ix_runtime_relation_instances_tenant_relation_key",
            "tenant_id",
            "relation_key",
        ),
        Index(
            "ix_runtime_relation_instances_tenant_source_entity",
            "tenant_id",
            "source_entity_id",
        ),
        Index(
            "ix_runtime_relation_instances_tenant_target_entity",
            "tenant_id",
            "target_entity_id",
        ),
        Index(
            "ix_runtime_relation_instances_tenant_catalog_version",
            "tenant_id",
            "catalog_version",
        ),
        Index("ix_runtime_relation_instances_tenant_status", "tenant_id", "status"),
        Index(
            "ix_runtime_relation_instances_tenant_deleted_at",
            "tenant_id",
            "deleted_at",
        ),
    )
