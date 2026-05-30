from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.platform.designer.object_types import repository
from app.modules.navigation.models import NavigationItem
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.view_definitions import service as view_service
from app.modules.platform.designer.object_types.schemas import (
    DependencyCounts,
    ObjectTypeCreate,
    ObjectTypeListItem,
    ObjectTypeRead,
    ObjectTypeUpdate,
)
from app.modules.users.models import User


def _dependency_counts_stub() -> DependencyCounts:
    return DependencyCounts()


def _actor_user_id(current_user: User | None) -> int | None:
    return current_user.id if current_user else None


def _to_read(entity: DesignerObjectType) -> ObjectTypeRead:
    return ObjectTypeRead(
        id=entity.id,
        tenant_id=entity.tenant_id,
        key=entity.key,
        name=entity.name,
        description=entity.description,
        icon=entity.icon,
        icon_type=entity.icon_type,
        icon_file_url=entity.icon_file_url,
        color=entity.color,
        sort_order=entity.sort_order,
        status=entity.status,
        is_system=entity.is_system,
        is_default_entity=entity.is_default_entity,
        settings_json=entity.settings_json or {},
        governance_json=entity.governance_json or {},
        draft_revision=entity.draft_revision,
        last_published_at=entity.last_published_at,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        deleted_at=entity.deleted_at,
        dependency_counts=_dependency_counts_stub(),
    )


def _to_list_item(entity: DesignerObjectType) -> ObjectTypeListItem:
    return ObjectTypeListItem(**_to_read(entity).model_dump())


def list_object_types(db: Session, tenant_id: int) -> list[ObjectTypeListItem]:
    entities = repository.list_object_types(db, tenant_id)
    return [_to_list_item(entity) for entity in entities]


def get_object_type(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> ObjectTypeRead:
    entity = repository.get_object_type(db, tenant_id, object_type_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ObjectType не найден",
        )

    return _to_read(entity)


def create_object_type(
    db: Session,
    tenant_id: int,
    payload: ObjectTypeCreate,
    current_user: User | None,
) -> ObjectTypeRead:
    if repository.get_by_key(db, tenant_id, payload.key):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ObjectType с таким key уже существует в tenant",
        )

    user_id = _actor_user_id(current_user)

    entity = DesignerObjectType(
        tenant_id=tenant_id,
        key=payload.key,
        name=payload.name,
        description=payload.description,
        icon=payload.icon,
        icon_type=payload.icon_type,
        icon_file_url=payload.icon_file_url,
        color=payload.color,
        sort_order=payload.sort_order,
        status=payload.status.value,
        is_system=False,
        is_default_entity=payload.is_default_entity,
        settings_json=payload.settings_json,
        governance_json=payload.governance_json,
        created_by=user_id,
        updated_by=user_id,
    )

    try:
        entity = repository.create_object_type(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ObjectType с таким key уже существует в tenant",
        ) from exc

    # Bootstrap canonical default system table view for object-first flow.
    view_service.create_default_table_view(
        db,
        tenant_id,
        entity.id,
        current_user=current_user,
    )

    return _to_read(entity)


def update_object_type(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    payload: ObjectTypeUpdate,
    current_user: User | None,
) -> ObjectTypeRead:
    entity = repository.get_object_type(db, tenant_id, object_type_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ObjectType не найден",
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

    if "key" in updates:
        new_key = updates["key"]
        if new_key is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="key не может быть null",
            )
        if new_key != entity.key:
            if entity.last_published_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="key нельзя изменить после publish",
                )

            existing = repository.get_by_key(db, tenant_id, new_key)
            if existing and existing.id != entity.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="ObjectType с таким key уже существует в tenant",
                )
            entity.key = new_key

    if "name" in updates:
        entity.name = updates["name"]
    if "description" in updates:
        entity.description = updates["description"]
    if "icon" in updates:
        entity.icon = updates["icon"]
    if "icon_type" in updates:
        entity.icon_type = updates["icon_type"]
        if updates["icon_type"] == "upload":
            entity.icon = None
    if "icon_file_url" in updates:
        entity.icon_file_url = updates["icon_file_url"]
    if "color" in updates:
        entity.color = updates["color"]
    if "sort_order" in updates:
        entity.sort_order = updates["sort_order"]
    if "status" in updates:
        entity.status = updates["status"].value
    if "is_default_entity" in updates:
        entity.is_default_entity = updates["is_default_entity"]
    if "settings_json" in updates:
        entity.settings_json = updates["settings_json"]
    if "governance_json" in updates:
        entity.governance_json = updates["governance_json"]

    entity.updated_by = _actor_user_id(current_user)
    entity.draft_revision = entity.draft_revision + 1

    try:
        entity = repository.save_object_type(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ObjectType с таким key уже существует в tenant",
        ) from exc

    return _to_read(entity)


def delete_object_type(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
    current_user: User | None,
) -> ObjectTypeRead:
    entity = repository.get_object_type(db, tenant_id, object_type_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ObjectType не найден",
        )

    if entity.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Системный ObjectType нельзя удалить",
        )

    db.query(NavigationItem).filter(
        NavigationItem.object_type_id == object_type_id,
    ).delete(synchronize_session=False)

    entity.updated_by = _actor_user_id(current_user)
    entity = repository.soft_delete_object_type(db, entity)
    db.commit()
    return _to_read(entity)
