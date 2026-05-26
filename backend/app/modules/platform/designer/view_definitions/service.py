from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.platform.designer.object_types import repository as object_type_repository
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.view_definitions import repository
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.view_definitions.schemas import (
    ViewDefinitionCreate,
    ViewDefinitionListItem,
    ViewDefinitionRead,
    ViewDefinitionReorderRequest,
    ViewDefinitionUpdate,
)
from app.modules.users.models import User


def _actor_user_id(current_user: User | None) -> int | None:
    return current_user.id if current_user else None


def _validate_projection_metadata(
    *,
    settings_json: dict[str, Any],
    context: str,
) -> dict[str, Any]:
    """
    Validates/normalizes `settings_json.projection` contract.

    Backward compatible: if `projection` is missing -> settings_json unchanged.
    """
    if not isinstance(settings_json, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{context}: settings_json должен быть объектом",
        )

    projection = settings_json.get("projection", None)

    # Backward compatibility: old views had no projection yet.
    if projection is None:
        return settings_json

    if not isinstance(projection, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{context}: settings_json.projection должен быть объектом",
        )

    visible_fields = projection.get("visible_fields", None)
    field_order = projection.get("field_order", None)
    title_field = projection.get("title_field", None)
    default_sort = projection.get("default_sort", None)

    if visible_fields is None:
        visible_fields_norm: list[str] = []
    else:
        if not isinstance(visible_fields, list) or not all(
            isinstance(x, str) for x in visible_fields
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{context}: visible_fields должен быть list[str]",
            )
        visible_fields_norm = visible_fields

    if field_order is None:
        field_order_norm: list[str] = []
    else:
        if not isinstance(field_order, list) or not all(
            isinstance(x, str) for x in field_order
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{context}: field_order должен быть list[str]",
            )
        field_order_norm = field_order

    if title_field is None:
        title_field_norm: str | None = None
    else:
        if not isinstance(title_field, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{context}: title_field должен быть string или null",
            )
        title_field_norm = title_field

    default_sort_norm: dict[str, Any]
    if default_sort is None:
        default_sort_norm = {"field": None, "order": "desc"}
    else:
        if not isinstance(default_sort, dict):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{context}: default_sort должен быть объектом",
            )

        sort_field = default_sort.get("field", None)
        sort_order = default_sort.get("order", "desc")

        if sort_field is not None and not isinstance(sort_field, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{context}: default_sort.field должен быть string или null",
            )

        if sort_order not in {"asc", "desc"}:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{context}: default_sort.order должен быть 'asc' или 'desc'",
            )

        default_sort_norm = {"field": sort_field, "order": sort_order}

    # Fallback defaults (saved projection stays consistent with the contract)
    if not field_order_norm and visible_fields_norm:
        field_order_norm = list(visible_fields_norm)

    normalized_projection: dict[str, Any] = {
        "visible_fields": visible_fields_norm,
        "field_order": field_order_norm,
        "title_field": title_field_norm,
        "default_sort": default_sort_norm,
    }

    result = dict(settings_json)
    result["projection"] = normalized_projection
    return result


