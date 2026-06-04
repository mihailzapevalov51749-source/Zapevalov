"""Domain constraints for task_subtask (WBS parent → child) relation instances."""

from __future__ import annotations

from collections import deque
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.runtime.catalog.service import PublishedRelationMetadata
from app.modules.platform.runtime.relation_instances import repository
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


def _build_child_adjacency(
    db: Session,
    tenant_id: int,
    relation_key: str,
) -> dict[UUID, list[UUID]]:
    instances = repository.list_active_edges_by_relation_key(db, tenant_id, relation_key)
    adjacency: dict[UUID, list[UUID]] = {}
    for source_id, target_id in instances:
        adjacency.setdefault(source_id, []).append(target_id)
    return adjacency


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
) -> bool:
    """
    Adding parent=source, child=target creates a cycle iff source is reachable
    from target along existing parent→child edges.
    """
    adjacency = _build_child_adjacency(db, tenant_id, relation_key)
    return _has_path_to_node(
        start_id=target_entity_id,
        goal_id=source_entity_id,
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

    if source_entity_id == target_entity_id:
        raise ValueError(TASK_SUBTASK_SELF_LINK_MESSAGE)

    existing_parent = repository.find_active_incoming_for_target(
        db,
        tenant_id,
        relation_key,
        target_entity_id,
    )
    if (
        existing_parent is not None
        and existing_parent.source_entity_id != source_entity_id
    ):
        raise ValueError(TASK_SUBTASK_MULTIPLE_PARENTS_MESSAGE)

    if would_create_task_subtask_cycle(
        db,
        tenant_id,
        relation_key,
        source_entity_id,
        target_entity_id,
    ):
        raise ValueError(TASK_SUBTASK_CYCLE_MESSAGE)
