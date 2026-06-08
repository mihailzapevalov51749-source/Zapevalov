"""Runtime Action Resolver over published catalog snapshot."""

from types import SimpleNamespace
from unittest.mock import ANY, MagicMock, patch
from uuid import uuid4

from app.modules.platform.runtime.actions.resolver import resolve_actions_for_placement
from app.modules.platform.runtime.actions import service as actions_service
from app.modules.platform.runtime.actions.router import list_actions_for_placement
from app.modules.platform.runtime.catalog import service as catalog_service


def _action(
    *,
    key="create_task",
    name="Создать задачу",
    is_active=True,
    placements=None,
):
    return {
        "id": str(uuid4()),
        "key": key,
        "name": name,
        "description": None,
        "action_type_key": "create_record",
        "is_active": is_active,
        "version": 1,
        "config_json": {"action_level": True},
        "placements": placements or [],
    }


def _placement(*, placement_key="top_panel", is_active=True, sort_order=10):
    return {
        "id": str(uuid4()),
        "placement_key": placement_key,
        "is_active": is_active,
        "sort_order": sort_order,
        "label_override": None,
        "icon_key": None,
        "config_json": {"placement_level": True},
    }


def test_resolve_returns_matching_record_toolbar_action() -> None:
    actions = [
        _action(
            placements=[_placement(placement_key="record_toolbar")],
        ),
    ]

    resolved = resolve_actions_for_placement(actions, "record_toolbar")

    assert len(resolved) == 1
    assert resolved[0].key == "create_task"
    assert resolved[0].placement_key == "record_toolbar"


def test_resolve_returns_matching_top_panel_action() -> None:
    actions = [
        _action(
            placements=[_placement(placement_key="top_panel")],
        ),
    ]

    resolved = resolve_actions_for_placement(actions, "top_panel")

    assert len(resolved) == 1
    assert resolved[0].key == "create_task"
    assert resolved[0].placement_key == "top_panel"
    assert resolved[0].sort_order == 10
    assert resolved[0].config_json == {
        "action_level": True,
        "placement_level": True,
    }


def test_resolve_includes_auto_link_fields() -> None:
    relation_id = uuid4()
    actions = [
        {
            **_action(placements=[_placement(placement_key="record_toolbar")]),
            "auto_link_enabled": True,
            "auto_link_relation": {
                "id": str(relation_id),
                "key": "project_tasks",
                "name": "Проект → Задачи",
            },
        },
    ]

    resolved = resolve_actions_for_placement(actions, "record_toolbar")

    assert len(resolved) == 1
    assert resolved[0].auto_link_enabled is True
    assert resolved[0].auto_link_relation_id == relation_id
    assert resolved[0].auto_link_relation_key == "project_tasks"


def test_resolve_includes_target_object_type() -> None:
    target_id = uuid4()
    actions = [
        {
            **_action(placements=[_placement(placement_key="top_panel")]),
            "target_object_type": {
                "id": str(target_id),
                "key": "tasks",
                "name": "Задачи",
            },
        },
    ]

    resolved = resolve_actions_for_placement(actions, "top_panel")

    assert len(resolved) == 1
    assert resolved[0].target_object_type_id == target_id
    assert resolved[0].target_object_type_key == "tasks"
    assert resolved[0].target_object_type_name == "Задачи"


def test_resolve_returns_empty_for_other_placement() -> None:
    actions = [
        _action(
            placements=[_placement(placement_key="row_menu")],
        ),
    ]

    resolved = resolve_actions_for_placement(actions, "top_panel")

    assert resolved == []


def test_resolve_sorts_by_sort_order_then_name() -> None:
    actions = [
        _action(
            key="z_action",
            name="Z Action",
            placements=[_placement(placement_key="top_panel", sort_order=20)],
        ),
        _action(
            key="a_action",
            name="A Action",
            placements=[_placement(placement_key="top_panel", sort_order=10)],
        ),
        _action(
            key="b_action",
            name="B Action",
            placements=[_placement(placement_key="top_panel", sort_order=10)],
        ),
    ]

    resolved = resolve_actions_for_placement(actions, "top_panel")

    assert [item.key for item in resolved] == ["a_action", "b_action", "z_action"]


def test_resolve_excludes_inactive_action() -> None:
    actions = [
        _action(
            is_active=False,
            placements=[_placement(placement_key="top_panel")],
        ),
    ]

    assert resolve_actions_for_placement(actions, "top_panel") == []


def test_resolve_excludes_inactive_placement() -> None:
    actions = [
        _action(
            placements=[_placement(placement_key="top_panel", is_active=False)],
        ),
    ]

    assert resolve_actions_for_placement(actions, "top_panel") == []


def test_service_returns_empty_for_unknown_object_type() -> None:
    snapshot = SimpleNamespace(
        payload={
            "object_types": [
                {
                    "key": "tasks",
                    "actions": [],
                },
            ],
        },
    )

    with patch(
        "app.modules.platform.runtime.actions.service.catalog_repository.get_latest_snapshot",
        return_value=snapshot,
    ):
        result = actions_service.get_actions_for_placement(
            MagicMock(),
            tenant_id=1,
            object_type_key="unknown",
            placement_key="top_panel",
        )

    assert result == []


def test_service_returns_empty_when_snapshot_missing() -> None:
    with patch(
        "app.modules.platform.runtime.actions.service.catalog_repository.get_latest_snapshot",
        return_value=None,
    ):
        result = actions_service.get_actions_for_placement(
            MagicMock(),
            tenant_id=1,
            object_type_key="tasks",
            placement_key="top_panel",
        )

    assert result == []


def test_catalog_service_delegates_to_actions_service() -> None:
    expected = []

    with patch(
        "app.modules.platform.runtime.catalog.service.resolve_actions_for_placement",
        return_value=expected,
    ) as delegated:
        result = catalog_service.get_actions_for_placement(
            MagicMock(),
            1,
            "tasks",
            "top_panel",
        )

    delegated.assert_called_once_with(ANY, 1, "tasks", "top_panel")
    assert result == expected


def test_runtime_actions_endpoint_returns_resolved_actions() -> None:
    from app.modules.platform.runtime.actions.schemas import PublishedRuntimeAction

    action_id = uuid4()

    with patch(
        "app.modules.platform.runtime.actions.router.service.get_actions_for_placement",
        return_value=[
            PublishedRuntimeAction(
                id=action_id,
                key="create_task",
                name="Создать задачу",
                action_type_key="create_record",
                placement_key="top_panel",
                sort_order=10,
            ),
        ],
    ):
        response = list_actions_for_placement(
            tenant_id=1,
            object_type_key="tasks",
            placement_key="top_panel",
            db=MagicMock(),
            _tenant=1,
        )

    assert len(response) == 1
    assert response[0].key == "create_task"
    assert response[0].placement_key == "top_panel"
