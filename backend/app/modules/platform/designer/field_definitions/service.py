from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.platform.designer.field_definitions import repository
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.field_definitions.schemas import (
    FieldDefinitionCreate,
    FieldDefinitionListItem,
    FieldDefinitionRead,
    FieldDefinitionReorderRequest,
    FieldDefinitionUpdate,
    validate_field_update_payload,
)
from app.modules.platform.designer.object_types import repository as object_type_repository
from app.modules.platform.shared.enums import FieldType
from app.modules.users.models import User


def _actor_user_id(current_user: User | None) -> int | None:
    return current_user.id if current_user else None


def _to_read(entity: DesignerFieldDefinition) -> FieldDefinitionRead:
    return FieldDefinitionRead(
        id=entity.id,
        tenant_id=entity.tenant_id,
        object_type_id=entity.object_type_id,
        key=entity.key,
        name=entity.name,
        description=entity.description,
        field_type=entity.field_type,
        sort_order=entity.sort_order,
        is_required=entity.is_required,
        is_unique=entity.is_unique,
        is_system=entity.is_system,
        default_value_json=entity.default_value_json,
        settings_json=entity.settings_json or {},
        validation_json=entity.validation_json or {},
        visibility_json=entity.visibility_json or {},
        draft_revision=entity.draft_revision,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        deleted_at=entity.deleted_at,
    )


def _to_list_item(entity: DesignerFieldDefinition) -> FieldDefinitionListItem:
    return FieldDefinitionListItem(**_to_read(entity).model_dump())


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


def list_fields(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> list[FieldDefinitionListItem]:
    _ensure_object_type(db, tenant_id, object_type_id)
    entities = repository.list_fields(db, tenant_id, object_type_id)
    return [_to_list_item(entity) for entity in entities]


def get_field(
    db: Session,
    tenant_id: int,
    field_id: UUID,
) -> FieldDefinitionRead:
    entity = repository.get_field(db, tenant_id, field_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FieldDefinition не найден",
        )

    return _to_read(entity)


def create_field(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    payload: FieldDefinitionCreate,
    current_user: User | None,
) -> FieldDefinitionRead:
    _ensure_object_type(db, tenant_id, object_type_id)

    if repository.get_by_key(db, tenant_id, object_type_id, payload.key):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="FieldDefinition с таким key уже существует для ObjectType",
        )

    user_id = _actor_user_id(current_user)

    entity = DesignerFieldDefinition(
        tenant_id=tenant_id,
        object_type_id=object_type_id,
        key=payload.key,
        name=payload.name,
        description=payload.description,
        field_type=payload.field_type.value,
        sort_order=payload.sort_order,
        is_required=payload.is_required,
        is_unique=payload.is_unique,
        is_system=False,
        default_value_json=payload.default_value_json,
        settings_json=payload.settings_json,
        validation_json=payload.validation_json,
        visibility_json=payload.visibility_json,
        created_by=user_id,
        updated_by=user_id,
    )

    try:
        entity = repository.create_field(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="FieldDefinition с таким key уже существует для ObjectType",
        ) from exc

    return _to_read(entity)


def update_field(
    db: Session,
    tenant_id: int,
    field_id: UUID,
    payload: FieldDefinitionUpdate,
    current_user: User | None,
) -> FieldDefinitionRead:
    entity = repository.get_field(db, tenant_id, field_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FieldDefinition не найден",
        )

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Нет полей для обновления",
        )

    if "draft_revision" in updates and updates["draft_revision"] != entity.draft_revision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Конфликт версии draft_revision",
        )

    effective_field_type = FieldType(
        updates.get("field_type", entity.field_type),
    )
    effective_settings = (
        updates["settings_json"]
        if "settings_json" in updates
        else (entity.settings_json or {})
    )
    effective_default = (
        updates["default_value_json"]
        if "default_value_json" in updates
        else entity.default_value_json
    )

    if any(
        key in updates
        for key in ("field_type", "settings_json", "default_value_json")
    ):
        try:
            validate_field_update_payload(
                field_type=effective_field_type,
                default_value_json=effective_default,
                settings_json=effective_settings,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

    if "key" in updates:
        new_key = updates["key"]
        if new_key is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="key не может быть null",
            )
        if new_key != entity.key:
            existing = repository.get_by_key(
                db,
                tenant_id,
                entity.object_type_id,
                new_key,
            )
            if existing and existing.id != entity.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="FieldDefinition с таким key уже существует для ObjectType",
                )
            entity.key = new_key

    if "name" in updates:
        entity.name = updates["name"]
    if "description" in updates:
        entity.description = updates["description"]
    if "field_type" in updates:
        entity.field_type = updates["field_type"].value
    if "sort_order" in updates:
        entity.sort_order = updates["sort_order"]
    if "is_required" in updates:
        entity.is_required = updates["is_required"]
    if "is_unique" in updates:
        entity.is_unique = updates["is_unique"]
    if "default_value_json" in updates:
        entity.default_value_json = updates["default_value_json"]
    if "settings_json" in updates:
        entity.settings_json = updates["settings_json"]
    if "validation_json" in updates:
        entity.validation_json = updates["validation_json"]
    if "visibility_json" in updates:
        entity.visibility_json = updates["visibility_json"]

    entity.updated_by = _actor_user_id(current_user)
    entity.draft_revision = entity.draft_revision + 1

    try:
        entity = repository.save_field(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="FieldDefinition с таким key уже существует для ObjectType",
        ) from exc

    return _to_read(entity)


def delete_field(
    db: Session,
    tenant_id: int,
    field_id: UUID,
    current_user: User | None,
) -> FieldDefinitionRead:
    entity = repository.get_field(db, tenant_id, field_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FieldDefinition не найден",
        )

    if entity.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Системное поле нельзя удалить",
        )

    entity.updated_by = _actor_user_id(current_user)
    entity = repository.soft_delete_field(db, entity)
    return _to_read(entity)


def reorder_fields(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    payload: FieldDefinitionReorderRequest,
    current_user: User | None,
) -> list[FieldDefinitionListItem]:
    _ensure_object_type(db, tenant_id, object_type_id)

    field_ids = [item.id for item in payload.items]
    entities = repository.list_fields_by_ids(
        db,
        tenant_id,
        object_type_id,
        field_ids,
    )

    if len(entities) != len(field_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Не все поля принадлежат указанному tenant и ObjectType",
        )

    sort_by_id = {item.id: item.sort_order for item in payload.items}
    user_id = _actor_user_id(current_user)

    for entity in entities:
        entity.sort_order = sort_by_id[entity.id]
        entity.updated_by = user_id
        entity.draft_revision = entity.draft_revision + 1

    entities = repository.save_fields(db, entities)
    entities.sort(key=lambda row: (row.sort_order, row.name))

    return [_to_list_item(entity) for entity in entities]
