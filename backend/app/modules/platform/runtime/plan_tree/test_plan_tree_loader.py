"""Tests for bulk plan-tree loader helpers."""

from __future__ import annotations

from uuid import uuid4

from app.modules.platform.runtime.plan_tree.loader import collect_hierarchy_entity_ids


class _FakeInstance:
    def __init__(self, source_id, target_id):
        self.source_entity_id = source_id
        self.target_entity_id = target_id


def test_collect_hierarchy_entity_ids_collects_parent_and_child():
    parent_id = uuid4()
    child_id = uuid4()

    ids = collect_hierarchy_entity_ids(
        [
            _FakeInstance(parent_id, child_id),
        ],
        relation_settings_json={
            "parent_entity_side": "source",
            "child_entity_side": "target",
        },
    )

    assert ids == {parent_id, child_id}
