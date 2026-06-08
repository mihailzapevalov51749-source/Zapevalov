from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.platform.action_engine.action_definitions import repository
from app.modules.platform.action_engine.action_definitions.models import (
    DesignerActionDefinition,
)
from app.modules.platform.action_engine.action_definitions.schemas import (
    ActionDefinitionCreate,
    ActionDefinitionListItem,
    ActionDefinitionRead,
    ActionDefinitionUpdate,
)
from app.modules.platform.action_engine.action_types.registry import action_type_registry
from app.modules.platform.designer.object_types import repository as object_type_repository
from app.modules.platform.designer.relation_definitions import (
    repository as relation_repository,
)
from app.modules.users.models import User

CREATE_RECORD_ACTION_TYPE = "create_record"


def _to_read(entity: DesignerActionDefinition) -> ActionDefinitionRead:
    return ActionDefinitionRead.model_validate(entity)


def _to_list_item(entity: DesignerActionDefinition) -> ActionDefinitionListItem:
    return ActionDefinitionListItem.model_validate(entity)


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


def _ensure_action_type_key(action_type_key: str) -> None:
    action_type = action_type_registry.get(action_type_key)
    if not action_type or not action_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Неизвестный или неактивный Action Type",
        )


def _validate_target_object_type(
    db: Session,
    tenant_id: int,
    *,
    action_type_key: str,
    target_object_type_id: UUID | None,
    source_object_type_id: UUID,
) -> UUID | None:
    if action_type_key == CREATE_RECORD_ACTION_TYPE:
        if target_object_type_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="target_object_type_id обязателен для create_record",
            )
        _ensure_object_type(db, tenant_id, target_object_type_id)
        return target_object_type_id

    if target_object_type_id is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="target_object_type_id допустим только для create_record",
        )

    return None


def _validate_auto_link_settings(
    db: Session,
    tenant_id: int,
    *,
    action_type_key: str,
    source_object_type_id: UUID,
    target_object_type_id: UUID | None,
    auto_link_enabled: bool,
    auto_link_relation_id: UUID | None,
) -> tuple[bool, UUID | None]:
    if action_type_key != CREATE_RECORD_ACTION_TYPE:
        if auto_link_enabled or auto_link_relation_id is not None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="auto_link допустим только для create_record",
            )
        return False, None

    if not auto_link_enabled:
        return False, None

    if auto_link_relation_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="auto_link_relation_id обязателен при auto_link_enabled",
        )

    if target_object_type_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="target_object_type_id обязателен для auto_link",
        )

    relation = relation_repository.get_relation(db, tenant_id, auto_link_relation_id)
    if not relation or not relation.is_active or relation.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Связь не найдена или неактивна",
        )

    if (
        relation.source_object_type_id != source_object_type_id
        or relation.target_object_type_id != target_object_type_id
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Связь должна соединять исходный и целевой объект действия",
        )

    return True, auto_link_relation_id


def list_action_definitions(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> list[ActionDefinitionListItem]:
    _ensure_object_type(db, tenant_id, object_type_id)
    entities = repository.list_action_definitions(db, tenant_id, object_type_id)
    return [_to_list_item(entity) for entity in entities]


def get_action_definition(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
) -> ActionDefinitionRead:
    _ensure_object_type(db, tenant_id, object_type_id)
    entity = repository.get_action_definition(db, tenant_id, action_definition_id)
    if not entity or entity.object_type_id != object_type_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionDefinition не найден",
        )
    return _to_read(entity)


