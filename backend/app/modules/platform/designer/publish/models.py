import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.db.base import Base
from app.modules.platform.shared.enums import PublishStatus


class DesignerMetadataSnapshot(Base):
    __tablename__ = "designer_metadata_snapshots"

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

    catalog_version = Column(Integer, nullable=False)
    schema_version = Column(Integer, nullable=False, default=1, server_default="1")

    payload = Column(JSONB, nullable=False)
    payload_hash = Column(String(64), nullable=False)

    published_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    published_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "uq_designer_metadata_snapshots_tenant_catalog_version",
            "tenant_id",
            "catalog_version",
            unique=True,
        ),
        Index(
            "ix_designer_metadata_snapshots_tenant_catalog_version_desc",
            "tenant_id",
            catalog_version.desc(),
        ),
        Index(
            "ix_designer_metadata_snapshots_tenant_published_at_desc",
            "tenant_id",
            published_at.desc(),
        ),
    )


class DesignerPublishRecord(Base):
    __tablename__ = "designer_publish_records"

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

    snapshot_id = Column(
        UUID(as_uuid=True),
        ForeignKey("designer_metadata_snapshots.id", ondelete="SET NULL"),
        nullable=True,
    )

    catalog_version = Column(Integer, nullable=True)

    status = Column(
        String(32),
        nullable=False,
        default=PublishStatus.SUCCESS.value,
    )

    summary_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    error_json = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))

    published_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    published_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "ix_designer_publish_records_tenant_published_at_desc",
            "tenant_id",
            published_at.desc(),
        ),
    )
