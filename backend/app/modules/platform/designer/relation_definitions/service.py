from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.platform.designer.object_types import repository as object_type_repository
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.relation_definitions import repository
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.relation_definitions.schemas import (
    RelationDefinitionCreate,
    RelationDefinitionListItem,
    RelationDefinitionRead,
    RelationDefinitionUpdate,
    validate_relation_business_rules,
)
from app.modules.platform.shared.enums import RelationType
from app.modules.users.models import User


def _actor_user_id(current_user: User | None) -> int | None:
    return current_user.id if current_user else None


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


def _load_object_type_map(
    db: Session,
    tenant_id: int,
    object_type_ids: set[UUID],
) -> dict[UUID, DesignerObjectType]:
    result: dict[UUID, DesignerObjectType] = {}

    for object_type_id in object_type_ids:
        object_type = object_type_repository.get_object_type(
            db,
            tenant_id,
            object_type_id,
        )
        if object_type:
            result[object_type_id] = object_type

    return result


def _to_read(
    entity: DesignerRelationDefinition,
    object_type_map: dict[UUID, DesignerObjectType],
) -> RelationDefinitionRead:
    source = object_type_map.get(entity.source_object_type_id)
    target = object_type_map.get(entity.target_object_type_id)

    if not source or not target:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось разрешить ObjectType для RelationDefinition",
        )

    return RelationDefinitionRead(
        id=entity.id,
        tenant_id=entity.tenant_id,
        key=entity.key,
        name=entity.name,
        description=entity.description,
        source_object_type_id=entity.source_object_type_id,
        target_object_type_id=entity.target_object_type_id,
        source_object_type_key=source.key,
        source_object_type_name=source.name,
        target_object_type_key=target.key,
        target_object_type_name=target.name,
        relation_type=entity.relation_type,
        reverse_name=entity.reverse_name,
        sort_order=entity.sort_order,
        is_required=entity.is_required,
        is_system=entity.is_system,
        is_active=entity.is_active,
        bidirectional=entity.bidirectional,
        cascade_delete=entity.cascade_delete,
        settings_json=entity.settings_json or {},
        validation_json=entity.validation_json or {},
        draft_revision=entity.draft_revision,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
        deleted_at=entity.deleted_at,
    )


def _to_list_item(
    entity: DesignerRelationDefinition,
    object_type_map: dict[UUID, DesignerObjectType],
) -> RelationDefinitionListItem:
    return RelationDefinitionListItem(**_to_read(entity, object_type_map).model_dump())


def _object_type_map_for_entities(
    db: Session,
    tenant_id: int,
    entities: list[DesignerRelationDefinition],
) -> dict[UUID, DesignerObjectType]:
    ids: set[UUID] = set()
    for entity in entities:
        ids.add(entity.source_object_type_id)
        ids.add(entity.target_object_type_id)
    return _load_object_type_map(db, tenant_id, ids)


def _validate_relation_payload(
    *,
    relation_type: RelationType,
    source: DesignerObjectType,
    target: DesignerObjectType,
    bidirectional: bool,
    reverse_name: str | None,
    cascade_delete: bool,
) -> None:
    try:
        validate_relation_business_rules(
            relation_type=relation_type,
            source_object_type_id=source.id,
            target_object_type_id=target.id,
            bidirectional=bidirectional,
            reverse_name=reverse_name,
            cascade_delete=cascade_delete,
            source_is_system=source.is_system,
            target_is_system=target.is_system,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


def list_relations(
    db: Session,
    tenant_id: int,
) -> list[RelationDefinitionListItem]:
    entities = repository.list_relations(db, tenant_id)
    object_type_map = _object_type_map_for_entities(db, tenant_id, entities)
    return [_to_list_item(entity, object_type_map) for entity in entities]


def list_relations_for_object_type(
    db: Session,
    tenant_id: int,
    object_type_id: UUID,
) -> list[RelationDefinitionListItem]:
    _get_object_type_or_404(db, tenant_id, object_type_id)
    entities = repository.list_relations_for_object_type(
        db,
        tenant_id,
        object_type_id,
    )
    object_type_map = _object_type_map_for_entities(db, tenant_id, entities)
    return [_to_list_item(entity, object_type_map) for entity in entities]


def get_relation(
    db: Session,
    tenant_id: int,
    relation_id: UUID,
) -> RelationDefinitionRead:
    entity = repository.get_relation(db, tenant_id, relation_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RelationDefinition не найден",
        )

    object_type_map = _object_type_map_for_entities(db, tenant_id, [entity])
    return _to_read(entity, object_type_map)


def create_relation(
    db: Session,
    tenant_id: int,
    payload: RelationDefinitionCreate,
    current_user: User | None,
) -> RelationDefinitionRead:
    if repository.get_by_key(db, tenant_id, payload.key):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="RelationDefinition с таким key уже существует в tenant",
        )

    source = _get_object_type_or_404(db, tenant_id, payload.source_object_type_id)
    target = _get_object_type_or_404(db, tenant_id, payload.target_object_type_id)

    _validate_relation_payload(
        relation_type=payload.relation_type,
        source=source,
        target=target,
        bidirectional=payload.bidirectional,
        reverse_name=payload.reverse_name,
        cascade_delete=payload.cascade_delete,
    )

    user_id = _actor_user_id(current_user)

    entity = DesignerRelationDefinition(
        tenant_id=tenant_id,
        key=payload.key,
        name=payload.name,
        description=payload.description,
        source_object_type_id=payload.source_object_type_id,
        target_object_type_id=payload.target_object_type_id,
        relation_type=payload.relation_type.value,
        reverse_name=payload.reverse_name,
        sort_order=payload.sort_order,
        is_required=payload.is_required,
        is_system=False,
        is_active=payload.is_active,
        bidirectional=payload.bidirectional,
        cascade_delete=payload.cascade_delete,
        settings_json=payload.settings_json,
        validation_json=payload.validation_json,
        created_by=user_id,
        updated_by=user_id,
    )

    try:
        entity = repository.create_relation(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="RelationDefinition с таким key уже существует в tenant",
        ) from exc

    object_type_map = {source.id: source, target.id: target}
    return _to_read(entity, object_type_map)


