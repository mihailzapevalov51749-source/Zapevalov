"""Reorder hierarchy siblings by relation instance created_at (display order)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.runtime.relation_instances import repository as rel_repo
from app.modules.platform.shared.hierarchy_relation_profile import (
    hierarchy_parent_child_from_edge,
    resolve_hierarchy_relation_entity_sides,
)


def _find_active_parent_child_instance(
    db: Session,
    tenant_id: int,
    relation_key: str,
    *,
    parent_entity_id: UUID,
    child_entity_id: UUID,
    parent_side: str,
    child_side: str,
):
    instances = rel_repo.list_by_relation_key(db, tenant_id, relation_key)

    for instance in instances:
        parent_id, child_id = hierarchy_parent_child_from_edge(
            source_entity_id=instance.source_entity_id,
            target_entity_id=instance.target_entity_id,
            parent_side=parent_side,
            child_side=child_side,
        )

        if (
            str(parent_id) == str(parent_entity_id)
            and str(child_id) == str(child_entity_id)
        ):
            return instance

    return None


def reorder_hierarchy_siblings(
    db: Session,
    tenant_id: int,
    relation_key: str,
    *,
    parent_entity_id: UUID,
    ordered_child_ids: list[UUID],
    relation_settings_json: dict | None,
) -> int:
    """
    First child id in ordered_child_ids is displayed first in the plan tree.

    Uses created_at DESC ordering in list_by_relation_key — newest first.
    """
    parent_side, child_side = resolve_hierarchy_relation_entity_sides(relation_settings_json)
    base_time = datetime.now(timezone.utc)
    updated = 0

    for index, child_id in enumerate(ordered_child_ids):
        instance = _find_active_parent_child_instance(
            db,
            tenant_id,
            relation_key,
            parent_entity_id=parent_entity_id,
            child_entity_id=child_id,
            parent_side=parent_side,
            child_side=child_side,
        )

        if not instance:
            raise ValueError(
                f"Missing hierarchy edge parent={parent_entity_id} child={child_id}",
            )

        rank = len(ordered_child_ids) - index
        instance.created_at = base_time + timedelta(seconds=rank)
        instance.updated_at = base_time
        updated += 1

    return updated


def collect_orphan_root_entity_ids(
    db: Session,
    tenant_id: int,
    relation_key: str,
    *,
    object_type_key: str,
    anchor_entity_id: UUID,
    relation_settings_json: dict | None,
) -> list[UUID]:
    """Entities of object_type_key that are not hierarchy children (except anchor)."""
    parent_side, child_side = resolve_hierarchy_relation_entity_sides(relation_settings_json)
    instances = rel_repo.list_by_relation_key(db, tenant_id, relation_key)
    child_ids: set[UUID] = set()

    for instance in instances:
        _parent_id, child_id = hierarchy_parent_child_from_edge(
            source_entity_id=instance.source_entity_id,
            target_entity_id=instance.target_entity_id,
            parent_side=parent_side,
            child_side=child_side,
        )

        if child_id:
            child_ids.add(UUID(str(child_id)))

    from app.modules.platform.runtime.entities.models import RuntimeEntity

    rows = (
        db.query(RuntimeEntity)
        .filter(
            RuntimeEntity.tenant_id == tenant_id,
            RuntimeEntity.object_type_key == object_type_key,
            RuntimeEntity.deleted_at.is_(None),
        )
        .all()
    )

    orphan_ids: list[UUID] = []

    for entity in rows:
        if entity.id == anchor_entity_id:
            continue

        if entity.is_system:
            continue

        if entity.id in child_ids:
            continue

        orphan_ids.append(entity.id)

    return orphan_ids
