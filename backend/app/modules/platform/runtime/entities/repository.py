from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue


def create_entity(db: Session, entity: RuntimeEntity) -> RuntimeEntity:
    db.add(entity)
    db.flush()
    return entity


def create_entity_values(
    db: Session,
    value_rows: list[RuntimeEntityValue],
) -> list[RuntimeEntityValue]:
    db.add_all(value_rows)
    db.flush()
    return value_rows


def get_entity_values(db: Session, tenant_id: int, entity_id: UUID) -> list[RuntimeEntityValue]:
    return (
        db.query(RuntimeEntityValue)
        .filter(
            RuntimeEntityValue.tenant_id == tenant_id,
            RuntimeEntityValue.entity_id == entity_id,
        )
        .order_by(RuntimeEntityValue.field_key.asc())
        .all()
    )


def get_entity(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
    *,
    object_type_key: str | None = None,
    include_deleted: bool = False,
) -> RuntimeEntity | None:
    query = db.query(RuntimeEntity).filter(
        RuntimeEntity.tenant_id == tenant_id,
        RuntimeEntity.id == entity_id,
    )

    if object_type_key is not None:
        query = query.filter(RuntimeEntity.object_type_key == object_type_key)

    if not include_deleted:
        query = query.filter(RuntimeEntity.deleted_at.is_(None))

    return query.first()


def list_entities(
    db: Session,
    tenant_id: int,
    object_type_key: str,
) -> list[RuntimeEntity]:
    return (
        db.query(RuntimeEntity)
        .options(joinedload(RuntimeEntity.values))
        .filter(
            RuntimeEntity.tenant_id == tenant_id,
            RuntimeEntity.object_type_key == object_type_key,
            RuntimeEntity.deleted_at.is_(None),
        )
        .order_by(RuntimeEntity.created_at.desc())
        .all()
    )


def get_entity_value_row(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
    field_key: str,
) -> RuntimeEntityValue | None:
    return (
        db.query(RuntimeEntityValue)
        .filter(
            RuntimeEntityValue.tenant_id == tenant_id,
            RuntimeEntityValue.entity_id == entity_id,
            RuntimeEntityValue.field_key == field_key,
        )
        .first()
    )


def update_entity_value(
    db: Session,
    value_row: RuntimeEntityValue,
    *,
    value_json,
    field_type: str,
) -> RuntimeEntityValue:
    value_row.value_json = value_json
    value_row.field_type = field_type
    value_row.updated_at = datetime.now(timezone.utc)
    db.flush()
    return value_row


def insert_entity_value(db: Session, value_row: RuntimeEntityValue) -> RuntimeEntityValue:
    db.add(value_row)
    db.flush()
    return value_row


def touch_entity(
    db: Session,
    entity: RuntimeEntity,
    *,
    updated_by: int | None = None,
) -> RuntimeEntity:
    entity.updated_at = datetime.now(timezone.utc)
    if updated_by is not None:
        entity.updated_by = updated_by
    db.flush()
    return entity


def soft_delete_entity(db: Session, entity: RuntimeEntity) -> RuntimeEntity:
    entity.deleted_at = datetime.now(timezone.utc)
    entity.updated_at = datetime.now(timezone.utc)
    db.flush()
    return entity


def commit(db: Session) -> None:
    db.commit()


def refresh_entity(db: Session, entity: RuntimeEntity) -> RuntimeEntity:
    db.refresh(entity)
    return entity
