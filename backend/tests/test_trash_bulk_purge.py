"""Batch purge planner and executor for designer trash."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.modules.platform.designer.trash.bulk_purge import (
    BulkPurgePlan,
    _build_success_message,
    _deduplicate_blocked,
    _dependency_covered_by_plan,
    _is_page_internal_dependency,
    build_bulk_purge_plan,
    check_bulk_purge_blocked,
    execute_planned_bulk_purge,
    normalize_trash_items,
    trash_ref_key,
)
from app.modules.platform.designer.trash.schemas import TrashBulkPurgeBlockedItem
from app.modules.platform.designer.trash.schemas import (
    TrashBulkPurgeItemSummary,
    TrashBulkPurgeResponse,
    TrashDependencyRead,
    TrashItemRef,
)


def test_normalize_trash_items_removes_duplicates() -> None:
    items = [
        TrashItemRef(kind="object_view", id="10"),
        TrashItemRef(kind="object_view", id="10"),
        TrashItemRef(kind="object_relation", id="20"),
    ]
    normalized = normalize_trash_items(items)
    assert len(normalized) == 2
    assert normalized[0].id == "10"


def test_build_bulk_purge_plan_object_with_selected_dependent_views() -> None:
    object_type_id = uuid4()
    view_id = uuid4()
    relation_id = uuid4()
    navigation_id = 15

    object_summary = TrashBulkPurgeItemSummary(
        kind="object_type",
        id=str(object_type_id),
        label="Проект",
    )
    view_summary = TrashBulkPurgeItemSummary(
        kind="object_view",
        id=str(view_id),
        label="Таблица",
    )
    relation_summary = TrashBulkPurgeItemSummary(
        kind="object_relation",
        id=str(relation_id),
        label="Связь",
    )
    navigation_summary = TrashBulkPurgeItemSummary(
        kind="navigation",
        id=str(navigation_id),
        label="Навигация",
    )

    object_entity = SimpleNamespace(id=object_type_id)
    view_entity = SimpleNamespace(object_type_id=object_type_id)
    relation_entity = SimpleNamespace(
        source_object_type_id=object_type_id,
        target_object_type_id=uuid4(),
    )
    navigation_entity = SimpleNamespace(object_type_id=object_type_id, parent_id=None)

    def fake_summary(_db, *, tenant_id, ref, require_deleted):
        mapping = {
            trash_ref_key("object_type", str(object_type_id)): (object_summary, object_entity),
            trash_ref_key("object_view", str(view_id)): (view_summary, view_entity),
            trash_ref_key("object_relation", str(relation_id)): (relation_summary, relation_entity),
            trash_ref_key("navigation", str(navigation_id)): (navigation_summary, navigation_entity),
        }
        return mapping[trash_ref_key(ref.kind, ref.id)]

    with patch(
        "app.modules.platform.designer.trash.bulk_purge._summary_from_ref",
        side_effect=fake_summary,
    ):
        plan = build_bulk_purge_plan(
            MagicMock(),
            tenant_id=1,
            items=[
                TrashItemRef(kind="object_type", id=str(object_type_id)),
                TrashItemRef(kind="object_view", id=str(view_id)),
                TrashItemRef(kind="object_relation", id=str(relation_id)),
                TrashItemRef(kind="navigation", id=str(navigation_id)),
            ],
        )

    assert [item.kind for item in plan.to_purge] == ["object_type"]
    assert len(plan.skipped_as_dependent) == 3
    assert {item.kind for item in plan.skipped_as_dependent} == {
        "object_view",
        "object_relation",
        "navigation",
    }


def test_build_bulk_purge_plan_workspace_with_selected_tabs() -> None:
    workspace_summary = TrashBulkPurgeItemSummary(kind="workspace", id="7", label="CRM")
    tab_summary = TrashBulkPurgeItemSummary(kind="workspace_tab", id="71", label="Вкладка")
    workspace_entity = SimpleNamespace(id=7)
    tab_entity = SimpleNamespace(workspace_id=7)

    def fake_summary(_db, *, tenant_id, ref, require_deleted):
        if ref.kind == "workspace":
            return workspace_summary, workspace_entity
        return tab_summary, tab_entity

    with patch(
        "app.modules.platform.designer.trash.bulk_purge._summary_from_ref",
        side_effect=fake_summary,
    ):
        plan = build_bulk_purge_plan(
            MagicMock(),
            tenant_id=1,
            items=[
                TrashItemRef(kind="workspace", id="7"),
                TrashItemRef(kind="workspace_tab", id="71"),
            ],
        )

    assert [item.kind for item in plan.to_purge] == ["workspace"]
    assert plan.skipped_as_dependent == [tab_summary]


def test_build_bulk_purge_plan_navigation_parent_with_selected_children() -> None:
    parent_summary = TrashBulkPurgeItemSummary(kind="navigation", id="5", label="Раздел")
    child_summary = TrashBulkPurgeItemSummary(kind="navigation", id="6", label="Пункт")
    parent_entity = SimpleNamespace(parent_id=None)
    child_entity = SimpleNamespace(parent_id=5, object_type_id=None)

    def fake_summary(_db, *, tenant_id, ref, require_deleted):
        if ref.id == "5":
            return parent_summary, parent_entity
        return child_summary, child_entity

    with patch(
        "app.modules.platform.designer.trash.bulk_purge._summary_from_ref",
        side_effect=fake_summary,
    ):
        plan = build_bulk_purge_plan(
            MagicMock(),
            tenant_id=1,
            items=[
                TrashItemRef(kind="navigation", id="5"),
                TrashItemRef(kind="navigation", id="6"),
            ],
        )

    assert [item.id for item in plan.to_purge] == ["5"]
    assert plan.skipped_as_dependent == [child_summary]


def test_page_section_does_not_block_page_purge() -> None:
    plan = BulkPurgePlan(
        to_purge=[TrashBulkPurgeItemSummary(kind="page", id="12", label="Страница")],
    )
    selection = [TrashItemRef(kind="page", id="12")]

    with patch(
        "app.modules.platform.designer.trash.bulk_purge.dependency_resolution_service.get_dependencies",
        return_value=[
            TrashDependencyRead(
                label="Секции страницы (2)",
                kind="page_section",
                entity_kind=None,
                entity_id=None,
            ),
            TrashDependencyRead(
                label="Секция (3 блоков)",
                kind="page_section",
                entity_kind="page_section",
                entity_id="101",
            ),
        ],
    ):
        blocked = check_bulk_purge_blocked(
            MagicMock(),
            tenant_id=1,
            plan=plan,
            selection=selection,
        )

    assert blocked == []


def test_page_with_page_sections_purge_succeeds() -> None:
    db = MagicMock()
    plan = BulkPurgePlan(
        to_purge=[TrashBulkPurgeItemSummary(kind="page", id="12", label="Отдел кадров")],
    )

    with patch(
        "app.modules.platform.designer.trash.bulk_purge.build_bulk_purge_plan",
        return_value=plan,
    ), patch(
        "app.modules.platform.designer.trash.bulk_purge.check_bulk_purge_blocked",
        return_value=[],
    ), patch(
        "app.modules.platform.designer.trash.bulk_purge._purge_page_with_sections",
    ) as purge_page:
        response = execute_planned_bulk_purge(
            db,
            tenant_id=1,
            items=[TrashItemRef(kind="page", id="12")],
        )

    purge_page.assert_called_once()
    assert response.success is True
    assert response.deleted_count == 1
    db.commit.assert_called_once()


def test_bulk_purge_two_pages_with_sections_not_blocked() -> None:
    plan = BulkPurgePlan(
        to_purge=[
            TrashBulkPurgeItemSummary(kind="page", id="12", label="Отдел кадров"),
            TrashBulkPurgeItemSummary(kind="page", id="13", label="О компании"),
        ],
    )
    selection = [
        TrashItemRef(kind="page", id="12"),
        TrashItemRef(kind="page", id="13"),
    ]

    def fake_dependencies(_db, *, tenant_id, kind, entity_id):
        if entity_id == "12":
            return [
                TrashDependencyRead(
                    label="Секции страницы (1)",
                    kind="page_section",
                    entity_kind=None,
                    entity_id=None,
                ),
            ]
        return [
            TrashDependencyRead(
                label="Секции страницы (1)",
                kind="page_section",
                entity_kind=None,
                entity_id=None,
            ),
        ]

    with patch(
        "app.modules.platform.designer.trash.bulk_purge.dependency_resolution_service.get_dependencies",
        side_effect=fake_dependencies,
    ):
        blocked = check_bulk_purge_blocked(
            MagicMock(),
            tenant_id=1,
            plan=plan,
            selection=selection,
        )

    assert blocked == []


def test_workspace_home_blocks_page_purge() -> None:
    plan = BulkPurgePlan(
        to_purge=[TrashBulkPurgeItemSummary(kind="page", id="12", label="Страница")],
    )
    selection = [TrashItemRef(kind="page", id="12")]

    with patch(
        "app.modules.platform.designer.trash.bulk_purge.dependency_resolution_service.get_dependencies",
        return_value=[
            TrashDependencyRead(
                label='Рабочее пространство "CRM" — домашняя страница',
                kind="workspace",
                entity_kind="workspace",
                entity_id="7",
            ),
        ],
    ):
        blocked = check_bulk_purge_blocked(
            MagicMock(),
            tenant_id=1,
            plan=plan,
            selection=selection,
        )

    assert len(blocked) == 1
    assert "домашняя страница" in blocked[0].reason


def test_page_and_navigation_in_plan_not_blocked() -> None:
    plan = BulkPurgePlan(
        to_purge=[
            TrashBulkPurgeItemSummary(kind="page", id="12", label="Страница"),
            TrashBulkPurgeItemSummary(kind="navigation", id="55", label="Nav"),
        ],
    )
    selection = [
        TrashItemRef(kind="page", id="12"),
        TrashItemRef(kind="navigation", id="55"),
    ]

    with patch(
        "app.modules.platform.designer.trash.bulk_purge.dependency_resolution_service.get_dependencies",
        return_value=[
            TrashDependencyRead(
                label='Навигация "Документы"',
                kind="navigation",
                entity_kind="navigation",
                entity_id="55",
            ),
        ],
    ):
        blocked = check_bulk_purge_blocked(
            MagicMock(),
            tenant_id=1,
            plan=plan,
            selection=selection,
        )

    assert blocked == []


def test_page_and_workspace_tab_in_plan_not_blocked() -> None:
    plan = BulkPurgePlan(
        to_purge=[
            TrashBulkPurgeItemSummary(kind="page", id="12", label="Страница"),
            TrashBulkPurgeItemSummary(kind="workspace_tab", id="71", label="Tab"),
        ],
    )
    selection = [
        TrashItemRef(kind="page", id="12"),
        TrashItemRef(kind="workspace_tab", id="71"),
    ]

    with patch(
        "app.modules.platform.designer.trash.bulk_purge.dependency_resolution_service.get_dependencies",
        return_value=[
            TrashDependencyRead(
                label='Вкладка "Главная"',
                kind="workspace_tab",
                entity_kind="workspace_tab",
                entity_id="71",
            ),
        ],
    ):
        blocked = check_bulk_purge_blocked(
            MagicMock(),
            tenant_id=1,
            plan=plan,
            selection=selection,
        )

    assert blocked == []


def test_external_navigation_still_blocks_page_purge() -> None:
    plan = BulkPurgePlan(
        to_purge=[TrashBulkPurgeItemSummary(kind="page", id="12", label="Страница")],
    )
    selection = [TrashItemRef(kind="page", id="12")]

    with patch(
        "app.modules.platform.designer.trash.bulk_purge.dependency_resolution_service.get_dependencies",
        return_value=[
            TrashDependencyRead(
                label='Навигация "Главная"',
                kind="navigation",
                entity_kind="navigation",
                entity_id="55",
            ),
        ],
    ):
        blocked = check_bulk_purge_blocked(
            MagicMock(),
            tenant_id=1,
            plan=plan,
            selection=selection,
        )

    assert len(blocked) == 1
    assert blocked[0].reason == 'Навигация "Главная"'


def test_deduplicate_blocked_items() -> None:
    blocked = [
        TrashBulkPurgeBlockedItem(
            kind="page",
            id="12",
            label="Отдел кадров",
            reason="Секции страницы (1)",
        ),
        TrashBulkPurgeBlockedItem(
            kind="page",
            id="12",
            label="Отдел кадров",
            reason="Секции страницы (1)",
        ),
    ]
    assert len(_deduplicate_blocked(blocked)) == 1


def test_is_page_internal_dependency() -> None:
    assert _is_page_internal_dependency(
        parent_kind="page",
        dependency_kind="page_section",
        dependency_entity_kind=None,
    )
    assert _is_page_internal_dependency(
        parent_kind="page",
        dependency_kind="page_section",
        dependency_entity_kind="page_section",
    )
    assert not _is_page_internal_dependency(
        parent_kind="page",
        dependency_kind="navigation",
        dependency_entity_kind="navigation",
    )


def test_execute_planned_bulk_purge_rollback_on_blocked_dependency() -> None:
    db = MagicMock()
    plan = BulkPurgePlan(
        to_purge=[TrashBulkPurgeItemSummary(kind="page", id="12", label="Страница")],
    )

    with patch(
        "app.modules.platform.designer.trash.bulk_purge.build_bulk_purge_plan",
        return_value=plan,
    ), patch(
        "app.modules.platform.designer.trash.bulk_purge.check_bulk_purge_blocked",
        return_value=[],
    ), patch(
        "app.modules.platform.designer.trash.bulk_purge.execute_bulk_purge_plan",
        side_effect=RuntimeError("boom"),
    ):
        from fastapi import HTTPException

        with pytest.raises(HTTPException):
            execute_planned_bulk_purge(
                db,
                tenant_id=1,
                items=[TrashItemRef(kind="page", id="12")],
            )
        db.rollback.assert_called_once()
        db.commit.assert_not_called()


def test_execute_planned_bulk_purge_summary_response() -> None:
    db = MagicMock()
    object_type_id = str(uuid4())
    plan = BulkPurgePlan(
        to_purge=[
            TrashBulkPurgeItemSummary(kind="object_type", id=object_type_id, label="Проект"),
        ],
        skipped_as_dependent=[
            TrashBulkPurgeItemSummary(kind="object_view", id=str(uuid4()), label="Таблица"),
        ],
    )

    with patch(
        "app.modules.platform.designer.trash.bulk_purge.build_bulk_purge_plan",
        return_value=plan,
    ), patch(
        "app.modules.platform.designer.trash.bulk_purge.check_bulk_purge_blocked",
        return_value=[],
    ), patch(
        "app.modules.platform.designer.trash.bulk_purge.execute_bulk_purge_plan",
        return_value=None,
    ):
        response = execute_planned_bulk_purge(
            db,
            tenant_id=1,
            items=[TrashItemRef(kind="object_type", id=object_type_id)],
        )

    assert isinstance(response, TrashBulkPurgeResponse)
    assert response.success is True
    assert response.deleted_count == 2
    assert "зависимост" in response.message
    db.commit.assert_called_once()


def test_dependency_covered_when_workspace_tab_in_selection() -> None:
    selection = {trash_ref_key("workspace_tab", "71")}
    assert _dependency_covered_by_plan(
        dependency_kind="workspace_tab",
        dependency_entity_kind="workspace_tab",
        dependency_entity_id="71",
        selection_keys=selection,
        purge_keys=set(),
        skipped_keys=set(),
    )


def test_dependency_covered_page_section_for_page_parent() -> None:
    assert _dependency_covered_by_plan(
        parent_kind="page",
        dependency_kind="page_section",
        dependency_entity_kind=None,
        dependency_entity_id=None,
        selection_keys=set(),
        purge_keys=set(),
        skipped_keys=set(),
    )


def test_build_success_message_for_multiple_views() -> None:
    plan = BulkPurgePlan(
        to_purge=[
            TrashBulkPurgeItemSummary(kind="object_view", id="1", label="A"),
            TrashBulkPurgeItemSummary(kind="object_view", id="2", label="B"),
        ],
    )
    message = _build_success_message(plan, deleted_count=2)
    assert message == "Удалено 2 элементов."
