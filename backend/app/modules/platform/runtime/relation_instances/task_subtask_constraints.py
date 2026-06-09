"""Domain constraints for task_subtask (WBS parent → child) relation instances."""

from __future__ import annotations

from collections import deque
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog.service import PublishedRelationMetadata
from app.modules.platform.runtime.relation_instances import repository
from app.modules.platform.shared.hierarchy_relation_profile import (
    hierarchy_parent_child_from_edge,
    resolve_hierarchy_relation_entity_sides,
)
from app.modules.platform.shared.task_subtask_contract import (
    TASK_SUBTASK_RELATION_KEY,
    is_task_subtask_relation,
)

TASK_SUBTASK_SELF_LINK_MESSAGE = (
    "Самоссылка (задача → та же задача) недопустима для связи подзадач task_subtask"
)
TASK_SUBTASK_MULTIPLE_PARENTS_MESSAGE = (
    "У подзадачи уже есть родительская задача по связи task_subtask"
)
TASK_SUBTASK_CYCLE_MESSAGE = (
    "Создание связи образует цикл в иерархии подзадач task_subtask"
)


def _build_hierarchy_child_adjacency(
    db: Session,
    tenant_id: int,
    relation_key: str,
    *,
    parent_side: str,
    child_side: str,
) -> dict[UUID, list[UUID]]:
    instances = repository.list_by_relation_key(db, tenant_id, relation_key)
    adjacency: dict[UUID, list[UUID]] = {}

    for instance in instances:
        parent_id, child_id = hierarchy_parent_child_from_edge(
            source_entity_id=instance.source_entity_id,
            target_entity_id=instance.target_entity_id,
            parent_side=parent_side,
            child_side=child_side,
        )

        if not parent_id or not child_id:
            continue

        parent_uuid = UUID(str(parent_id))
        child_uuid = UUID(str(child_id))
        adjacency.setdefault(parent_uuid, []).append(child_uuid)

    return adjacency


def _find_existing_parent_entity_id(
    db: Session,
    tenant_id: int,
    relation_key: str,
    child_entity_id: UUID,
    *,
    parent_side: str,
    child_side: str,
) -> UUID | None:
    instances = repository.list_by_relation_key(db, tenant_id, relation_key)

    for instance in instances:
        parent_id, child_id = hierarchy_parent_child_from_edge(
            source_entity_id=instance.source_entity_id,
            target_entity_id=instance.target_entity_id,
            parent_side=parent_side,
            child_side=child_side,
        )

        if not child_id:
            continue

        if UUID(str(child_id)) == child_entity_id:
            return UUID(str(parent_id)) if parent_id else None

    return None


def _has_path_to_node(
    *,
    start_id: UUID,
    goal_id: UUID,
    adjacency: dict[UUID, list[UUID]],
) -> bool:
    if start_id == goal_id:
        return True

    queue: deque[UUID] = deque([start_id])
    visited: set[UUID] = set()

    while queue:
        node = queue.popleft()
        if node in visited:
            continue
        visited.add(node)

        for child_id in adjacency.get(node, []):
            if child_id == goal_id:
                return True
            queue.append(child_id)

    return False


def would_create_task_subtask_cycle(
    db: Session,
    tenant_id: int,
    relation_key: str,
    source_entity_id: UUID,
    target_entity_id: UUID,
    *,
    relation_settings_json: dict | None = None,
) -> bool:
    """
    Adding parent→child edge creates a cycle iff parent is reachable from child
    along existing hierarchy edges.
    """
    parent_side, child_side = resolve_hierarchy_relation_entity_sides(relation_settings_json)
    parent_id_str, child_id_str = hierarchy_parent_child_from_edge(
        source_entity_id=source_entity_id,
        target_entity_id=target_entity_id,
        parent_side=parent_side,
        child_side=child_side,
    )

    if not parent_id_str or not child_id_str:
        return False

    parent_id = UUID(str(parent_id_str))
    child_id = UUID(str(child_id_str))
    adjacency = _build_hierarchy_child_adjacency(
        db,
        tenant_id,
        relation_key,
        parent_side=parent_side,
        child_side=child_side,
    )

    return _has_path_to_node(
        start_id=child_id,
        goal_id=parent_id,
        adjacency=adjacency,
    )


def validate_task_subtask_instance_create(
    db: Session,
    tenant_id: int,
    *,
    relation_metadata: PublishedRelationMetadata,
    source_entity_id: UUID,
    target_entity_id: UUID,
) -> None:
    if not is_task_subtask_relation(
        relation_key=relation_metadata.relation_key,
        settings_json=relation_metadata.settings_json,
    ):
        return

    relation_key = relation_metadata.relation_key or TASK_SUBTASK_RELATION_KEY
    settings = (
        relation_metadata.settings_json
        if isinstance(relation_metadata.settings_json, dict)
        else {}
    )
    parent_side, child_side = resolve_hierarchy_relation_entity_sides(settings)
    parent_id_str, child_id_str = hierarchy_parent_child_from_edge(
        source_entity_id=source_entity_id,
        target_entity_id=target_entity_id,
        parent_side=parent_side,
        child_side=child_side,
    )

    if not parent_id_str or not child_id_str:
        return

    parent_id = UUID(str(parent_id_str))
    child_id = UUID(str(child_id_str))

    if parent_id == child_id:
        raise ValueError(TASK_SUBTASK_SELF_LINK_MESSAGE)

    existing_parent_id = _find_existing_parent_entity_id(
        db,
        tenant_id,
        relation_key,
        child_id,
        parent_side=parent_side,
        child_side=child_side,
    )

    if existing_parent_id is not None and existing_parent_id != parent_id:
        raise ValueError(TASK_SUBTASK_MULTIPLE_PARENTS_MESSAGE)

    if would_create_task_subtask_cycle(
        db,
        tenant_id,
        relation_key,
        source_entity_id,
        target_entity_id,
        relation_settings_json=settings,
    ):
        raise ValueError(TASK_SUBTASK_CYCLE_MESSAGE)
