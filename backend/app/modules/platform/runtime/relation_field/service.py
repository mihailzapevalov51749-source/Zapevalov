from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.catalog.service import PublishedRelationMetadata
from app.modules.platform.runtime.entities import repository as entities_repository
from app.modules.platform.runtime.relation_field.schemas import (
    RelationFieldLinkResult,
    RelationFieldLinkedEntity,
    RelationFieldMetadataRead,
    RelationFieldStateRead,
)
from app.modules.platform.runtime.relation_instances import repository as relation_repository
from app.modules.platform.runtime.relation_instances import service as relation_instances_service
from app.modules.platform.runtime.relation_instances.schemas import (
    RelationInstanceCreate,
    RelationInstanceRead,
)
from app.modules.platform.shared.exceptions import CatalogNotFound
from app.modules.platform.shared.relation_field_contract import (
    is_relation_field_type,
    validate_relation_field_settings,
    validate_relation_field_with_definition,
)
from app.modules.users.models import User


@dataclass(frozen=True)
class ResolvedRelationField:
    field_key: str
    relation_key: str
    role: str
    cardinality: str
    object_type_key: str


def _relation_binding_adapter(
    db: Session,
    tenant_id: int,
    relation_metadata: PublishedRelationMetadata,
):
    source_meta = catalog_service.get_published_object_type_metadata(
        db,
        tenant_id,
        relation_metadata.source_object_type_key,
    )
    target_meta = catalog_service.get_published_object_type_metadata(
        db,
        tenant_id,
        relation_metadata.target_object_type_key,
    )
    return SimpleNamespace(
        key=relation_metadata.relation_key,
        is_active=relation_metadata.is_active,
        deleted_at=None,
        source_object_type_id=source_meta.object_type_id,
        target_object_type_id=target_meta.object_type_id,
    )


def _validation_http_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=message,
    )


def _catalog_http_error(exc: CatalogNotFound) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=str(exc) or "Published catalog не найден",
    )


def _not_found(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)


def _get_entity_or_404(db: Session, tenant_id: int, entity_id: UUID, *, label: str):
    entity = entities_repository.get_entity(db, tenant_id, entity_id)
    if not entity:
        raise _not_found(f"{label} entity не найдена")
    return entity


