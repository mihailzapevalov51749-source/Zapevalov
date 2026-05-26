from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.platform.designer.publish.models import (
    DesignerMetadataSnapshot,
    DesignerPublishRecord,
)
from app.modules.platform.designer.object_types.models import DesignerObjectType


def get_max_catalog_version(db: Session, tenant_id: int) -> int:
    value = (
        db.query(func.max(DesignerMetadataSnapshot.catalog_version))
        .filter(DesignerMetadataSnapshot.tenant_id == tenant_id)
        .scalar()
    )
    return int(value or 0)


def get_latest_snapshot(
    db: Session,
    tenant_id: int,
) -> DesignerMetadataSnapshot | None:
    return (
        db.query(DesignerMetadataSnapshot)
        .filter(DesignerMetadataSnapshot.tenant_id == tenant_id)
        .order_by(DesignerMetadataSnapshot.catalog_version.desc())
        .first()
    )


def insert_snapshot(
    db: Session,
    entity: DesignerMetadataSnapshot,
) -> DesignerMetadataSnapshot:
    db.add(entity)
    db.flush()
    return entity


def insert_publish_record(
    db: Session,
    entity: DesignerPublishRecord,
) -> DesignerPublishRecord:
    db.add(entity)
    db.flush()
    return entity


def get_latest_publish_record(
    db: Session,
    tenant_id: int,
) -> DesignerPublishRecord | None:
    return (
        db.query(DesignerPublishRecord)
        .filter(DesignerPublishRecord.tenant_id == tenant_id)
        .order_by(DesignerPublishRecord.published_at.desc())
        .first()
    )


def list_publish_records(
    db: Session,
    tenant_id: int,
    *,
    limit: int = 50,
) -> list[DesignerPublishRecord]:
    return (
        db.query(DesignerPublishRecord)
        .filter(DesignerPublishRecord.tenant_id == tenant_id)
        .order_by(DesignerPublishRecord.published_at.desc())
        .limit(limit)
        .all()
    )


def get_publish_record(
    db: Session,
    tenant_id: int,
    record_id: UUID,
) -> DesignerPublishRecord | None:
    return (
        db.query(DesignerPublishRecord)
        .filter(
            DesignerPublishRecord.tenant_id == tenant_id,
            DesignerPublishRecord.id == record_id,
        )
        .first()
    )


def touch_object_types_last_published_at(
    db: Session,
    tenant_id: int,
    *,
    published_at: datetime | None = None,
) -> None:
    timestamp = published_at or datetime.now(timezone.utc)

    (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .update(
            {DesignerObjectType.last_published_at: timestamp},
            synchronize_session=False,
        )
    )
