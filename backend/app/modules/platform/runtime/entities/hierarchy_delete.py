"""Hierarchy-aware entity delete via Relation Engine (runtime_relation_instances)."""

from __future__ import annotations

from collections import deque
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog import repository as catalog_repository
from app.modules.platform.runtime.relation_instances import repository as relation_repository
from app.modules.platform.shared.hierarchy_relation_profile import (
    hierarchy_parent_child_from_edge,
    resolve_hierarchy_relation_entity_sides,
    resolve_primary_hierarchy_subtask_relation_key,
)


def _catalog_relations(db: Session, tenant_id: int) -> list[dict[str, Any]]:
    snapshot = catalog_repository.get_latest_snapshot(db, tenant_id)
    if not snapshot:
        return []
    payload = snapshot.payload or {}
    relations = payload.get("relations")
    return relations if isinstance(relations, list) else []


def _find_relation_definition(
    relations: list[dict[str, Any]],
    relation_key: str,
) -> dict[str, Any] | None:
    normalized_key = str(relation_key or "").strip()
    for relation in relations:
        if str(relation.get("key") or "").strip() == normalized_key:
            return relation
    return None


def build_hierarchy_children_map(
    db: Session,
    tenant_id: int,
    relation_key: str,
    relation_definition: dict[str, Any] | None,
) -> dict[str, list[str]]:
    parent_side, child_side = resolve_hierarchy_relation_entity_sides(
        (relation_definition or {}).get("settings_json")
        if isinstance((relation_definition or {}).get("settings_json"), dict)
        else {},
    )
    edges = relation_repository.list_active_edges_by_relation_key(
        db,
        tenant_id,
        relation_key,
    )
    children_by_parent: dict[str, list[str]] = {}
    for source_id, target_id in edges:
        parent_id, child_id = hierarchy_parent_child_from_edge(
            source_entity_id=source_id,
            target_entity_id=target_id,
            parent_side=parent_side,
            child_side=child_side,
        )
        if not parent_id or not child_id or parent_id == child_id:
            continue
        children_by_parent.setdefault(parent_id, []).append(child_id)
    return children_by_parent


def collect_hierarchy_descendant_ids(
    root_entity_id: UUID | str,
    children_by_parent: dict[str, list[str]],
) -> list[str]:
    root_id = str(root_entity_id)
    result: list[str] = []
    seen: set[str] = set()
    queue: deque[str] = deque()

    for child_id in children_by_parent.get(root_id, []):
        normalized = str(child_id).strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            queue.append(normalized)

    while queue:
        current_id = queue.popleft()
        result.append(current_id)
        for child_id in children_by_parent.get(current_id, []):
            normalized = str(child_id).strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                queue.append(normalized)

    return result


def resolve_hierarchy_delete_context(
    db: Session,
    tenant_id: int,
    object_type_key: str,
) -> tuple[str, dict[str, Any] | None]:
    relations = _catalog_relations(db, tenant_id)
    relation_key = resolve_primary_hierarchy_subtask_relation_key(
        relations,
        object_type_key,
    )
    if not relation_key:
        return "", None
    return relation_key, _find_relation_definition(relations, relation_key)


def count_hierarchy_descendants(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    entity_id: UUID,
) -> tuple[int, str]:
    relation_key, relation_definition = resolve_hierarchy_delete_context(
        db,
        tenant_id,
        object_type_key,
    )
    if not relation_key:
        return 0, ""

    children_by_parent = build_hierarchy_children_map(
        db,
        tenant_id,
        relation_key,
        relation_definition,
    )
    descendants = collect_hierarchy_descendant_ids(entity_id, children_by_parent)
    return len(descendants), relation_key


def list_hierarchy_relation_instances_for_entity(
    db: Session,
    tenant_id: int,
    entity_id: UUID,
    relation_key: str,
) -> list:
    return relation_repository.list_active_for_entity_relation_key(
        db,
        tenant_id,
        entity_id,
        relation_key,
        side="outgoing",
    ) + relation_repository.list_active_for_entity_relation_key(
        db,
        tenant_id,
        entity_id,
        relation_key,
        side="incoming",
    )


def list_relation_instances_touching_entities(
    db: Session,
    tenant_id: int,
    entity_ids: set[UUID],
) -> list:
    instances: list = []
    seen_ids: set[UUID] = set()
    for entity_id in entity_ids:
        for instance in relation_repository.list_for_entity(db, tenant_id, entity_id):
            if instance.id in seen_ids:
                continue
            seen_ids.add(instance.id)
            instances.append(instance)
    return instances
