from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.designer.object_types.models import DesignerObjectType


def list_object_types(db: Session, tenant_id: int) -> list[DesignerObjectType]:
    return (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .order_by(
            DesignerObjectType.sort_order.asc(),
            DesignerObjectType.name.asc(),
        )
        .all()
    )


def get_object_type(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    *,
    include_deleted: bool = False,
) -> DesignerObjectType | None:
    query = db.query(DesignerObjectType).filter(
        DesignerObjectType.tenant_id == tenant_id,
        DesignerObjectType.id == object_type_id,
    )

    if not include_deleted:
        query = query.filter(DesignerObjectType.deleted_at.is_(None))

    return query.first()


def get_by_key(
    db: Session,
    tenant_id: int,
    key: str,
    *,
    include_deleted: bool = False,
) -> DesignerObjectType | None:
    query = db.query(DesignerObjectType).filter(
        DesignerObjectType.tenant_id == tenant_id,
        DesignerObjectType.key == key,
    )

    if not include_deleted:
        query = query.filter(DesignerObjectType.deleted_at.is_(None))

    return query.first()


def create_object_type(
    db: Session,
    entity: DesignerObjectType,
) -> DesignerObjectType:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def save_object_type(
    db: Session,
    entity: DesignerObjectType,
) -> DesignerObjectType:
    db.commit()
    db.refresh(entity)
    return entity


def soft_delete_object_type(
    db: Session,
    entity: DesignerObjectType,
) -> DesignerObjectType:
    entity.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(entity)
    return entity
