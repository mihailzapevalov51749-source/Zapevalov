"""Technical plan-tree root anchor entity (virtual root container via relation engine)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog.service import PublishedObjectTypeMetadata
from app.modules.platform.runtime.entities.models import RuntimeEntity, RuntimeEntityValue
from app.modules.platform.runtime.entities import repository as ent_repo
from app.modules.platform.runtime.relation_instances import repository as rel_repo
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance
from sqlalchemy import or_, type_coerce
from sqlalchemy.dialects.postgresql import JSONB

from app.modules.platform.runtime.plan_tree.constants import (
    plan_tree_root_anchor_title,
    plan_tree_root_anchor_title_variants,
)
from app.modules.platform.runtime.plan_tree.reorder import collect_orphan_root_entity_ids
from app.modules.platform.shared.hierarchy_relation_profile import (
    hierarchy_parent_child_from_edge,
    resolve_hierarchy_relation_entity_sides,
)


def _resolve_title_field_key(metadata: PublishedObjectTypeMetadata) -> str | None:
    for field in metadata.fields:
        key = str(field.get("key") or "").strip()
        if not key:
            continue

        if str(field.get("field_type") or "").strip().lower() in {"title", "text", "string"}:
            return key

        settings = field.get("settings_json")
        if isinstance(settings, dict) and settings.get("is_title"):
            return key

    for field in metadata.fields:
        key = str(field.get("key") or "").strip()
        if key:
            return key

    return None


def find_plan_tree_root_anchor(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    relation_key: str,
    *,
    title_field_key: str | None,
) -> RuntimeEntity | None:
    if not title_field_key:
        return None

    title_matches = [
        RuntimeEntityValue.value_json == type_coerce(title_value, JSONB)
        for title_value in plan_tree_root_anchor_title_variants(relation_key)
    ]

    row = (
        db.query(RuntimeEntity)
        .join(
            RuntimeEntityValue,
            RuntimeEntityValue.entity_id == RuntimeEntity.id,
        )
        .filter(
            RuntimeEntity.tenant_id == tenant_id,
            RuntimeEntity.object_type_key == object_type_key,
            RuntimeEntity.deleted_at.is_(None),
            RuntimeEntityValue.tenant_id == tenant_id,
            RuntimeEntityValue.field_key == title_field_key,
            or_(*title_matches),
        )
        .first()
    )

    return row


def get_or_create_plan_tree_root_anchor(
    db: Session,
    tenant_id: int,
    object_type_metadata: PublishedObjectTypeMetadata,
    relation_key: str,
) -> RuntimeEntity:
    title_field_key = _resolve_title_field_key(object_type_metadata)
    existing = find_plan_tree_root_anchor(
        db,
        tenant_id,
        object_type_metadata.object_type_key,
        relation_key,
        title_field_key=title_field_key,
    )

    if existing:
        return existing

    anchor_title = plan_tree_root_anchor_title(relation_key)

    entity = RuntimeEntity(
        tenant_id=tenant_id,
        object_type_key=object_type_metadata.object_type_key,
        object_type_id=object_type_metadata.object_type_id,
        catalog_version=object_type_metadata.catalog_version,
        status="active",
        record_version=1,
        record_number=ent_repo.get_next_record_number(
            db,
            tenant_id,
            object_type_metadata.object_type_key,
        ),
    )
    ent_repo.create_entity(db, entity)

    if title_field_key:
        title_field = next(
            (field for field in object_type_metadata.fields if field.get("key") == title_field_key),
            None,
        )
        field_type = str(title_field.get("field_type") or "text") if title_field else "text"
        ent_repo.insert_entity_value(
            db,
            RuntimeEntityValue(
                tenant_id=tenant_id,
                entity_id=entity.id,
                field_key=title_field_key,
                field_type=field_type,
                value_json=anchor_title,
            ),
        )

    ent_repo.commit(db)
    ent_repo.refresh_entity(db, entity)
    return entity


def _anchor_child_ids(
    db: Session,
    tenant_id: int,
    relation_key: str,
    *,
    anchor_entity_id: UUID,
    relation_settings_json: dict | None,
) -> list[UUID]:
    parent_side, child_side = resolve_hierarchy_relation_entity_sides(relation_settings_json)
    instances = rel_repo.list_by_relation_key(db, tenant_id, relation_key)
    child_ids: list[UUID] = []

    for instance in instances:
        parent_id, child_id = hierarchy_parent_child_from_edge(
            source_entity_id=instance.source_entity_id,
            target_entity_id=instance.target_entity_id,
            parent_side=parent_side,
            child_side=child_side,
        )

        if str(parent_id) == str(anchor_entity_id) and child_id:
            child_ids.append(UUID(str(child_id)))

    return child_ids


def _build_relation_entity_ids(
    parent_entity_id: UUID,
    child_entity_id: UUID,
    *,
    parent_side: str,
    child_side: str,
) -> tuple[UUID, UUID]:
    if parent_side == "source" and child_side == "target":
        return parent_entity_id, child_entity_id

    return child_entity_id, parent_entity_id


def ensure_plan_tree_root_order(
    db: Session,
    tenant_id: int,
    *,
    object_type_metadata: PublishedObjectTypeMetadata,
    relation_key: str,
    relation_settings_json: dict | None,
    relation_metadata,
) -> tuple[UUID, list[UUID]]:
    anchor = get_or_create_plan_tree_root_anchor(
        db,
        tenant_id,
        object_type_metadata,
        relation_key,
    )
    anchor_children = _anchor_child_ids(
        db,
        tenant_id,
        relation_key,
        anchor_entity_id=anchor.id,
        relation_settings_json=relation_settings_json,
    )
    orphan_ids = collect_orphan_root_entity_ids(
        db,
        tenant_id,
        relation_key,
        object_type_key=object_type_metadata.object_type_key,
        anchor_entity_id=anchor.id,
        relation_settings_json=relation_settings_json,
    )

    ordered_root_ids = [*anchor_children, *orphan_ids]
    parent_side, child_side = resolve_hierarchy_relation_entity_sides(relation_settings_json)

    for child_id in orphan_ids:
        if child_id in anchor_children:
            continue

        source_id, target_id = _build_relation_entity_ids(
            anchor.id,
            child_id,
            parent_side=parent_side,
            child_side=child_side,
        )
        instance = RuntimeRelationInstance(
            tenant_id=tenant_id,
            relation_key=relation_key,
            relation_id=relation_metadata.relation_id,
            catalog_version=relation_metadata.catalog_version,
            source_entity_id=source_id,
            target_entity_id=target_id,
            source_object_type_key=object_type_metadata.object_type_key,
            target_object_type_key=object_type_metadata.object_type_key,
            status="active",
        )
        rel_repo.create_relation_instance(db, instance)
        anchor_children.append(child_id)

    rel_repo.commit(db)

    return anchor.id, ordered_root_ids
