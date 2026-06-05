from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.relation_definitions.models import (
    DesignerRelationDefinition,
)
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition


def count_dependency_totals_by_object_type(
    db: Session,
    tenant_id: int,
    object_type_ids: list[UUID],
) -> dict[UUID, dict[str, int]]:
    if not object_type_ids:
        return {}

    field_rows = (
        db.query(
            DesignerFieldDefinition.object_type_id,
            func.count(DesignerFieldDefinition.id),
        )
        .filter(
            DesignerFieldDefinition.tenant_id == tenant_id,
            DesignerFieldDefinition.object_type_id.in_(object_type_ids),
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .group_by(DesignerFieldDefinition.object_type_id)
        .all()
    )

    view_rows = (
        db.query(
            DesignerViewDefinition.object_type_id,
            func.count(DesignerViewDefinition.id),
        )
        .filter(
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.object_type_id.in_(object_type_ids),
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .group_by(DesignerViewDefinition.object_type_id)
        .all()
    )

    relation_source_rows = (
        db.query(
            DesignerRelationDefinition.source_object_type_id,
            func.count(DesignerRelationDefinition.id),
        )
        .filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.source_object_type_id.in_(object_type_ids),
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .group_by(DesignerRelationDefinition.source_object_type_id)
        .all()
    )

    relation_target_rows = (
        db.query(
            DesignerRelationDefinition.target_object_type_id,
            func.count(DesignerRelationDefinition.id),
        )
        .filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.target_object_type_id.in_(object_type_ids),
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .group_by(DesignerRelationDefinition.target_object_type_id)
        .all()
    )

    totals: dict[UUID, dict[str, int]] = {
        object_type_id: {"fields": 0, "views": 0, "relations": 0}
        for object_type_id in object_type_ids
    }

    for object_type_id, count in field_rows:
        totals[object_type_id]["fields"] = int(count)

    for object_type_id, count in view_rows:
        totals[object_type_id]["views"] = int(count)

    for object_type_id, count in relation_source_rows:
        totals[object_type_id]["relations"] += int(count)

    for object_type_id, count in relation_target_rows:
        totals[object_type_id]["relations"] += int(count)

    return totals


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
    if entity.deleted_at is None:
        entity.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(entity)
    return entity


def touch_object_type_updated_at(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    *,
    updated_by: int | None = None,
) -> None:
    """Bump parent ObjectType.updated_at when child schema (fields/views/…) changes."""
    entity = get_object_type(db, tenant_id, object_type_id)
    if not entity:
        return

    now = datetime.now(timezone.utc)
    if entity.last_published_at is not None and now <= entity.last_published_at:
        now = entity.last_published_at + timedelta(microseconds=1)

    values: dict = {DesignerObjectType.updated_at: now}

    if updated_by is not None:
        values[DesignerObjectType.updated_by] = updated_by

    (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.id == object_type_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .update(values, synchronize_session=False)
    )
    db.commit()
