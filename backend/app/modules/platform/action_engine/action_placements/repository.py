from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.action_engine.action_placements.models import (
    DesignerActionPlacement,
)


def list_action_placements(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
) -> list[DesignerActionPlacement]:
    return (
        db.query(DesignerActionPlacement)
        .filter(
            DesignerActionPlacement.tenant_id == tenant_id,
            DesignerActionPlacement.object_type_id == object_type_id,
            DesignerActionPlacement.action_definition_id == action_definition_id,
        )
        .order_by(
            DesignerActionPlacement.sort_order.asc(),
            DesignerActionPlacement.placement_key.asc(),
        )
        .all()
    )


def get_action_placement(
    db: Session,
    tenant_id: int,
    placement_id: UUID,
) -> DesignerActionPlacement | None:
    return (
        db.query(DesignerActionPlacement)
        .filter(
            DesignerActionPlacement.tenant_id == tenant_id,
            DesignerActionPlacement.id == placement_id,
        )
        .first()
    )


def get_by_placement_key(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    placement_key: str,
) -> DesignerActionPlacement | None:
    return (
        db.query(DesignerActionPlacement)
        .filter(
            DesignerActionPlacement.tenant_id == tenant_id,
            DesignerActionPlacement.object_type_id == object_type_id,
            DesignerActionPlacement.action_definition_id == action_definition_id,
            DesignerActionPlacement.placement_key == placement_key,
        )
        .first()
    )


def create_action_placement(
    db: Session,
    entity: DesignerActionPlacement,
) -> DesignerActionPlacement:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def save_action_placement(
    db: Session,
    entity: DesignerActionPlacement,
) -> DesignerActionPlacement:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def delete_action_placement(
    db: Session,
    entity: DesignerActionPlacement,
) -> None:
    db.delete(entity)
    db.commit()
