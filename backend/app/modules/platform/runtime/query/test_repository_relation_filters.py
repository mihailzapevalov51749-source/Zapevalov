from uuid import UUID

from app.modules.platform.runtime.query.repository import (
    _parse_relation_field_settings,
    _relation_linked_entity_ids_subquery,
)
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance
from app.modules.platform.shared.enums import FieldType


class _QueryRecorder:
    def __init__(self, model):
        self.model = model
        self.filters = []
        self.entity_column = None

    def filter(self, *args):
        self.filters.extend(args)
        return self

    def with_entities(self, *columns):
        self.entity_column = columns[0]
        return self

    def distinct(self):
        return self


class _FakeSession:
    def __init__(self):
        self.recorder = None

    def query(self, model):
        self.recorder = _QueryRecorder(model)
        return self.recorder


def test_parse_relation_field_settings_reads_contract():
    relation_key, role = _parse_relation_field_settings(
        {
            "key": "project",
            "field_type": FieldType.RELATION.value,
            "settings_json": {
                "relation_key": "task_project",
                "role": "source",
                "cardinality": "one",
            },
        },
    )

    assert relation_key == "task_project"
    assert role == "source"


def test_relation_linked_entity_ids_subquery_source_role_uses_outgoing_side():
    db = _FakeSession()
    peer_id = UUID("22222222-2222-4222-8222-222222222222")

    _relation_linked_entity_ids_subquery(
        db,
        7,
        relation_key="task_project",
        role="source",
        peer_entity_id=peer_id,
    )

    assert db.recorder.model is RuntimeRelationInstance
    assert db.recorder.entity_column is RuntimeRelationInstance.source_entity_id
    assert len(db.recorder.filters) == 4


def test_relation_linked_entity_ids_subquery_target_role_uses_incoming_side():
    db = _FakeSession()

    _relation_linked_entity_ids_subquery(
        db,
        7,
        relation_key="task_project",
        role="target",
    )

    assert db.recorder.entity_column is RuntimeRelationInstance.target_entity_id
