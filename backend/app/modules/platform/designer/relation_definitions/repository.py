from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.modules.platform.designer.relation_definitions.models import (
    DesignerRelationDefinition,
)


def list_relations(db: Session, tenant_id: int) -> list[DesignerRelationDefinition]:
    return (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .order_by(
            DesignerRelationDefinition.sort_order.asc(),
            DesignerRelationDefinition.name.asc(),
        )
        .all()
    )


def list_relations_for_object_type(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> list[DesignerRelationDefinition]:
    return (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.deleted_at.is_(None),
            or_(
                DesignerRelationDefinition.source_object_type_id == object_type_id,
                DesignerRelationDefinition.target_object_type_id == object_type_id,
            ),
        )
        .order_by(
            DesignerRelationDefinition.sort_order.asc(),
            DesignerRelationDefinition.name.asc(),
        )
        .all()
    )


def get_relation(
    db: Session,
    tenant_id: int,
    relation_id: UUID,
    *,
    include_deleted: bool = False,
) -> DesignerRelationDefinition | None:
    query = db.query(DesignerRelationDefinition).filter(
        DesignerRelationDefinition.tenant_id == tenant_id,
        DesignerRelationDefinition.id == relation_id,
    )

    if not include_deleted:
        query = query.filter(DesignerRelationDefinition.deleted_at.is_(None))

    return query.first()


def get_by_key(
    db: Session,
    tenant_id: int,
    key: str,
    *,
    include_deleted: bool = False,
) -> DesignerRelationDefinition | None:
    query = db.query(DesignerRelationDefinition).filter(
        DesignerRelationDefinition.tenant_id == tenant_id,
        DesignerRelationDefinition.key == key,
    )

    if not include_deleted:
        query = query.filter(DesignerRelationDefinition.deleted_at.is_(None))

    return query.first()


def create_relation(
    db: Session,
    entity: DesignerRelationDefinition,
) -> DesignerRelationDefinition:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def save_relation(
    db: Session,
    entity: DesignerRelationDefinition,
) -> DesignerRelationDefinition:
    db.commit()
    db.refresh(entity)
    return entity


def soft_delete_relation(
    db: Session,
    entity: DesignerRelationDefinition,
) -> DesignerRelationDefinition:
    entity.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(entity)
    return entity
