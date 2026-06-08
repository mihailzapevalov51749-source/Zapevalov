from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.platform.action_engine.action_definitions import repository as action_definition_repository
from app.modules.platform.action_engine.action_placements import repository
from app.modules.platform.action_engine.action_placements.models import (
    DesignerActionPlacement,
)
from app.modules.platform.action_engine.action_placements.registry import (
    action_placement_registry,
)
from app.modules.platform.action_engine.action_placements.schemas import (
    ActionPlacementCreate,
    ActionPlacementRead,
    ActionPlacementRegistryItem,
    ActionPlacementUpdate,
)
from app.modules.platform.designer.object_types import repository as object_type_repository
from app.modules.users.models import User


def _to_read(entity: DesignerActionPlacement) -> ActionPlacementRead:
    return ActionPlacementRead.model_validate(entity)


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


def _ensure_placement_key(placement_key: str) -> None:
    placement = action_placement_registry.get(placement_key)
    if not placement or not placement.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Неизвестный или неактивный placement_key",
        )


def _ensure_action_definition_mutable(action_definition) -> None:
    if action_definition.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Размещения системного действия нельзя изменять",
        )


def list_placement_catalog() -> list[ActionPlacementRegistryItem]:
    return [
        ActionPlacementRegistryItem(
            key=item.key,
            name=item.name,
            description=item.description,
            sort_order=item.sort_order,
        )
        for item in action_placement_registry.list()
    ]


def list_action_placements(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
) -> list[ActionPlacementRead]:
    _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    entities = repository.list_action_placements(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    return [_to_read(entity) for entity in entities]


def create_action_placement(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    payload: ActionPlacementCreate,
    current_user: User | None = None,
) -> ActionPlacementRead:
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    _ensure_action_definition_mutable(action_definition)
    _ensure_placement_key(payload.placement_key)

    if repository.get_by_placement_key(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
        payload.placement_key,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Размещение с таким placement_key уже существует для ActionDefinition",
        )

    entity = DesignerActionPlacement(
        tenant_id=tenant_id,
        object_type_id=object_type_id,
        action_definition_id=action_definition_id,
        placement_key=payload.placement_key,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
        label_override=payload.label_override,
        icon_key=payload.icon_key,
        config_json=payload.config_json,
        visibility_condition_json=payload.visibility_condition_json,
        enabled_condition_json=payload.enabled_condition_json,
    )

    try:
        entity = repository.create_action_placement(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Размещение с таким placement_key уже существует для ActionDefinition",
        ) from exc

    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
    return _to_read(entity)


def update_action_placement(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    placement_id: UUID,
    payload: ActionPlacementUpdate,
    current_user: User | None = None,
) -> ActionPlacementRead:
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    _ensure_action_definition_mutable(action_definition)

    entity = repository.get_action_placement(db, tenant_id, placement_id)
    if (
        not entity
        or entity.object_type_id != object_type_id
        or entity.action_definition_id != action_definition_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionPlacement не найден",
        )

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Нет полей для обновления",
        )

    for field, value in updates.items():
        setattr(entity, field, value)

    try:
        entity = repository.save_action_placement(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Не удалось обновить ActionPlacement",
        ) from exc

    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
    return _to_read(entity)


def delete_action_placement(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    placement_id: UUID,
    current_user: User | None = None,
) -> None:
    action_definition = _get_scoped_action_definition(
        db,
        tenant_id,
        object_type_id,
        action_definition_id,
    )
    _ensure_action_definition_mutable(action_definition)

    entity = repository.get_action_placement(db, tenant_id, placement_id)
    if (
        not entity
        or entity.object_type_id != object_type_id
        or entity.action_definition_id != action_definition_id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionPlacement не найден",
        )

    repository.delete_action_placement(db, entity)
    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
