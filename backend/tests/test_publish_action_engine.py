"""Publish snapshot contract for Action Definition and Action Placement."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.modules.platform.designer.publish.draft_loader import TenantDraftCatalog
from app.modules.platform.designer.publish.snapshot_builder import (
    SCHEMA_VERSION,
    build_snapshot_payload,
)
from app.modules.platform.designer.publish.validators import validate_tenant_draft_catalog
from app.modules.platform.runtime.catalog.service import get_published_actions


def _object_type(object_type_id=None):
    return SimpleNamespace(
        id=object_type_id or uuid4(),
        key="tasks",
        name="Задачи",
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


def _default_table_view(object_type_id):
    return SimpleNamespace(
        id=uuid4(),
        object_type_id=object_type_id,
        key="default_table",
        name="Таблица",
        description=None,
        view_type="table",
        is_default=True,
        is_system=True,
        is_active=True,
        sort_order=0,
        settings_json={"projection": {"visible_fields": [], "field_order": []}},
        layout_json={},
        filters_json={},
        visibility_json={},
    )


def _action(
    object_type_id,
    *,
    key="create_task",
    is_active=True,
    target_object_type_id=None,
):
    return SimpleNamespace(
        id=uuid4(),
        object_type_id=object_type_id,
        target_object_type_id=target_object_type_id or object_type_id,
        key=key,
        name="Создать задачу",
        description=None,
        action_type_key="create_record",
        is_active=is_active,
    )


def _placement(action_id, object_type_id, *, placement_key="top_panel", is_active=True):
    return SimpleNamespace(
        id=uuid4(),
        action_definition_id=action_id,
        object_type_id=object_type_id,
        placement_key=placement_key,
        is_active=is_active,
        sort_order=10,
        label_override=None,
        icon_key=None,
        config_json={},
    )


def test_publish_snapshot_includes_active_actions_and_placements() -> None:
    object_type = _object_type()
    action = _action(object_type.id)
    placement_top = _placement(action.id, object_type.id, placement_key="top_panel")
    placement_row = _placement(
        action.id,
        object_type.id,
        placement_key="row_menu",
        is_active=True,
    )
    placement_row.sort_order = 20

    payload = build_snapshot_payload(
        tenant_id=1,
        catalog_version=3,
        catalog=TenantDraftCatalog(
            object_types=[object_type],
            fields=[],
            views=[_default_table_view(object_type.id)],
            relations=[],
            actions=[action],
            placements=[placement_top, placement_row],
        ),
    )

    assert payload["schema_version"] == SCHEMA_VERSION == 2

    published_object_type = payload["object_types"][0]
    assert "actions" in published_object_type
    assert len(published_object_type["actions"]) == 1

    published_action = published_object_type["actions"][0]
    assert published_action["key"] == "create_task"
    assert published_action["action_type_key"] == "create_record"
    assert published_action["version"] == 1
    assert published_action["config_json"] == {}
    assert len(published_action["placements"]) == 2
    assert published_action["placements"][0]["placement_key"] == "top_panel"
    assert published_action["placements"][1]["placement_key"] == "row_menu"
    assert published_action["target_object_type"] == {
        "id": str(object_type.id),
        "key": "tasks",
        "name": "Задачи",
    }


def test_publish_snapshot_includes_auto_link_relation() -> None:
    source_object_type = _object_type()
    source_object_type.key = "projects"
    source_object_type.name = "Проекты"

    target_object_type = _object_type()
    target_object_type.key = "tasks"
    target_object_type.name = "Задачи"

    relation = SimpleNamespace(
        id=uuid4(),
        key="project_tasks",
        name="Проект → Задачи",
        description=None,
        source_object_type_id=source_object_type.id,
        target_object_type_id=target_object_type.id,
        relation_type="one_to_many",
        reverse_name=None,
        sort_order=0,
        is_required=False,
        is_system=False,
        is_active=True,
        bidirectional=True,
        cascade_delete=False,
        settings_json={},
        validation_json={},
    )

    action = _action(
        source_object_type.id,
        target_object_type_id=target_object_type.id,
    )
    action.auto_link_enabled = True
    action.auto_link_relation_id = relation.id

    payload = build_snapshot_payload(
        tenant_id=1,
        catalog_version=5,
        catalog=TenantDraftCatalog(
            object_types=[source_object_type, target_object_type],
            fields=[],
            views=[
                _default_table_view(source_object_type.id),
                _default_table_view(target_object_type.id),
            ],
            relations=[relation],
            actions=[action],
            placements=[_placement(action.id, source_object_type.id)],
        ),
    )

    published_action = payload["object_types"][0]["actions"][0]
    assert published_action["auto_link_enabled"] is True
    assert published_action["auto_link_relation"] == {
        "id": str(relation.id),
        "key": "project_tasks",
        "name": "Проект → Задачи",
    }


def test_publish_snapshot_includes_cross_object_target() -> None:
    source_object_type = _object_type()
    source_object_type.key = "projects"
    source_object_type.name = "Проекты"

    target_object_type = _object_type()
    target_object_type.key = "tasks"
    target_object_type.name = "Задачи"

    action = _action(
        source_object_type.id,
        target_object_type_id=target_object_type.id,
    )

    payload = build_snapshot_payload(
        tenant_id=1,
        catalog_version=4,
        catalog=TenantDraftCatalog(
            object_types=[source_object_type, target_object_type],
            fields=[],
            views=[
                _default_table_view(source_object_type.id),
                _default_table_view(target_object_type.id),
            ],
            relations=[],
            actions=[action],
            placements=[_placement(action.id, source_object_type.id)],
        ),
    )

    published_action = payload["object_types"][0]["actions"][0]
    assert published_action["target_object_type"] == {
        "id": str(target_object_type.id),
        "key": "tasks",
        "name": "Задачи",
    }


def test_validate_publish_rejects_create_record_without_target() -> None:
    object_type = _object_type()
    action = _action(object_type.id)
    action.target_object_type_id = None

    report = validate_tenant_draft_catalog(
        TenantDraftCatalog(
            object_types=[object_type],
            fields=[],
            views=[_default_table_view(object_type.id)],
            relations=[],
            actions=[action],
            placements=[],
        ),
    )

    assert not report.valid
    assert any(
        error.code == "action_missing_target_object_type"
        for error in report.errors
    )


def test_publish_snapshot_excludes_inactive_action() -> None:
    object_type = _object_type()
    inactive_action = _action(object_type.id, is_active=False)

    payload = build_snapshot_payload(
        tenant_id=1,
        catalog_version=1,
        catalog=TenantDraftCatalog(
            object_types=[object_type],
            fields=[],
            views=[_default_table_view(object_type.id)],
            relations=[],
            actions=[inactive_action],
            placements=[],
        ),
    )

    assert payload["object_types"][0]["actions"] == []


def test_publish_snapshot_excludes_inactive_placement() -> None:
    object_type = _object_type()
    action = _action(object_type.id)
    active_placement = _placement(action.id, object_type.id, placement_key="table")
    inactive_placement = _placement(
        action.id,
        object_type.id,
        placement_key="row_menu",
        is_active=False,
    )

    payload = build_snapshot_payload(
        tenant_id=1,
        catalog_version=1,
        catalog=TenantDraftCatalog(
            object_types=[object_type],
            fields=[],
            views=[_default_table_view(object_type.id)],
            relations=[],
            actions=[action],
            placements=[active_placement, inactive_placement],
        ),
    )

    placements = payload["object_types"][0]["actions"][0]["placements"]
    assert len(placements) == 1
    assert placements[0]["placement_key"] == "table"


def test_validate_publish_rejects_unknown_action_type() -> None:
    object_type = _object_type()
    action = _action(object_type.id)
    action.action_type_key = "unknown_type"

    report = validate_tenant_draft_catalog(
        TenantDraftCatalog(
            object_types=[object_type],
            fields=[],
            views=[_default_table_view(object_type.id)],
            relations=[],
            actions=[action],
            placements=[],
        ),
    )

    assert not report.valid
    assert any(issue.code == "action_unknown_type" for issue in report.errors)


def test_validate_publish_rejects_duplicate_placement_key() -> None:
    object_type = _object_type()
    action = _action(object_type.id)
    placement_a = _placement(action.id, object_type.id, placement_key="top_panel")
    placement_b = _placement(action.id, object_type.id, placement_key="top_panel")
    placement_b.id = uuid4()

    report = validate_tenant_draft_catalog(
        TenantDraftCatalog(
            object_types=[object_type],
            fields=[],
            views=[_default_table_view(object_type.id)],
            relations=[],
            actions=[action],
            placements=[placement_a, placement_b],
        ),
    )

    assert not report.valid
    assert any(issue.code == "placement_duplicate_key" for issue in report.errors)


def test_validate_publish_summary_counts_actions_and_placements() -> None:
    object_type = _object_type()
    action = _action(object_type.id)
    placement = _placement(action.id, object_type.id)

    report = validate_tenant_draft_catalog(
        TenantDraftCatalog(
            object_types=[object_type],
            fields=[],
            views=[_default_table_view(object_type.id)],
            relations=[],
            actions=[action],
            placements=[placement],
        ),
    )

    assert report.valid
    assert report.summary.actions == 1
    assert report.summary.placements == 1


def test_get_published_actions_reads_actions_from_snapshot() -> None:
    action_id = str(uuid4())
    placement_id = str(uuid4())
    snapshot = SimpleNamespace(
        payload={
            "object_types": [
                {
                    "key": "tasks",
                    "actions": [
                        {
                            "id": action_id,
                            "key": "create_task",
                            "placements": [
                                {
                                    "id": placement_id,
                                    "placement_key": "top_panel",
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    )

    with patch(
        "app.modules.platform.runtime.catalog.service.repository.get_latest_snapshot",
        return_value=snapshot,
    ):
        actions = get_published_actions(MagicMock(), tenant_id=1, object_type_key="tasks")

    assert len(actions) == 1
    assert actions[0]["key"] == "create_task"
    assert actions[0]["placements"][0]["placement_key"] == "top_panel"


def test_create_action_definition_touches_parent_object_type() -> None:
    from app.modules.platform.action_engine.action_definitions.schemas import (
        ActionDefinitionCreate,
    )
    from app.modules.platform.action_engine.action_definitions.service import (
        create_action_definition,
    )
    from app.modules.platform.action_engine.action_types.registry import (
        ensure_builtin_action_types_registered,
    )

    ensure_builtin_action_types_registered()

    object_type_id = uuid4()
    db = MagicMock()

    with (
        patch(
            "app.modules.platform.action_engine.action_definitions.service._ensure_object_type",
            return_value=None,
        ),
        patch(
            "app.modules.platform.action_engine.action_definitions.service.repository.get_by_key",
            return_value=None,
        ),
        patch(
            "app.modules.platform.action_engine.action_definitions.service.repository.create_action_definition",
            side_effect=lambda _db, entity: entity,
        ),
        patch(
            "app.modules.platform.action_engine.action_definitions.service._to_read",
            side_effect=lambda entity: entity,
        ),
        patch(
            "app.modules.platform.action_engine.action_definitions.service._touch_parent_object_type",
        ) as touch_parent,
    ):
        target_object_type_id = uuid4()
        create_action_definition(
            db,
            1,
            object_type_id,
            ActionDefinitionCreate(
                key="create_task",
                name="Создать задачу",
                action_type_key="create_record",
                target_object_type_id=target_object_type_id,
            ),
        )

    touch_parent.assert_called_once_with(db, 1, object_type_id, None)
