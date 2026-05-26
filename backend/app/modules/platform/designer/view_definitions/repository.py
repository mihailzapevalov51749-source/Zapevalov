from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition


def list_views(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> list[DesignerViewDefinition]:
    return (
        db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.object_type_id == object_type_id,
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .order_by(
            DesignerViewDefinition.sort_order.asc(),
            DesignerViewDefinition.name.asc(),
        )
        .all()
    )


def count_active_views(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    *,
    exclude_view_id: UUID | None = None,
) -> int:
    query = db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == tenant_id,
        DesignerViewDefinition.object_type_id == object_type_id,
        DesignerViewDefinition.deleted_at.is_(None),
        DesignerViewDefinition.is_active.is_(True),
    )

    if exclude_view_id is not None:
        query = query.filter(DesignerViewDefinition.id != exclude_view_id)

    return query.count()


def get_view(
    db: Session,
    tenant_id: int,
    view_id: UUID,
    *,
    include_deleted: bool = False,
) -> DesignerViewDefinition | None:
    query = db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == tenant_id,
        DesignerViewDefinition.id == view_id,
    )

    if not include_deleted:
        query = query.filter(DesignerViewDefinition.deleted_at.is_(None))

    return query.first()


def get_by_key(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    key: str,
    *,
    include_deleted: bool = False,
) -> DesignerViewDefinition | None:
    query = db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == tenant_id,
        DesignerViewDefinition.object_type_id == object_type_id,
        DesignerViewDefinition.key == key,
    )

    if not include_deleted:
        query = query.filter(DesignerViewDefinition.deleted_at.is_(None))

    return query.first()


def list_views_by_ids(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    view_ids: list[UUID],
) -> list[DesignerViewDefinition]:
    if not view_ids:
        return []

    return (
        db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.object_type_id == object_type_id,
            DesignerViewDefinition.id.in_(view_ids),
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .all()
    )


def clear_default_views(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    *,
    except_view_id: UUID | None = None,
) -> None:
    query = db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == tenant_id,
        DesignerViewDefinition.object_type_id == object_type_id,
        DesignerViewDefinition.deleted_at.is_(None),
        DesignerViewDefinition.is_default.is_(True),
    )

    if except_view_id is not None:
        query = query.filter(DesignerViewDefinition.id != except_view_id)

    for row in query.all():
        row.is_default = False


def create_view(
    db: Session,
    entity: DesignerViewDefinition,
) -> DesignerViewDefinition:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def save_view(
    db: Session,
    entity: DesignerViewDefinition,
) -> DesignerViewDefinition:
    db.commit()
    db.refresh(entity)
    return entity


def save_views(
    db: Session,
    entities: list[DesignerViewDefinition],
) -> list[DesignerViewDefinition]:
    db.commit()
    for entity in entities:
        db.refresh(entity)
    return entities


def soft_delete_view(
    db: Session,
    entity: DesignerViewDefinition,
) -> DesignerViewDefinition:
    entity.deleted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(entity)
    return entity
