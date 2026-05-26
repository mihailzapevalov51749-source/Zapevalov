from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.entities import repository, serializer, validators
from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.entities.schemas import EntityCreate, EntityRead, EntityUpdate
from app.modules.platform.shared.exceptions import CatalogNotFound
from app.modules.users.models import User


def _actor_user_id(current_user: User | None) -> int | None:
    return current_user.id if current_user else None


def _metadata_as_dict(metadata: catalog_service.PublishedObjectTypeMetadata) -> dict:
    return {
        "fields": metadata.fields,
        "object_type_key": metadata.object_type_key,
    }


def _validation_http_error(exc: ValueError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=str(exc),
    )


def _catalog_http_error(exc: CatalogNotFound) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=str(exc) or "Published catalog не найден",
    )


def create_entity(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    payload: EntityCreate,
    current_user: User | None = None,
) -> EntityRead:
    try:
        metadata = catalog_service.get_published_object_type_metadata(
            db,
            tenant_id,
            object_type_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    try:
        validators.validate_entity_create(
            payload.values,
            _metadata_as_dict(metadata),
        )
    except ValueError as exc:
        raise _validation_http_error(exc) from exc

    user_id = _actor_user_id(current_user)
    field_map = {field["key"]: field for field in metadata.fields if field.get("key")}

    entity = RuntimeEntity(
        tenant_id=tenant_id,
        object_type_key=object_type_key,
        object_type_id=metadata.object_type_id,
        catalog_version=metadata.catalog_version,
        status="active",
        created_by=user_id,
        updated_by=user_id,
    )

    try:
        repository.create_entity(db, entity)
        value_rows = [
            RuntimeEntityValue(
                tenant_id=tenant_id,
                entity_id=entity.id,
                field_key=field_key,
                field_type=field_map[field_key]["field_type"],
                value_json=field_value,
            )
            for field_key, field_value in payload.values.items()
        ]
        repository.create_entity_values(db, value_rows)
        repository.commit(db)
        repository.refresh_entity(db, entity)
        stored_values = repository.get_entity_values(db, tenant_id, entity.id)
    except Exception:
        db.rollback()
        raise

    return serializer.serialize_entity(entity, stored_values)


def list_entities(
    db: Session,
    tenant_id: int,
    object_type_key: str,
) -> list[EntityRead]:
    try:
        catalog_service.get_published_object_type_metadata(db, tenant_id, object_type_key)
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    entities = repository.list_entities(db, tenant_id, object_type_key)
    return [
        serializer.serialize_entity(entity, list(entity.values))
        for entity in entities
    ]


def get_entity(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    entity_id: UUID,
) -> EntityRead:
    try:
        catalog_service.get_published_object_type_metadata(db, tenant_id, object_type_key)
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    entity = repository.get_entity(
        db,
        tenant_id,
        entity_id,
        object_type_key=object_type_key,
    )
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entity не найдена",
        )

    value_rows = repository.get_entity_values(db, tenant_id, entity_id)
    return serializer.serialize_entity(entity, value_rows)


def update_entity(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    entity_id: UUID,
    payload: EntityUpdate,
    current_user: User | None = None,
) -> EntityRead:
    try:
        metadata = catalog_service.get_published_object_type_metadata(
            db,
            tenant_id,
            object_type_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    entity = repository.get_entity(
        db,
        tenant_id,
        entity_id,
        object_type_key=object_type_key,
    )
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entity не найдена",
        )

    try:
        validators.validate_entity_update(
            payload.values,
            _metadata_as_dict(metadata),
        )
    except ValueError as exc:
        raise _validation_http_error(exc) from exc

    field_map = {field["key"]: field for field in metadata.fields if field.get("key")}
    user_id = _actor_user_id(current_user)

    try:
        for field_key, field_value in payload.values.items():
            field_meta = field_map[field_key]
            existing = repository.get_entity_value_row(db, tenant_id, entity_id, field_key)
            if existing:
                repository.update_entity_value(
                    db,
                    existing,
                    value_json=field_value,
                    field_type=field_meta["field_type"],
                )
            else:
                repository.insert_entity_value(
                    db,
                    RuntimeEntityValue(
                        tenant_id=tenant_id,
                        entity_id=entity_id,
                        field_key=field_key,
                        field_type=field_meta["field_type"],
                        value_json=field_value,
                    ),
                )

        repository.touch_entity(db, entity, updated_by=user_id)
        repository.commit(db)
        repository.refresh_entity(db, entity)
        value_rows = repository.get_entity_values(db, tenant_id, entity_id)
    except Exception:
        db.rollback()
        raise

    return serializer.serialize_entity(entity, value_rows)


def delete_entity(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    entity_id: UUID,
    current_user: User | None = None,
) -> EntityRead:
    try:
        catalog_service.get_published_object_type_metadata(db, tenant_id, object_type_key)
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    entity = repository.get_entity(
        db,
        tenant_id,
        entity_id,
        object_type_key=object_type_key,
    )
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entity не найдена",
        )

    user_id = _actor_user_id(current_user)

    try:
        if user_id is not None:
            entity.updated_by = user_id
        repository.soft_delete_entity(db, entity)
        repository.commit(db)
        repository.refresh_entity(db, entity)
        value_rows = repository.get_entity_values(db, tenant_id, entity_id)
    except Exception:
        db.rollback()
        raise

    return serializer.serialize_entity(entity, value_rows)
