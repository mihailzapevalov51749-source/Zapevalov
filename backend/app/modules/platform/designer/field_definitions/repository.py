from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition


def list_fields(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> list[DesignerFieldDefinition]:
    return (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == tenant_id,
            DesignerFieldDefinition.object_type_id == object_type_id,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .order_by(
            DesignerFieldDefinition.sort_order.asc(),
            DesignerFieldDefinition.name.asc(),
        )
        .all()
    )


def get_field(
    db: Session,
    tenant_id: int,
    field_id: UUID,
    *,
    include_deleted: bool = False,
) -> DesignerFieldDefinition | None:
    query = db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == tenant_id,
        DesignerFieldDefinition.id == field_id,
    )

    if not include_deleted:
        query = query.filter(DesignerFieldDefinition.deleted_at.is_(None))

    return query.first()


def get_by_key(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    key: str,
    *,
    include_deleted: bool = False,
) -> DesignerFieldDefinition | None:
    query = db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == tenant_id,
        DesignerFieldDefinition.object_type_id == object_type_id,
        DesignerFieldDefinition.key == key,
    )

    if not include_deleted:
        query = query.filter(DesignerFieldDefinition.deleted_at.is_(None))

    return query.first()


def list_fields_by_ids(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    field_ids: list[UUID],
) -> list[DesignerFieldDefinition]:
    if not field_ids:
        return []

    return (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == tenant_id,
            DesignerFieldDefinition.object_type_id == object_type_id,
            DesignerFieldDefinition.id.in_(field_ids),
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .all()
    )


def create_field(
    db: Session,
    entity: DesignerFieldDefinition,
) -> DesignerFieldDefinition:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def save_field(
    db: Session,
    entity: DesignerFieldDefinition,
) -> DesignerFieldDefinition:
    db.commit()
    db.refresh(entity)
    return entity


def save_fields(
    db: Session,
    entities: list[DesignerFieldDefinition],
) -> list[DesignerFieldDefinition]:
    db.commit()
    for entity in entities:
        db.refresh(entity)
    return entities


def soft_delete_field(
    db: Session,
    entity: DesignerFieldDefinition,
) -> DesignerFieldDefinition:
    entity.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(entity)
    return entity