def _get_object_type_or_404(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> DesignerObjectType:
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
    return object_type


def _to_read(
    entity: DesignerViewDefinition,
    object_type: DesignerObjectType,
) -> ViewDefinitionRead:
    return ViewDefinitionRead(
        id=entity.id,
        tenant_id=entity.tenant_id,
        object_type_id=entity.object_type_id,
        object_type_key=object_type.key,
        object_type_name=object_type.name,
        key=entity.key,
        name=entity.name,
        description=entity.description,
        view_type=entity.view_type,
        is_default=entity.is_default,
        is_system=entity.is_system,
        is_active=entity.is_active,
        sort_order=entity.sort_order,
        settings_json=entity.settings_json or {},
        layout_json=entity.layout_json or {},
        filters_json=entity.filters_json or {},
        visibility_json=entity.visibility_json or {},
        draft_revision=entity.draft_revision,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        deleted_at=entity.deleted_at,
    )


def _to_list_item(
    entity: DesignerViewDefinition,
    object_type: DesignerObjectType,
) -> ViewDefinitionListItem:
    return ViewDefinitionListItem(**_to_read(entity, object_type).model_dump())


def list_views(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> list[ViewDefinitionListItem]:
    object_type = _get_object_type_or_404(db, tenant_id, object_type_id)
    entities = repository.list_views(db, tenant_id, object_type_id)
    return [_to_list_item(entity, object_type) for entity in entities]


def get_view(
    db: Session,
    tenant_id: int,
    view_id: UUID,
) -> ViewDefinitionRead:
    entity = repository.get_view(db, tenant_id, view_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ViewDefinition не найден",
        )

    object_type = _get_object_type_or_404(db, tenant_id, entity.object_type_id)
    return _to_read(entity, object_type)


def create_view(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    payload: ViewDefinitionCreate,
    current_user: User | None,
) -> ViewDefinitionRead:
    object_type = _get_object_type_or_404(db, tenant_id, object_type_id)

    settings_json = _validate_projection_metadata(
        settings_json=payload.settings_json or {},
        context=f"create_view({tenant_id}/{object_type_id})",
    )

    if repository.get_by_key(db, tenant_id, object_type_id, payload.key):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ViewDefinition с таким key уже существует для ObjectType",
        )

    existing_views = repository.list_views(db, tenant_id, object_type_id)
    is_first_view = len(existing_views) == 0
    is_default = True if is_first_view else payload.is_default

    if is_default and not is_first_view:
        repository.clear_default_views(db, tenant_id, object_type_id)

    user_id = _actor_user_id(current_user)

    entity = DesignerViewDefinition(
        tenant_id=tenant_id,
        object_type_id=object_type_id,
        key=payload.key,
        name=payload.name,
        description=payload.description,
        view_type=payload.view_type.value,
        is_default=is_default,
        is_system=False,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
        settings_json=settings_json,
        layout_json=payload.layout_json,
        filters_json=payload.filters_json,
        visibility_json=payload.visibility_json,
        created_by=user_id,
        updated_by=user_id,
    )

    try:
        entity = repository.create_view(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ViewDefinition с таким key или default уже существует",
        ) from exc

    return _to_read(entity, object_type)


def update_view(
    db: Session,
    tenant_id: int,
    view_id: UUID,
    payload: ViewDefinitionUpdate,
    current_user: User | None,
) -> ViewDefinitionRead:
    entity = repository.get_view(db, tenant_id, view_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ViewDefinition не найден",
        )

    object_type = _get_object_type_or_404(db, tenant_id, entity.object_type_id)

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
                    detail="ViewDefinition с таким key уже существует для ObjectType",
                )
            entity.key = new_key

    if "name" in updates:
        entity.name = updates["name"]
    if "description" in updates:
        entity.description = updates["description"]
    if "view_type" in updates:
        entity.view_type = updates["view_type"].value
    if "is_active" in updates:
        entity.is_active = updates["is_active"]
    if "sort_order" in updates:
        entity.sort_order = updates["sort_order"]
    if "settings_json" in updates:
        entity.settings_json = _validate_projection_metadata(
            settings_json=updates["settings_json"] or {},
            context=f"update_view({tenant_id}/{view_id})",
        )
    if "layout_json" in updates:
        entity.layout_json = updates["layout_json"]
    if "filters_json" in updates:
        entity.filters_json = updates["filters_json"]
    if "visibility_json" in updates:
        entity.visibility_json = updates["visibility_json"]

    if "is_default" in updates:
        if updates["is_default"]:
            repository.clear_default_views(
                db,
                tenant_id,
                entity.object_type_id,
                except_view_id=entity.id,
            )
            entity.is_default = True
        else:
            entity.is_default = False

    entity.updated_by = _actor_user_id(current_user)
    entity.draft_revision = entity.draft_revision + 1

    try:
        entity = repository.save_view(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ViewDefinition с таким key или default уже существует",
        ) from exc

    return _to_read(entity, object_type)


def delete_view(
    db: Session,
    tenant_id: int,
    view_id: UUID,
    current_user: User | None,
) -> ViewDefinitionRead:
    entity = repository.get_view(db, tenant_id, view_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ViewDefinition не найден",
        )

    object_type = _get_object_type_or_404(db, tenant_id, entity.object_type_id)

    if entity.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Системное представление нельзя удалить",
        )

    if entity.is_default:
        other_active_count = repository.count_active_views(
            db,
            tenant_id,
            entity.object_type_id,
            exclude_view_id=entity.id,
        )
        if other_active_count > 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Нельзя удалить default view, пока есть другие активные views. "
                    "Сначала назначьте другую default."
                ),
            )

    entity.updated_by = _actor_user_id(current_user)
    entity = repository.soft_delete_view(db, entity)
    return _to_read(entity, object_type)


def reorder_views(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    payload: ViewDefinitionReorderRequest,
    current_user: User | None,
) -> list[ViewDefinitionListItem]:
    object_type = _get_object_type_or_404(db, tenant_id, object_type_id)

    view_ids = [item.id for item in payload.items]
    entities = repository.list_views_by_ids(
        db,
        tenant_id,
        object_type_id,
        view_ids,
    )

    if len(entities) != len(view_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Не все views принадлежат указанному tenant и ObjectType",
        )

    sort_by_id = {item.id: item.sort_order for item in payload.items}
    user_id = _actor_user_id(current_user)

    for entity in entities:
        entity.sort_order = sort_by_id[entity.id]
        entity.updated_by = user_id
        entity.draft_revision = entity.draft_revision + 1

    entities = repository.save_views(db, entities)
    entities.sort(key=lambda row: (row.sort_order, row.name))

    return [_to_list_item(entity, object_type) for entity in entities]
