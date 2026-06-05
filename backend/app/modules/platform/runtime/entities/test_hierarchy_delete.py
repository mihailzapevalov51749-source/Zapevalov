"""Unit tests for hierarchy-aware entity delete."""

from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.modules.platform.runtime.entities import hierarchy_delete
from app.modules.platform.shared.hierarchy_relation_profile import (
    hierarchy_parent_child_from_edge,
    resolve_hierarchy_relation_entity_sides,
)


def test_resolve_hierarchy_relation_entity_sides_default() -> None:
    parent_side, child_side = resolve_hierarchy_relation_entity_sides({})
    assert parent_side == "source"
    assert child_side == "target"


def test_hierarchy_parent_child_from_edge_default() -> None:
    source_id = uuid4()
    target_id = uuid4()
    parent_id, child_id = hierarchy_parent_child_from_edge(
        source_entity_id=source_id,
        target_entity_id=target_id,
        parent_side="source",
        child_side="target",
    )
    assert parent_id == str(source_id)
    assert child_id == str(target_id)


def test_collect_hierarchy_descendant_ids_deep_tree() -> None:
    root = "1"
    children_by_parent = {
        "1": ["1.1", "1.2"],
        "1.1": ["1.1.1", "1.1.2"],
    }

    descendants = hierarchy_delete.collect_hierarchy_descendant_ids(
        root,
        children_by_parent,
    )

    assert set(descendants) == {"1.1", "1.2", "1.1.1", "1.1.2"}


def test_collect_hierarchy_descendant_ids_no_children() -> None:
    descendants = hierarchy_delete.collect_hierarchy_descendant_ids("solo", {})
    assert descendants == []


def test_build_hierarchy_children_map_from_mock_edges() -> None:
    parent_id = uuid4()
    child_a = uuid4()
    child_b = uuid4()

    db = MagicMock()
    relation_definition = {
        "settings_json": {
            "parent_entity_side": "source",
            "child_entity_side": "target",
        },
    }

    with patch(
        "app.modules.platform.runtime.entities.hierarchy_delete.relation_repository.list_active_edges_by_relation_key",
        return_value=[(parent_id, child_a), (parent_id, child_b)],
    ):
        children_by_parent = hierarchy_delete.build_hierarchy_children_map(
            db,
            tenant_id=1,
            relation_key="task_subtask",
            relation_definition=relation_definition,
        )

    assert children_by_parent[str(parent_id)] == [str(child_a), str(child_b)]