def create_action_definition(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    payload: ActionDefinitionCreate,
    current_user: User | None = None,
) -> ActionDefinitionRead:
    _ensure_object_type(db, tenant_id, object_type_id)
    _ensure_action_type_key(payload.action_type_key)
    target_object_type_id = _validate_target_object_type(
        db,
        tenant_id,
        action_type_key=payload.action_type_key,
        target_object_type_id=payload.target_object_type_id,
        source_object_type_id=object_type_id,
    )
    auto_link_enabled, auto_link_relation_id = _validate_auto_link_settings(
        db,
        tenant_id,
        action_type_key=payload.action_type_key,
        source_object_type_id=object_type_id,
        target_object_type_id=target_object_type_id,
        auto_link_enabled=payload.auto_link_enabled,
        auto_link_relation_id=payload.auto_link_relation_id,
    )

    if repository.get_by_key(db, tenant_id, object_type_id, payload.key):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ActionDefinition с таким key уже существует для ObjectType",
        )

    entity = DesignerActionDefinition(
        tenant_id=tenant_id,
        object_type_id=object_type_id,
        key=payload.key,
        name=payload.name,
        description=payload.description,
        action_type_key=payload.action_type_key,
        target_object_type_id=target_object_type_id,
        auto_link_enabled=auto_link_enabled,
        auto_link_relation_id=auto_link_relation_id,
        is_active=payload.is_active,
        is_system=False,
    )

    try:
        entity = repository.create_action_definition(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ActionDefinition с таким key уже существует для ObjectType",
        ) from exc

    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
    return _to_read(entity)


def update_action_definition(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    payload: ActionDefinitionUpdate,
    current_user: User | None = None,
) -> ActionDefinitionRead:
    _ensure_object_type(db, tenant_id, object_type_id)
    entity = repository.get_action_definition(db, tenant_id, action_definition_id)
    if not entity or entity.object_type_id != object_type_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionDefinition не найден",
        )

    if entity.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Системное действие нельзя изменять",
        )

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Нет полей для обновления",
        )

    next_action_type_key = updates.get("action_type_key", entity.action_type_key)
    if "action_type_key" in updates:
        _ensure_action_type_key(updates["action_type_key"])

    if "target_object_type_id" in updates or "action_type_key" in updates:
        next_target_object_type_id = updates.get(
            "target_object_type_id",
            entity.target_object_type_id,
        )
        updates["target_object_type_id"] = _validate_target_object_type(
            db,
            tenant_id,
            action_type_key=next_action_type_key,
            target_object_type_id=next_target_object_type_id,
            source_object_type_id=entity.object_type_id,
        )

    if (
        "auto_link_enabled" in updates
        or "auto_link_relation_id" in updates
        or "target_object_type_id" in updates
        or "action_type_key" in updates
    ):
        next_auto_link_enabled = updates.get(
            "auto_link_enabled",
            entity.auto_link_enabled,
        )
        next_auto_link_relation_id = updates.get(
            "auto_link_relation_id",
            entity.auto_link_relation_id,
        )
        next_target_object_type_id = updates.get(
            "target_object_type_id",
            entity.target_object_type_id,
        )
        auto_link_enabled, auto_link_relation_id = _validate_auto_link_settings(
            db,
            tenant_id,
            action_type_key=next_action_type_key,
            source_object_type_id=entity.object_type_id,
            target_object_type_id=next_target_object_type_id,
            auto_link_enabled=bool(next_auto_link_enabled),
            auto_link_relation_id=next_auto_link_relation_id,
        )
        updates["auto_link_enabled"] = auto_link_enabled
        updates["auto_link_relation_id"] = auto_link_relation_id

    if "key" in updates and updates["key"] != entity.key:
        existing = repository.get_by_key(
            db,
            tenant_id,
            entity.object_type_id,
            updates["key"],
        )
        if existing and existing.id != entity.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="ActionDefinition с таким key уже существует для ObjectType",
            )

    for field, value in updates.items():
        setattr(entity, field, value)

    try:
        entity = repository.save_action_definition(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ActionDefinition с таким key уже существует для ObjectType",
        ) from exc

    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
    return _to_read(entity)


def delete_action_definition(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    action_definition_id: UUID,
    current_user: User | None = None,
) -> None:
    _ensure_object_type(db, tenant_id, object_type_id)
    entity = repository.get_action_definition(db, tenant_id, action_definition_id)
    if not entity or entity.object_type_id != object_type_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ActionDefinition не найден",
        )

    if entity.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Системное действие нельзя удалять",
        )

    repository.delete_action_definition(db, entity)
    _touch_parent_object_type(db, tenant_id, object_type_id, current_user)