def update_relation(
    db: Session,
    tenant_id: int,
    relation_id: UUID,
    payload: RelationDefinitionUpdate,
    current_user: User | None,
) -> RelationDefinitionRead:
    entity = repository.get_relation(db, tenant_id, relation_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RelationDefinition не найден",
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

    source_id = updates.get("source_object_type_id", entity.source_object_type_id)
    target_id = updates.get("target_object_type_id", entity.target_object_type_id)

    source = _get_object_type_or_404(db, tenant_id, source_id)
    target = _get_object_type_or_404(db, tenant_id, target_id)

    effective_relation_type = RelationType(
        updates.get("relation_type", entity.relation_type),
    )
    effective_bidirectional = updates.get("bidirectional", entity.bidirectional)
    effective_reverse_name = (
        updates["reverse_name"] if "reverse_name" in updates else entity.reverse_name
    )
    effective_cascade_delete = updates.get("cascade_delete", entity.cascade_delete)

    if any(
        key in updates
        for key in (
            "source_object_type_id",
            "target_object_type_id",
            "relation_type",
            "bidirectional",
            "reverse_name",
            "cascade_delete",
        )
    ):
        _validate_relation_payload(
            relation_type=effective_relation_type,
            source=source,
            target=target,
            bidirectional=effective_bidirectional,
            reverse_name=effective_reverse_name,
            cascade_delete=effective_cascade_delete,
        )

    if "key" in updates:
        new_key = updates["key"]
        if new_key is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="key не может быть null",
            )
        if new_key != entity.key:
            existing = repository.get_by_key(db, tenant_id, new_key)
            if existing and existing.id != entity.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="RelationDefinition с таким key уже существует в tenant",
                )
            entity.key = new_key

    if "name" in updates:
        entity.name = updates["name"]
    if "description" in updates:
        entity.description = updates["description"]
    if "source_object_type_id" in updates:
        entity.source_object_type_id = updates["source_object_type_id"]
    if "target_object_type_id" in updates:
        entity.target_object_type_id = updates["target_object_type_id"]
    if "relation_type" in updates:
        entity.relation_type = updates["relation_type"].value
    if "reverse_name" in updates:
        entity.reverse_name = updates["reverse_name"]
    if "sort_order" in updates:
        entity.sort_order = updates["sort_order"]
    if "is_required" in updates:
        entity.is_required = updates["is_required"]
    if "is_active" in updates:
        entity.is_active = updates["is_active"]
    if "bidirectional" in updates:
        entity.bidirectional = updates["bidirectional"]
    if "cascade_delete" in updates:
        entity.cascade_delete = updates["cascade_delete"]
    if "settings_json" in updates:
        entity.settings_json = updates["settings_json"]
    if "validation_json" in updates:
        entity.validation_json = updates["validation_json"]

    entity.updated_by = _actor_user_id(current_user)
    entity.draft_revision = entity.draft_revision + 1

    try:
        entity = repository.save_relation(db, entity)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="RelationDefinition с таким key уже существует в tenant",
        ) from exc

    object_type_map = {source.id: source, target.id: target}
    return _to_read(entity, object_type_map)


def delete_relation(
    db: Session,
    tenant_id: int,
    relation_id: UUID,
    current_user: User | None,
) -> RelationDefinitionRead:
    entity = repository.get_relation(db, tenant_id, relation_id)

    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RelationDefinition не найден",
        )

    if entity.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Системную связь нельзя удалить",
        )

    object_type_map = _object_type_map_for_entities(db, tenant_id, [entity])
    entity.updated_by = _actor_user_id(current_user)
    entity = repository.soft_delete_relation(db, entity)
    return _to_read(entity, object_type_map)
