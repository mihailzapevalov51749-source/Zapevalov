"""Unit tests for plan tree sibling reorder semantics."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.modules.platform.runtime.plan_tree.reorder import reorder_hierarchy_siblings


class _FakeInstance:
    def __init__(self, source_id, target_id):
        self.id = uuid4()
        self.source_entity_id = source_id
        self.target_entity_id = target_id
        self.created_at = None
        self.updated_at = None


class _FakeQuery:
    def __init__(self, instances):
        self._instances = instances

    def filter(self, *_args, **_kwargs):
        return self

    def all(self):
        return self._instances


class _FakeSession:
  pass


def test_reorder_hierarchy_siblings_assigns_newest_created_at_to_first_child(monkeypatch):
    parent_id = uuid4()
    child_a = uuid4()
    child_b = uuid4()
    instance_a = _FakeInstance(parent_id, child_a)
    instance_b = _FakeInstance(parent_id, child_b)

    monkeypatch.setattr(
        "app.modules.platform.runtime.plan_tree.reorder.rel_repo.list_by_relation_key",
        lambda _db, _tenant_id, _relation_key: [instance_a, instance_b],
    )

    updated = reorder_hierarchy_siblings(
        _FakeSession(),
        1,
        "podpunkt",
        parent_entity_id=parent_id,
        ordered_child_ids=[child_a, child_b],
        relation_settings_json={
            "parent_entity_side": "source",
            "child_entity_side": "target",
        },
    )

    assert updated == 2
    assert instance_a.created_at > instance_b.created_at

    base = datetime.now(timezone.utc)
    assert instance_a.created_at >= base
    assert instance_b.created_at <= instance_a.created_at - timedelta(seconds=1)
