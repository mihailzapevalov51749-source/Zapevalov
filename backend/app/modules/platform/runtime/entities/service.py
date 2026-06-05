from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.entities import repository, serializer, validators
from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.entities import hierarchy_delete
from app.modules.platform.runtime.entities.schemas import (
    EntityCreate,
    EntityDeletePreview,
    EntityDeleteRequest,
    EntityDeleteResult,
    EntityDeleteScenario,
    EntityRead,
    EntityUpdate,
    HierarchyLabels,
)
from app.modules.platform.shared.hierarchy_labels import resolve_hierarchy_labels_from_relation
from app.modules.platform.runtime.relation_instances import repository as relation_repository
from app.modules.platform.shared.default_value import (
    DefaultValueResolveContext,
    apply_defaults_to_values,
)
from app.modules.platform.shared.exceptions import CatalogNotFound
from app.modules.platform.shared.relation_field_contract import is_relation_field_type
from app.modules.users.models import User


def _actor_user_id(current_user: User | None) -> int | None:
    return current_user.id if current_user else None


def _metadata_as_dict(metadata: catalog_service.PublishedObjectTypeMetadata) -> dict:
    return {
        "fields": metadata.fields,
        "object_type_key": metadata.object_type_key,
        "title_field_key": metadata.title_field_key,
    }


