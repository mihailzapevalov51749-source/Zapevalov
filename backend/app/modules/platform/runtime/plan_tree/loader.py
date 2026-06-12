"""Bulk plan-tree payload assembly (relations + entities in optimized queries)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog.service import PublishedObjectTypeMetadata
from app.modules.platform.runtime.entities import repository as ent_repo
from app.modules.platform.runtime.entities import serializer as ent_serializer
from app.modules.platform.runtime.entities.schemas import EntityRead
from app.modules.platform.runtime.plan_tree.root_anchor import ensure_plan_tree_root_order
from app.modules.platform.runtime.relation_instances import repository as rel_repo
from app.modules.platform.runtime.relation_instances import serializer as rel_serializer
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceListItem
from app.modules.platform.shared.hierarchy_relation_profile import (
    hierarchy_parent_child_from_edge,
    resolve_hierarchy_relation_entity_sides,
)


def collect_hierarchy_entity_ids(
    instances: list[RuntimeRelationInstance],
    *,
    relation_settings_json: dict | None,
) -> set[UUID]:
    parent_side, child_side = resolve_hierarchy_relation_entity_sides(relation_settings_json)
    entity_ids: set[UUID] = set()

    for instance in instances:
        parent_id, child_id = hierarchy_parent_child_from_edge(
            source_entity_id=instance.source_entity_id,
            target_entity_id=instance.target_entity_id,
            parent_side=parent_side,
            child_side=child_side,
        )

        if parent_id:
            entity_ids.add(UUID(str(parent_id)))
        if child_id:
            entity_ids.add(UUID(str(child_id)))

    return entity_ids


def _anchor_child_root_ids(
    instances: list[RuntimeRelationInstance],
    *,
    anchor_entity_id: UUID,
    relation_settings_json: dict | None,
) -> list[UUID]:
    parent_side, child_side = resolve_hierarchy_relation_entity_sides(relation_settings_json)
    root_ids: list[UUID] = []

    for instance in instances:
        parent_id, child_id = hierarchy_parent_child_from_edge(
            source_entity_id=instance.source_entity_id,
            target_entity_id=instance.target_entity_id,
            parent_side=parent_side,
            child_side=child_side,
        )

        if parent_id and child_id and str(parent_id) == str(anchor_entity_id):
            root_ids.append(UUID(str(child_id)))

    return root_ids


def load_plan_tree_payload(
    db: Session,
    tenant_id: int,
    *,
    object_type_metadata: PublishedObjectTypeMetadata,
    relation_key: str,
    relation_settings_json: dict | None,
    relation_metadata,
) -> tuple[UUID, list[UUID], list[EntityRead], list[RelationInstanceListItem]]:
    anchor_id, _ordered_root_ids = ensure_plan_tree_root_order(
        db,
        tenant_id,
        object_type_metadata=object_type_metadata,
        relation_key=relation_key,
        relation_settings_json=relation_settings_json,
        relation_metadata=relation_metadata,
    )

    instances = rel_repo.list_by_relation_key(db, tenant_id, relation_key)
    entity_ids = collect_hierarchy_entity_ids(
        instances,
        relation_settings_json=relation_settings_json,
    )

    entities = ent_repo.list_entities_by_ids(
        db,
        tenant_id,
        object_type_metadata.object_type_key,
        list(entity_ids),
    )

    serialized_entities = [
        ent_serializer.serialize_entity(entity, list(entity.values))
        for entity in entities
    ]
    serialized_instances = [
        rel_serializer.serialize_relation_instance_list_item(instance)
        for instance in instances
    ]
    root_ids = _anchor_child_root_ids(
        instances,
        anchor_entity_id=anchor_id,
        relation_settings_json=relation_settings_json,
    )

    return anchor_id, root_ids, serialized_entities, serialized_instances
