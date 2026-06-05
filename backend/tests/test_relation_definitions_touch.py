"""Relation definition updates must bump parent ObjectType.updated_at."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.modules.platform.designer.relation_definitions.schemas import RelationDefinitionUpdate
from app.modules.platform.designer.relation_definitions import service
from app.modules.platform.designer.publish.draft_loader import TenantDraftCatalog
from app.modules.platform.designer.publish.snapshot_builder import build_snapshot_payload


def test_update_relation_touches_parent_object_types() -> None:
    tenant_id = 1
    relation_id = uuid4()
    source_id = uuid4()
    target_id = uuid4()

    entity = SimpleNamespace(
        id=relation_id,
        tenant_id=tenant_id,
        key="task_subtask",
        name="Подзадача",
        description="",
        source_object_type_id=source_id,
        target_object_type_id=target_id,
        relation_type="one_to_many",
        reverse_name=None,
        sort_order=0,
        is_required=False,
        is_system=False,
        is_active=True,
        bidirectional=False,
        cascade_delete=False,
        settings_json={"semantic_profile": "task_subtask"},
        validation_json={},
        draft_revision=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        deleted_at=None,
    )
    source = SimpleNamespace(id=source_id, key="task", name="Задача", is_system=False)
    target = SimpleNamespace(id=target_id, key="task", name="Задача", is_system=False)

    db = MagicMock()

    with (
        patch(
            "app.modules.platform.designer.relation_definitions.service.repository.get_relation",
            return_value=entity,
        ),
        patch(
            "app.modules.platform.designer.relation_definitions.service._get_object_type_or_404",
            side_effect=[source, target],
        ),
        patch(
            "app.modules.platform.designer.relation_definitions.service.repository.save_relation",
            return_value=entity,
        ) as save_relation,
        patch(
            "app.modules.platform.designer.relation_definitions.service._touch_relation_object_types",
        ) as touch_object_types,
    ):
        payload = RelationDefinitionUpdate(
            settings_json={
                "is_hierarchy": True,
                "hierarchy_labels": {
                    "child": "Элемент",
                    "children": "Элементы",
                    "children_genitive": "Элементов",
                    "children_instrumental": "Элементами",
                },
            },
        )
        service.update_relation(db, tenant_id, relation_id, payload, current_user=None)

    save_relation.assert_called_once()
    touch_object_types.assert_called_once_with(
        db,
        tenant_id,
        source_id,
        target_id,
        None,
    )


def test_publish_snapshot_preserves_hierarchy_labels() -> None:
    object_type_id = uuid4()
    object_type = SimpleNamespace(
        id=object_type_id,
        key="task",
        name="Задача",
        description=None,
        icon=None,
        icon_type=None,
        icon_file_url=None,
        color=None,
        sort_order=0,
        status="active",
        is_system=False,
        is_default_entity=False,
        settings_json={},
        governance_json={},
    )
    relation = SimpleNamespace(
        id=uuid4(),
        key="task_subtask",
        name="Подзадача",
        description="",
        source_object_type_id=object_type_id,
        target_object_type_id=object_type_id,
        relation_type="one_to_many",
        reverse_name=None,
        sort_order=0,
        is_required=False,
        is_system=False,
        is_active=True,
        bidirectional=False,
        cascade_delete=False,
        settings_json={
            "is_hierarchy": True,
            "hierarchy_labels": {
                "parent": "Задача",
                "child": "Элемент",
                "children": "Элементы",
                "children_genitive": "Элементов",
                "children_instrumental": "Элементами",
            },
        },
        validation_json={},
    )

    payload = build_snapshot_payload(
        tenant_id=1,
        catalog_version=2,
        catalog=TenantDraftCatalog(
            object_types=[object_type],
            fields=[],
            views=[],
            relations=[relation],
        ),
    )

    published_relation = payload["relations"][0]

    assert published_relation["settings_json"]["is_hierarchy"] is True
    assert published_relation["settings_json"]["hierarchy_labels"]["child"] == "Элемент"
