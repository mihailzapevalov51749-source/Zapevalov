from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.entities import repository as entities_repository
from app.modules.platform.runtime.relation_instances import repository, serializer, validators
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance
from app.modules.platform.runtime.relation_instances.schemas import (
    RelationInstanceCreate,
    RelationInstanceListItem,
    RelationInstanceRead,
)
from app.modules.platform.shared.enums import RelationType
from app.modules.platform.shared.exceptions import CatalogNotFound
from app.modules.users.models import User


def _actor_user_id(current_user: User | None) -> int | None:
    return current_user.id if current_user else None


def _catalog_http_error(exc: CatalogNotFound) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=str(exc) or "Published catalog не найден",
    )


def _validation_http_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=message,
    )


def _conflict_http_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message,
    )


def _get_entity_or_404(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
    *,
    label: str,
):
    entity = entities_repository.get_entity(db, tenant_id, entity_id)
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{label} entity не найдена",
        )
    return entity


def create_relation_instance(
    db: Session,
    tenant_id: int,
    relation_key: str,
    payload: RelationInstanceCreate,
    current_user: User | None = None,
) -> RelationInstanceRead:
    try:
        relation_metadata = catalog_service.get_published_relation_metadata(
            db,
            tenant_id,
            relation_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    source_entity = _get_entity_or_404(
        db,
        tenant_id,
        payload.source_entity_id,
        label="Source",
    )
    target_entity = _get_entity_or_404(
        db,
        tenant_id,
        payload.target_entity_id,
        label="Target",
    )

    try:
        validators.validate_relation_instance_create(
            relation_metadata=relation_metadata,
            source_entity=source_entity,
            target_entity=target_entity,
            source_entity_id=payload.source_entity_id,
            target_entity_id=payload.target_entity_id,
        )
    except ValueError as exc:
        raise _validation_http_error(str(exc)) from exc

    duplicate = repository.find_duplicate_active(
        db,
        tenant_id,
        relation_key,
        payload.source_entity_id,
        payload.target_entity_id,
    )
    if duplicate:
        raise _conflict_http_error(
            "Активная связь с таким source/target уже существует",
        )

    if relation_metadata.relation_type == RelationType.ONE_TO_ONE.value:
        conflict_reason = repository.check_one_to_one_constraints(
            db,
            tenant_id,
            relation_key,
            payload.source_entity_id,
            payload.target_entity_id,
        )
        if conflict_reason:
            raise _conflict_http_error(conflict_reason)

    user_id = _actor_user_id(current_user)
    instance = RuntimeRelationInstance(
        tenant_id=tenant_id,
        relation_key=relation_key,
        relation_id=relation_metadata.relation_id,
        catalog_version=relation_metadata.catalog_version,
        source_entity_id=payload.source_entity_id,
        target_entity_id=payload.target_entity_id,
        source_object_type_key=source_entity.object_type_key,
        target_object_type_key=target_entity.object_type_key,
        status="active",
        created_by=user_id,
        updated_by=user_id,
    )

    try:
        repository.create_relation_instance(db, instance)
        repository.commit(db)
        repository.refresh(db, instance)
    except Exception:
        db.rollback()
        raise

    return serializer.serialize_relation_instance(instance)


def list_by_relation_key(
    db: Session,
    tenant_id: int,
    relation_key: str,
) -> list[RelationInstanceListItem]:
    try:
        catalog_service.get_published_relation_metadata(db, tenant_id, relation_key)
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    instances = repository.list_by_relation_key(db, tenant_id, relation_key)
    return [serializer.serialize_relation_instance_list_item(row) for row in instances]


def list_for_entity(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
) -> list[RelationInstanceListItem]:
    _get_entity_or_404(db, tenant_id, entity_id, label="Entity")
    instances = repository.list_for_entity(db, tenant_id, entity_id)
    return [serializer.serialize_relation_instance_list_item(row) for row in instances]


def list_outgoing(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
) -> list[RelationInstanceListItem]:
    _get_entity_or_404(db, tenant_id, entity_id, label="Entity")
    instances = repository.list_outgoing(db, tenant_id, entity_id)
    return [serializer.serialize_relation_instance_list_item(row) for row in instances]


def list_incoming(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
) -> list[RelationInstanceListItem]:
    _get_entity_or_404(db, tenant_id, entity_id, label="Entity")
    instances = repository.list_incoming(db, tenant_id, entity_id)
    return [serializer.serialize_relation_instance_list_item(row) for row in instances]


def delete_relation_instance(
    db: Session,
    tenant_id: int,
    relation_instance_id: UUID,
    current_user: User | None = None,
) -> RelationInstanceRead:
    instance = repository.get_relation_instance(db, tenant_id, relation_instance_id)
    if not instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relation instance не найдена",
        )

    user_id = _actor_user_id(current_user)

    try:
        if user_id is not None:
            instance.updated_by = user_id
        repository.soft_delete_relation_instance(db, instance)
        repository.commit(db)
        repository.refresh(db, instance)
    except Exception:
        db.rollback()
        raise

    return serializer.serialize_relation_instance(instance)
