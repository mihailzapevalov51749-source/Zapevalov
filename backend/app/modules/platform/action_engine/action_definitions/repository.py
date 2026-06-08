from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.action_engine.action_definitions.models import (
    DesignerActionDefinition,
)


def list_action_definitions(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> list[DesignerActionDefinition]:
    return (
        db.query(DesignerActionDefinition)
        .filter(
            DesignerActionDefinition.tenant_id == tenant_id,
            DesignerActionDefinition.object_type_id == object_type_id,
        )
        .order_by(
            DesignerActionDefinition.name.asc(),
            DesignerActionDefinition.key.asc(),
        )
        .all()
    )


def get_action_definition(
    db: Session,
    tenant_id: int,
    action_definition_id: UUID,
) -> DesignerActionDefinition | None:
    return (
        db.query(DesignerActionDefinition)
        .filter(
            DesignerActionDefinition.tenant_id == tenant_id,
            DesignerActionDefinition.id == action_definition_id,
        )
        .first()
    )


def get_by_key(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    key: str,
) -> DesignerActionDefinition | None:
    return (
        db.query(DesignerActionDefinition)
        .filter(
            DesignerActionDefinition.tenant_id == tenant_id,
            DesignerActionDefinition.object_type_id == object_type_id,
            DesignerActionDefinition.key == key,
        )
        .first()
    )


def create_action_definition(
    db: Session,
    entity: DesignerActionDefinition,
) -> DesignerActionDefinition:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def save_action_definition(
    db: Session,
    entity: DesignerActionDefinition,
) -> DesignerActionDefinition:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def delete_action_definition(
    db: Session,
    entity: DesignerActionDefinition,
) -> None:
    db.delete(entity)
    db.commit()
