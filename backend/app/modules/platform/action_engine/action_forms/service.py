from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.platform.action_engine.action_definitions import (
    repository as action_definition_repository,
)
from app.modules.platform.action_engine.action_forms import repository
from app.modules.platform.action_engine.action_forms.models import (
    DesignerActionForm,
    DesignerActionFormField,
)
from app.modules.platform.action_engine.action_forms.schemas import (
    ActionFormCreate,
    ActionFormFieldCreate,
    ActionFormFieldRead,
    ActionFormFieldUpdate,
    ActionFormRead,
    ActionFormUpdate,
)
from app.modules.platform.designer.field_definitions import (
    repository as field_definition_repository,
)
from app.modules.platform.designer.object_types import repository as object_type_repository
from app.modules.users.models import User
from app.modules.publication_guard.structure_write_service_guard import guard_direct_structure_write


def _actor_user_id(current_user: User | None) -> int | None:
    return current_user.id if current_user else None


def _touch_parent_object_type(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    current_user: User | None = None,
) -> None:
    object_type_repository.touch_object_type_updated_at(
        db,
        tenant_id,
        object_type_id,
        updated_by=_actor_user_id(current_user),
    )


def _ensure_object_type(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> None:
    object_type = object_type_repository.get_object_type(
        db,
        tenant_id,
        object_type_id,
    )
    if not object_type:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ObjectType не найден",
        )


def _get_scoped_action_definition(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
):
    _ensure_object_type(db, tenant_id, object_type_id)
    entity = action_definition_repository.get_action_definition(
        db,
        tenant_id,
        action_definition_id,
    )
    if not entity or entity.object_type_id != object_type_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionDefinition не найден",
        )
    return entity


def _ensure_action_definition_mutable(action_definition) -> None:
    if action_definition.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Форму системного действия нельзя изменять",
        )


def _resolve_form_fields_object_type_id(action_definition) -> UUID:
    if action_definition.action_type_key == "create_record":
        target_id = action_definition.target_object_type_id
        if target_id:
            return target_id
    return action_definition.object_type_id


def _ensure_field_definition(
    db: Session,
    tenant_id: int,
    fields_object_type_id: UUID,
    field_definition_id: UUID,
):
    field_definition = field_definition_repository.get_field(
        db,
        tenant_id,
        field_definition_id,
    )
    if (
        not field_definition
        or field_definition.object_type_id != fields_object_type_id
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="FieldDefinition не найден для ObjectType",
        )
    return field_definition


def _to_field_read(
    entity: DesignerActionFormField,
    field_definition=None,
) -> ActionFormFieldRead:
    payload = ActionFormFieldRead.model_validate(entity)
    if field_definition is not None:
        return payload.model_copy(
            update={
                "field_key": field_definition.key,
                "field_name": field_definition.name,
            },
        )
    return payload


def _to_form_read(
    db: Session,
    tenant_id: int,
    entity: DesignerActionForm,
    *,
    action_definition=None,
) -> ActionFormRead:
    if action_definition is None:
        action_definition = action_definition_repository.get_action_definition(
            db,
            tenant_id,
            entity.action_definition_id,
        )
    fields_object_type_id = (
        _resolve_form_fields_object_type_id(action_definition)
        if action_definition
        else entity.object_type_id
    )

    field_definition_ids = [row.field_definition_id for row in entity.fields]
    field_definitions = (
        field_definition_repository.list_fields_by_ids(
            db,
            tenant_id,
            fields_object_type_id,
            field_definition_ids,
        )
        if field_definition_ids
        else []
    )
    field_definition_by_id = {row.id: row for row in field_definitions}

    fields = [
        _to_field_read(row, field_definition_by_id.get(row.field_definition_id))
        for row in sorted(entity.fields, key=lambda item: (item.sort_order, str(item.id)))
    ]

    return ActionFormRead.model_validate(entity).model_copy(update={"fields": fields})


def get_action_form(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
) -> ActionFormRead | None:
    _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    entity = repository.get_action_form_by_action_definition(
        db,
        tenant_id,
        action_definition_id,
    )
    if not entity:
        return None
    return _to_form_read(db, tenant_id, entity)


def create_action_form(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    payload: ActionFormCreate,
    current_user: User | None = None,
) -> ActionFormRead:
    guard_direct_structure_write(db, tenant_id, "create_action_form")
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    _ensure_action_definition_mutable(action_definition)

    if repository.get_action_form_by_action_definition(
        db,
        tenant_id,
        action_definition_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ActionForm уже существует для ActionDefinition",
        )

    entity = DesignerActionForm(
        tenant_id=tenant_id,
        object_type_id=object_type_id,
        action_definition_id=action_definition_id,
        title=payload.title,
        description=payload.description,
        submit_label=payload.submit_label,
        cancel_label=payload.cancel_label,
        is_active=payload.is_active,
    )

    try:
        entity = repository.create_action_form(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ActionForm уже существует для ActionDefinition",
        ) from exc

    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
    return _to_form_read(db, tenant_id, entity)


