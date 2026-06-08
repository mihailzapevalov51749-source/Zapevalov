from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.modules.platform.action_engine.action_forms.models import (
    DesignerActionForm,
    DesignerActionFormField,
)


def get_action_form_by_action_definition(
    db: Session,
    tenant_id: int,
    action_definition_id: UUID,
) -> DesignerActionForm | None:
    return (
        db.query(DesignerActionForm)
        .options(joinedload(DesignerActionForm.fields))
        .filter(
            DesignerActionForm.tenant_id == tenant_id,
            DesignerActionForm.action_definition_id == action_definition_id,
        )
        .first()
    )


def get_action_form(
    db: Session,
    tenant_id: int,
    form_id: UUID,
) -> DesignerActionForm | None:
    return (
        db.query(DesignerActionForm)
        .options(joinedload(DesignerActionForm.fields))
        .filter(
            DesignerActionForm.tenant_id == tenant_id,
            DesignerActionForm.id == form_id,
        )
        .first()
    )


def list_action_form_fields(
    db: Session,
    tenant_id: int,
    action_form_id: UUID,
) -> list[DesignerActionFormField]:
    return (
        db.query(DesignerActionFormField)
        .filter(
            DesignerActionFormField.tenant_id == tenant_id,
            DesignerActionFormField.action_form_id == action_form_id,
        )
        .order_by(
            DesignerActionFormField.sort_order.asc(),
            DesignerActionFormField.created_at.asc(),
        )
        .all()
    )


def get_action_form_field(
    db: Session,
    tenant_id: int,
    field_id: UUID,
) -> DesignerActionFormField | None:
    return (
        db.query(DesignerActionFormField)
        .filter(
            DesignerActionFormField.tenant_id == tenant_id,
            DesignerActionFormField.id == field_id,
        )
        .first()
    )


def get_action_form_field_by_definition(
    db: Session,
    tenant_id: int,
    action_form_id: UUID,
    field_definition_id: UUID,
) -> DesignerActionFormField | None:
    return (
        db.query(DesignerActionFormField)
        .filter(
            DesignerActionFormField.tenant_id == tenant_id,
            DesignerActionFormField.action_form_id == action_form_id,
            DesignerActionFormField.field_definition_id == field_definition_id,
        )
        .first()
    )


def create_action_form(db: Session, entity: DesignerActionForm) -> DesignerActionForm:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def save_action_form(db: Session, entity: DesignerActionForm) -> DesignerActionForm:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def delete_action_form(db: Session, entity: DesignerActionForm) -> None:
    db.delete(entity)
    db.commit()


def create_action_form_field(
    db: Session,
    entity: DesignerActionFormField,
) -> DesignerActionFormField:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def save_action_form_field(
    db: Session,
    entity: DesignerActionFormField,
) -> DesignerActionFormField:
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def delete_action_form_field(db: Session, entity: DesignerActionFormField) -> None:
    db.delete(entity)
    db.commit()
