"""Tests for hierarchy relation terminology."""

from uuid import uuid4

from app.modules.platform.runtime.entities.schemas import EntityDeletePreview, HierarchyLabels
from app.modules.platform.shared.hierarchy_labels import (
    DEFAULT_HIERARCHY_LABELS,
    merge_hierarchy_settings,
    resolve_hierarchy_labels_from_relation,
    sanitize_hierarchy_labels_payload,
    suggest_russian_hierarchy_inflection,
)


def test_suggest_russian_inflection_feminine_a() -> None:
    result = suggest_russian_hierarchy_inflection("Подзадача", "Задача")
    assert result["child"] == "Подзадача"
    assert result["children"] == "Подзадачи"
    assert result["children_genitive"] == "Подзадач"
    assert result["children_instrumental"] == "Подзадачами"
    assert result["parent"] == "Задача"


def test_suggest_russian_inflection_feminine_ia() -> None:
    result = suggest_russian_hierarchy_inflection("Компания")
    assert result["children"] == "Компании"
    assert result["children_genitive"] == "Компаний"
    assert result["children_instrumental"] == "Компаниями"


def test_suggest_russian_inflection_neuter_ie() -> None:
    result = suggest_russian_hierarchy_inflection("Подразделение")
    assert result["children"] == "Подразделения"
    assert result["children_genitive"] == "Подразделений"
    assert result["children_instrumental"] == "Подразделениями"


def test_suggest_russian_inflection_masculine_consonant() -> None:
    result = suggest_russian_hierarchy_inflection("Документ")
    assert result["children"] == "Документы"
    assert result["children_genitive"] == "Документов"
    assert result["children_instrumental"] == "Документами"


def test_suggest_russian_inflection_soft_sign() -> None:
    result = suggest_russian_hierarchy_inflection("Связь")
    assert result["children"] == "Связи"
    assert result["children_genitive"] == "Связей"
    assert result["children_instrumental"] == "Связями"


def test_relation_definition_stores_hierarchy_labels() -> None:
    relation = {
        "name": "Подзадача",
        "settings_json": {
            "is_hierarchy": True,
            "hierarchy_labels": {
                "parent": "Задача",
                "child": "Подзадача",
                "children": "Подзадачи",
                "children_genitive": "Подзадач",
                "children_instrumental": "Подзадачами",
            },
        },
    }

    labels = resolve_hierarchy_labels_from_relation(relation)
    assert labels["child"] == "Подзадача"
    assert labels["children_genitive"] == "Подзадач"


def test_fallback_does_not_use_task_subtask_wording() -> None:
    relation = {
        "key": "task_subtask",
        "name": "Подзадача",
        "settings_json": {"semantic_profile": "task_subtask"},
    }

    labels = resolve_hierarchy_labels_from_relation(relation)
    assert labels == DEFAULT_HIERARCHY_LABELS
    assert "Подзадача" not in labels.values()
    assert "Подзадачи" not in labels.values()


def test_merge_hierarchy_settings_preserves_other_keys() -> None:
    merged = merge_hierarchy_settings(
        {"semantic_profile": "task_subtask"},
        is_hierarchy=True,
        hierarchy_labels={"child": "Подзадача", "children": "Подзадачи"},
    )

    assert merged["semantic_profile"] == "task_subtask"
    assert merged["is_hierarchy"] is True
    assert merged["hierarchy_labels"]["child"] == "Подзадача"


def test_delete_preview_returns_hierarchy_labels() -> None:
    preview = EntityDeletePreview(
        entity_id=uuid4(),
        hierarchy_labels=HierarchyLabels(
            child="Подзадача",
            children="Подзадачи",
            children_genitive="Подзадач",
        ),
    )

    assert preview.hierarchy_labels.child == "Подзадача"
    assert preview.hierarchy_labels.children_genitive == "Подзадач"


def test_sanitize_hierarchy_labels_payload() -> None:
    sanitized = sanitize_hierarchy_labels_payload(
        {
            "parent": " Задача ",
            "child": "",
            "children": "Подзадачи",
        }
    )
    assert sanitized == {"parent": "Задача", "children": "Подзадачи"}