def update_action_form(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    payload: ActionFormUpdate,
    current_user: User | None = None,
) -> ActionFormRead:
    guard_direct_structure_write(db, tenant_id, "update_action_form")
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    _ensure_action_definition_mutable(action_definition)

    entity = repository.get_action_form_by_action_definition(
        db,
        tenant_id,
        action_definition_id,
    )
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionForm не найден",
        )

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Нет полей для обновления",
        )

    for field, value in updates.items():
        setattr(entity, field, value)

    entity = repository.save_action_form(db, entity)
    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
    return _to_form_read(db, tenant_id, entity)


def delete_action_form(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    current_user: User | None = None,
) -> None:
    guard_direct_structure_write(db, tenant_id, "delete_action_form")
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    _ensure_action_definition_mutable(action_definition)

    entity = repository.get_action_form_by_action_definition(
        db,
        tenant_id,
        action_definition_id,
    )
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionForm не найден",
        )

    repository.delete_action_form(db, entity)
    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)


def list_action_form_fields(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
) -> list[ActionFormFieldRead]:
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    entity = repository.get_action_form_by_action_definition(
        db,
        tenant_id,
        action_definition.id,
    )
    if not entity:
        return []

    field_definition_ids = [row.field_definition_id for row in entity.fields]
    field_definitions = field_definition_repository.list_fields_by_ids(
        db,
        tenant_id,
        object_type_id,
        field_definition_ids,
    )
    field_definition_by_id = {row.id: row for row in field_definitions}

    return [
        _to_field_read(row, field_definition_by_id.get(row.field_definition_id))
        for row in repository.list_action_form_fields(db, tenant_id, entity.id)
    ]


def create_action_form_field(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    payload: ActionFormFieldCreate,
    current_user: User | None = None,
) -> ActionFormFieldRead:
    guard_direct_structure_write(db, tenant_id, "create_action_form_field")
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    _ensure_action_definition_mutable(action_definition)

    form_entity = repository.get_action_form_by_action_definition(
        db,
        tenant_id,
        action_definition_id,
    )
    if not form_entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionForm не найден",
        )

    fields_object_type_id = _resolve_form_fields_object_type_id(action_definition)
    field_definition = _ensure_field_definition(
        db,
        tenant_id,
        fields_object_type_id,
        payload.field_definition_id,
    )

    if repository.get_action_form_field_by_definition(
        db,
        tenant_id,
        form_entity.id,
        payload.field_definition_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Поле уже добавлено в ActionForm",
        )

    entity = DesignerActionFormField(
        tenant_id=tenant_id,
        action_form_id=form_entity.id,
        field_definition_id=payload.field_definition_id,
        label_override=payload.label_override,
        placeholder=payload.placeholder,
        help_text=payload.help_text,
        required=payload.required,
        sort_order=payload.sort_order,
        is_visible=payload.is_visible,
    )

    try:
        entity = repository.create_action_form_field(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Поле уже добавлено в ActionForm",
        ) from exc

    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
    return _to_field_read(entity, field_definition)


def update_action_form_field(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    field_id: UUID,
    payload: ActionFormFieldUpdate,
    current_user: User | None = None,
) -> ActionFormFieldRead:
    guard_direct_structure_write(db, tenant_id, "update_action_form_field")
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    _ensure_action_definition_mutable(action_definition)

    form_entity = repository.get_action_form_by_action_definition(
        db,
        tenant_id,
        action_definition_id,
    )
    if not form_entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionForm не найден",
        )

    entity = repository.get_action_form_field(db, tenant_id, field_id)
    if not entity or entity.action_form_id != form_entity.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionFormField не найден",
        )

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Нет полей для обновления",
        )

    for field, value in updates.items():
        setattr(entity, field, value)

    entity = repository.save_action_form_field(db, entity)
    field_definition = field_definition_repository.get_field(
        db,
        tenant_id,
        entity.field_definition_id,
    )
    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
    return _to_field_read(entity, field_definition)


def delete_action_form_field(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    field_id: UUID,
    current_user: User | None = None,
) -> None:
    guard_direct_structure_write(db, tenant_id, "delete_action_form_field")
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    _ensure_action_definition_mutable(action_definition)

    form_entity = repository.get_action_form_by_action_definition(
        db,
        tenant_id,
        action_definition_id,
    )
    if not form_entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionForm не найден",
        )

    entity = repository.get_action_form_field(db, tenant_id, field_id)
    if not entity or entity.action_form_id != form_entity.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionFormField не найден",
        )

    repository.delete_action_form_field(db, entity)
    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