def _scalar_user_values(
    values: dict,
    field_map: dict[str, dict],
) -> dict:
    return {
        key: value
        for key, value in values.items()
        if not is_relation_field_type((field_map.get(key) or {}).get("field_type"))
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

    field_map = {field["key"]: field for field in metadata.fields if field.get("key")}
    stripped_values = validators.strip_client_system_values(payload.values)
    merged_values = apply_defaults_to_values(
        fields=metadata.fields,
        values=stripped_values,
        context=DefaultValueResolveContext(
            current_user_id=_actor_user_id(current_user),
        ),
    )
    user_values = _scalar_user_values(merged_values, field_map)

    try:
        validators.validate_entity_create(
            user_values,
            _metadata_as_dict(metadata),
        )
    except ValueError as exc:
        raise _validation_http_error(exc) from exc

    user_id = _actor_user_id(current_user)

    entity = RuntimeEntity(
        tenant_id=tenant_id,
        object_type_key=object_type_key,
        object_type_id=metadata.object_type_id,
        catalog_version=metadata.catalog_version,
        status="active",
        created_by=user_id,
        updated_by=user_id,
        record_version=1,
        record_number=repository.get_next_record_number(
            db,
            tenant_id,
            object_type_key,
        ),
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
            for field_key, field_value in user_values.items()
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

    field_map = {field["key"]: field for field in metadata.fields if field.get("key")}
    user_values = _scalar_user_values(
        validators.strip_client_system_values(payload.values),
        field_map,
    )

    try:
        validators.validate_entity_update(
            user_values,
            _metadata_as_dict(metadata),
        )
    except ValueError as exc:
        raise _validation_http_error(exc) from exc
    user_id = _actor_user_id(current_user)

    try:
        for field_key, field_value in user_values.items():
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


def _resolve_entity_title(
    metadata: catalog_service.PublishedObjectTypeMetadata,
    value_rows: list[RuntimeEntityValue],
) -> str:
    title_key = str(metadata.title_field_key or "").strip()
    if not title_key:
        return ""

    for row in value_rows:
        if row.field_key == title_key:
            value = row.value_json
            if value is None:
                return ""
            return str(value).strip()
    return ""


def _get_entity_or_404(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    entity_id: UUID,
) -> RuntimeEntity:
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
    return entity


def preview_entity_delete(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    entity_id: UUID,
) -> EntityDeletePreview:
    try:
        metadata = catalog_service.get_published_object_type_metadata(
            db,
            tenant_id,
            object_type_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    entity = _get_entity_or_404(db, tenant_id, object_type_key, entity_id)
    value_rows = repository.get_entity_values(db, tenant_id, entity_id)
    descendant_count, relation_key = hierarchy_delete.count_hierarchy_descendants(
        db,
        tenant_id,
        object_type_key,
        entity.id,
    )
    _, relation_definition = hierarchy_delete.resolve_hierarchy_delete_context(
        db,
        tenant_id,
        object_type_key,
    )
    resolved_labels = resolve_hierarchy_labels_from_relation(relation_definition)

    return EntityDeletePreview(
        entity_id=entity.id,
        entity_title=_resolve_entity_title(metadata, value_rows),
        has_hierarchy_children=descendant_count > 0,
        descendant_count=descendant_count,
        hierarchy_relation_key=relation_key,
        hierarchy_labels=HierarchyLabels(**resolved_labels),
    )


def _dedupe_relation_instances(instances: list) -> list:
    seen: set[UUID] = set()
    result = []
    for instance in instances:
        if instance.id in seen:
            continue
        seen.add(instance.id)
        result.append(instance)
    return result


def _soft_delete_relation_instances(
    db: Session,
    instances: list,
    *,
    user_id: int | None,
) -> list[UUID]:
    deleted_ids: list[UUID] = []
    for instance in instances:
        if user_id is not None:
            instance.updated_by = user_id
        relation_repository.soft_delete_relation_instance(db, instance)
        deleted_ids.append(instance.id)
    return deleted_ids


def delete_entity_with_scenario(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    entity_id: UUID,
    payload: EntityDeleteRequest,
    current_user: User | None = None,
) -> EntityDeleteResult:
    try:
        metadata = catalog_service.get_published_object_type_metadata(
            db,
            tenant_id,
            object_type_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    entity = _get_entity_or_404(db, tenant_id, object_type_key, entity_id)
    user_id = _actor_user_id(current_user)

    descendant_count, relation_key = hierarchy_delete.count_hierarchy_descendants(
        db,
        tenant_id,
        object_type_key,
        entity.id,
    )
    has_children = descendant_count > 0

    if has_children and payload.scenario is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "У записи есть подзадачи. Укажите сценарий удаления: "
                "unlink_children или with_descendants."
            ),
        )

    if not has_children:
        scenario: str = "solo"
    elif payload.scenario == EntityDeleteScenario.UNLINK_CHILDREN:
        scenario = "unlink_children"
    elif payload.scenario == EntityDeleteScenario.WITH_DESCENDANTS:
        scenario = "with_descendants"
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Неподдерживаемый сценарий удаления",
        )

    deleted_entity_ids: list[UUID] = []
    deleted_relation_ids: list[UUID] = []

    try:
        if scenario == "solo":
            relation_instances = relation_repository.list_for_entity(
                db,
                tenant_id,
                entity.id,
            )
            if user_id is not None:
                entity.updated_by = user_id
            repository.soft_delete_entity(db, entity)
            deleted_entity_ids.append(entity.id)
            deleted_relation_ids.extend(
                _soft_delete_relation_instances(db, relation_instances, user_id=user_id),
            )

        elif scenario == "unlink_children":
            if not relation_key:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Иерархическая связь не настроена",
                )
            hierarchy_instances = _dedupe_relation_instances(
                hierarchy_delete.list_hierarchy_relation_instances_for_entity(
                    db,
                    tenant_id,
                    entity.id,
                    relation_key,
                ),
            )
            if user_id is not None:
                entity.updated_by = user_id
            repository.soft_delete_entity(db, entity)
            deleted_entity_ids.append(entity.id)
            deleted_relation_ids.extend(
                _soft_delete_relation_instances(db, hierarchy_instances, user_id=user_id),
            )

        elif scenario == "with_descendants":
            if not relation_key:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Иерархическая связь не настроена",
                )
            _, relation_definition = hierarchy_delete.resolve_hierarchy_delete_context(
                db,
                tenant_id,
                object_type_key,
            )
            children_by_parent = hierarchy_delete.build_hierarchy_children_map(
                db,
                tenant_id,
                relation_key,
                relation_definition,
            )
            descendant_ids = hierarchy_delete.collect_hierarchy_descendant_ids(
                entity.id,
                children_by_parent,
            )
            entity_ids_to_delete: set[UUID] = {entity.id}
            for descendant_id in descendant_ids:
                try:
                    entity_ids_to_delete.add(UUID(str(descendant_id)))
                except ValueError:
                    continue

            entities_to_delete = [
                repository.get_entity(db, tenant_id, item_id, object_type_key=object_type_key)
                for item_id in entity_ids_to_delete
            ]
            for item in entities_to_delete:
                if not item:
                    continue
                if user_id is not None:
                    item.updated_by = user_id
                repository.soft_delete_entity(db, item)
                deleted_entity_ids.append(item.id)

            relation_instances = hierarchy_delete.list_relation_instances_touching_entities(
                db,
                tenant_id,
                entity_ids_to_delete,
            )
            deleted_relation_ids.extend(
                _soft_delete_relation_instances(db, relation_instances, user_id=user_id),
            )

        repository.commit(db)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    return EntityDeleteResult(
        entity_id=entity.id,
        scenario=scenario,  # type: ignore[arg-type]
        deleted_entity_ids=deleted_entity_ids,
        deleted_relation_instance_ids=deleted_relation_ids,
    )


def delete_entity(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    entity_id: UUID,
    current_user: User | None = None,
) -> EntityRead:
    preview = preview_entity_delete(db, tenant_id, object_type_key, entity_id)
    if preview.has_hierarchy_children:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "У записи есть подзадачи. Используйте POST /delete с выбором сценария."
            ),
        )

    result = delete_entity_with_scenario(
        db,
        tenant_id,
        object_type_key,
        entity_id,
        EntityDeleteRequest(scenario=None),
        current_user=current_user,
    )
    entity = repository.get_entity(
        db,
        tenant_id,
        entity_id,
        object_type_key=object_type_key,
        include_deleted=True,
    )
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entity не найдена",
        )
    value_rows = repository.get_entity_values(db, tenant_id, entity_id)
    _ = result
    return serializer.serialize_entity(entity, value_rows)