def _resolve_relation_field(
    db: Session,
    tenant_id: int,
    entity,
    field_key: str,
) -> ResolvedRelationField:
    try:
        object_type_metadata = catalog_service.get_published_object_type_metadata(
            db,
            tenant_id,
            entity.object_type_key,
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    field_meta = next(
        (
            field
            for field in object_type_metadata.fields
            if field.get("key") == field_key
        ),
        None,
    )

    if not field_meta:
        raise _not_found(f"Поле '{field_key}' не найдено в published catalog")

    if not is_relation_field_type(field_meta.get("field_type")):
        raise _validation_http_error(
            f"Поле '{field_key}' не является relation field",
        )

    settings = validate_relation_field_settings(field_meta.get("settings_json") or {})

    try:
        relation_metadata = catalog_service.get_published_relation_metadata(
            db,
            tenant_id,
            settings["relation_key"],
        )
    except CatalogNotFound as exc:
        raise _catalog_http_error(exc) from exc

    relation_binding = _relation_binding_adapter(db, tenant_id, relation_metadata)

    try:
        validate_relation_field_with_definition(
            settings_json=settings,
            object_type_id=object_type_metadata.object_type_id,
            relation=relation_binding,
        )
    except ValueError as exc:
        raise _validation_http_error(str(exc)) from exc

    return ResolvedRelationField(
        field_key=field_key,
        relation_key=settings["relation_key"],
        role=settings["role"],
        cardinality=settings["cardinality"],
        object_type_key=entity.object_type_key,
    )


def _list_side(role: str) -> str:
    return "outgoing" if role == "source" else "incoming"


def _resolve_source_target(
    anchor_entity_id: UUID,
    target_entity_id: UUID,
    role: str,
) -> tuple[UUID, UUID]:
    if role == "source":
        return anchor_entity_id, target_entity_id
    return target_entity_id, anchor_entity_id


def _peer_entity_id(instance, anchor_entity_id: UUID, role: str) -> UUID:
    if role == "source":
        return instance.target_entity_id
    return instance.source_entity_id


def _resolve_entity_display_title(
    db: Session,
    tenant_id: int,
    entity,
) -> str:
    title_key: str | None = None

    try:
        projection = catalog_service.get_published_view_projection_metadata(
            db,
            tenant_id,
            entity.object_type_key,
            "default_table",
        )
        title_key = projection.title_field
    except CatalogNotFound:
        title_key = None

    if title_key:
        value_row = entities_repository.get_entity_value_row(
            db,
            tenant_id,
            entity.id,
            title_key,
        )
        if value_row and value_row.value_json is not None:
            text = str(value_row.value_json).strip()
            if text:
                return text

    try:
        metadata = catalog_service.get_published_object_type_metadata(
            db,
            tenant_id,
            entity.object_type_key,
        )
    except CatalogNotFound:
        return str(entity.id)

    for field in metadata.fields:
        if field.get("field_type") in {"text", "textarea"} and field.get("key"):
            value_row = entities_repository.get_entity_value_row(
                db,
                tenant_id,
                entity.id,
                str(field["key"]),
            )
            if value_row and value_row.value_json is not None:
                text = str(value_row.value_json).strip()
                if text:
                    return text

    return str(entity.id)


def _serialize_linked_entity(
    db: Session,
    tenant_id: int,
    *,
    instance,
    anchor_entity_id: UUID,
    role: str,
) -> RelationFieldLinkedEntity:
    peer_id = _peer_entity_id(instance, anchor_entity_id, role)
    peer_entity = _get_entity_or_404(db, tenant_id, peer_id, label="Связанная")

    return RelationFieldLinkedEntity(
        entity_id=peer_id,
        title=_resolve_entity_display_title(db, tenant_id, peer_entity),
        relation_instance_id=instance.id,
    )


def _list_instances_for_field(
    db: Session,
    tenant_id: int,
    anchor_entity_id: UUID,
    resolved: ResolvedRelationField,
) -> list:
    return relation_repository.list_active_for_entity_relation_key(
        db,
        tenant_id,
        anchor_entity_id,
        resolved.relation_key,
        side=_list_side(resolved.role),
    )


def get_relation_field_metadata(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
    field_key: str,
) -> RelationFieldMetadataRead:
    entity = _get_entity_or_404(db, tenant_id, entity_id, label="Entity")
    resolved = _resolve_relation_field(db, tenant_id, entity, field_key)

    return RelationFieldMetadataRead(
        field_key=resolved.field_key,
        field_type="relation",
        relation_key=resolved.relation_key,
        role=resolved.role,
        cardinality=resolved.cardinality,
    )


def get_relation_field_state(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
    field_key: str,
) -> RelationFieldStateRead:
    entity = _get_entity_or_404(db, tenant_id, entity_id, label="Entity")
    resolved = _resolve_relation_field(db, tenant_id, entity, field_key)
    instances = _list_instances_for_field(db, tenant_id, entity_id, resolved)

    items = [
        _serialize_linked_entity(
            db,
            tenant_id,
            instance=instance,
            anchor_entity_id=entity_id,
            role=resolved.role,
        )
        for instance in instances
    ]

    return RelationFieldStateRead(
        field_key=resolved.field_key,
        field_type="relation",
        relation_key=resolved.relation_key,
        role=resolved.role,
        cardinality=resolved.cardinality,
        items=items,
    )


def create_relation_field_link(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
    field_key: str,
    target_entity_id: UUID,
    current_user: User | None = None,
) -> RelationFieldLinkResult:
    entity = _get_entity_or_404(db, tenant_id, entity_id, label="Entity")
    resolved = _resolve_relation_field(db, tenant_id, entity, field_key)

    source_id, resolved_target_id = _resolve_source_target(
        entity_id,
        target_entity_id,
        resolved.role,
    )

    if resolved.cardinality == "one":
        existing = _list_instances_for_field(db, tenant_id, entity_id, resolved)
        for instance in existing:
            if _peer_entity_id(instance, entity_id, resolved.role) != resolved_target_id:
                relation_instances_service.delete_relation_instance(
                    db,
                    tenant_id,
                    instance.id,
                    current_user=current_user,
                )

    payload = RelationInstanceCreate(
        source_entity_id=source_id,
        target_entity_id=resolved_target_id,
    )

    created = relation_instances_service.create_relation_instance(
        db,
        tenant_id,
        resolved.relation_key,
        payload,
        current_user=current_user,
    )

    instance = relation_repository.get_relation_instance(
        db,
        tenant_id,
        created.id,
    )
    linked = _serialize_linked_entity(
        db,
        tenant_id,
        instance=instance,
        anchor_entity_id=entity_id,
        role=resolved.role,
    )

    return RelationFieldLinkResult(
        field=RelationFieldMetadataRead(
            field_key=resolved.field_key,
            field_type="relation",
            relation_key=resolved.relation_key,
            role=resolved.role,
            cardinality=resolved.cardinality,
        ),
        relation_instance=created,
        linked_entity=linked,
    )


def delete_relation_field_link(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
    field_key: str,
    target_entity_id: UUID,
    current_user: User | None = None,
) -> RelationFieldLinkResult:
    entity = _get_entity_or_404(db, tenant_id, entity_id, label="Entity")
    resolved = _resolve_relation_field(db, tenant_id, entity, field_key)

    instances = _list_instances_for_field(db, tenant_id, entity_id, resolved)
    match = next(
        (
            instance
            for instance in instances
            if _peer_entity_id(instance, entity_id, resolved.role) == target_entity_id
        ),
        None,
    )

    if not match:
        raise _not_found(
            "Relation instance для указанного relation field и target_entity_id не найдена",
        )

    deleted = relation_instances_service.delete_relation_instance(
        db,
        tenant_id,
        match.id,
        current_user=current_user,
    )

    return RelationFieldLinkResult(
        field=RelationFieldMetadataRead(
            field_key=resolved.field_key,
            field_type="relation",
            relation_key=resolved.relation_key,
            role=resolved.role,
            cardinality=resolved.cardinality,
        ),
        relation_instance=deleted,
        linked_entity=RelationFieldLinkedEntity(
            entity_id=target_entity_id,
            title="",
            relation_instance_id=deleted.id,
        ),
    )
