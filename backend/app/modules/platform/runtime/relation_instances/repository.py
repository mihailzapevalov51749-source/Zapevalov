from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session, aliased

from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance


def _active_query(db: Session, tenant_id: int):
    return db.query(RuntimeRelationInstance).filter(
        RuntimeRelationInstance.tenant_id == tenant_id,
        RuntimeRelationInstance.deleted_at.is_(None),
    )


def _active_graph_query(db: Session, tenant_id: int):
    source_entity = aliased(RuntimeEntity)
    target_entity = aliased(RuntimeEntity)

    return (
        db.query(RuntimeRelationInstance)
        .join(
            source_entity,
            RuntimeRelationInstance.source_entity_id == source_entity.id,
        )
        .join(
            target_entity,
            RuntimeRelationInstance.target_entity_id == target_entity.id,
        )
        .filter(
            RuntimeRelationInstance.tenant_id == tenant_id,
            RuntimeRelationInstance.deleted_at.is_(None),
            source_entity.tenant_id == tenant_id,
            source_entity.deleted_at.is_(None),
            target_entity.tenant_id == tenant_id,
            target_entity.deleted_at.is_(None),
        )
    )


def create_relation_instance(
    db: Session,
    instance: RuntimeRelationInstance,
) -> RuntimeRelationInstance:
    db.add(instance)
    db.flush()
    return instance


def get_relation_instance(
    db: Session,
    tenant_id: int,
    relation_instance_id: UUID,
    *,
    include_deleted: bool = False,
) -> RuntimeRelationInstance | None:
    query = db.query(RuntimeRelationInstance).filter(
        RuntimeRelationInstance.tenant_id == tenant_id,
        RuntimeRelationInstance.id == relation_instance_id,
    )

    if not include_deleted:
        query = query.filter(RuntimeRelationInstance.deleted_at.is_(None))

    return query.first()


def list_by_relation_key(
    db: Session,
    tenant_id: int,
    relation_key: str,
) -> list[RuntimeRelationInstance]:
    return (
        _active_graph_query(db, tenant_id)
        .filter(RuntimeRelationInstance.relation_key == relation_key)
        .order_by(RuntimeRelationInstance.created_at.desc())
        .all()
    )


def list_for_entity(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
) -> list[RuntimeRelationInstance]:
    return (
        _active_graph_query(db, tenant_id)
        .filter(
            (RuntimeRelationInstance.source_entity_id == entity_id)
            | (RuntimeRelationInstance.target_entity_id == entity_id),
        )
        .order_by(RuntimeRelationInstance.created_at.desc())
        .all()
    )


def list_outgoing(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
) -> list[RuntimeRelationInstance]:
    return (
        _active_graph_query(db, tenant_id)
        .filter(RuntimeRelationInstance.source_entity_id == entity_id)
        .order_by(RuntimeRelationInstance.created_at.desc())
        .all()
    )


def list_incoming(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
) -> list[RuntimeRelationInstance]:
    return (
        _active_graph_query(db, tenant_id)
        .filter(RuntimeRelationInstance.target_entity_id == entity_id)
        .order_by(RuntimeRelationInstance.created_at.desc())
        .all()
    )


def find_duplicate_active(
    db: Session,
    tenant_id: int,
    relation_key: str,
    source_entity_id: UUID,
    target_entity_id: UUID,
) -> RuntimeRelationInstance | None:
    return (
        _active_query(db, tenant_id)
        .filter(
            RuntimeRelationInstance.relation_key == relation_key,
            RuntimeRelationInstance.source_entity_id == source_entity_id,
            RuntimeRelationInstance.target_entity_id == target_entity_id,
        )
        .first()
    )


def check_one_to_one_constraints(
    db: Session,
    tenant_id: int,
    relation_key: str,
    source_entity_id: UUID,
    target_entity_id: UUID,
) -> str | None:
    """Return conflict reason if one_to_one rules violated, else None."""
    source_conflict = (
        _active_query(db, tenant_id)
        .filter(
            RuntimeRelationInstance.relation_key == relation_key,
            RuntimeRelationInstance.source_entity_id == source_entity_id,
            RuntimeRelationInstance.target_entity_id != target_entity_id,
        )
        .first()
    )
    if source_conflict:
        return (
            f"one_to_one: source entity уже связан с другим target "
            f"для relation '{relation_key}'"
        )

    target_conflict = (
        _active_query(db, tenant_id)
        .filter(
            RuntimeRelationInstance.relation_key == relation_key,
            RuntimeRelationInstance.target_entity_id == target_entity_id,
            RuntimeRelationInstance.source_entity_id != source_entity_id,
        )
        .first()
    )
    if target_conflict:
        return (
            f"one_to_one: target entity уже связан с другим source "
            f"для relation '{relation_key}'"
        )

    return None


def soft_delete_relation_instance(
    db: Session,
    instance: RuntimeRelationInstance,
) -> RuntimeRelationInstance:
    instance.deleted_at = datetime.now(timezone.utc)
    instance.updated_at = datetime.now(timezone.utc)
    db.flush()
    return instance


def commit(db: Session) -> None:
    db.commit()


def refresh(db: Session, instance: RuntimeRelationInstance) -> RuntimeRelationInstance:
    db.refresh(instance)
    return instance
