"""Hierarchy relation terminology (labels) for universal Object Table UI."""

from __future__ import annotations

from typing import Any, TypedDict


class HierarchyLabelsDict(TypedDict):
    parent: str
    child: str
    children: str
    children_genitive: str
    children_instrumental: str


DEFAULT_HIERARCHY_LABELS: HierarchyLabelsDict = {
    "parent": "Родительская запись",
    "child": "Дочерняя запись",
    "children": "Дочерние записи",
    "children_genitive": "Дочерних записей",
    "children_instrumental": "Дочерними записями",
}

_HIERARCHY_LABEL_KEYS = tuple(DEFAULT_HIERARCHY_LABELS.keys())


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()


def suggest_russian_hierarchy_inflection(child: str, parent: str = "") -> HierarchyLabelsDict:
    """MVP Russian inflection heuristics for hierarchy labels."""
    singular = _normalize_text(child)
    parent_label = _normalize_text(parent)

    if not singular:
        return dict(DEFAULT_HIERARCHY_LABELS)

    lower = singular.lower()
    children = singular
    genitive = singular
    instrumental = singular

    if lower.endswith("ие") and len(singular) > 2:
        stem = singular[:-2]
        children = f"{stem}ия"
        genitive = f"{stem}ий"
        instrumental = f"{stem}иями"
    elif lower.endswith("ия") and len(singular) > 2:
        stem = singular[:-2]
        children = f"{stem}ии"
        genitive = f"{stem}ий"
        instrumental = f"{stem}иями"
    elif lower.endswith("ь"):
        stem = singular[:-1]
        children = f"{stem}и"
        genitive = f"{stem}ей"
        instrumental = f"{stem}ями"
    elif lower.endswith("а"):
        stem = singular[:-1]
        children = f"{stem}и"
        genitive = stem
        instrumental = f"{stem}ами"
    elif lower.endswith("я"):
        stem = singular[:-1]
        children = f"{stem}и"
        genitive = f"{stem}й"
        instrumental = f"{stem}ми"
    elif _looks_like_masculine_consonant(lower):
        children = f"{singular}ы"
        genitive = f"{singular}ов"
        instrumental = f"{singular}ами"

    return {
        "parent": parent_label or DEFAULT_HIERARCHY_LABELS["parent"],
        "child": singular,
        "children": children,
        "children_genitive": genitive,
        "children_instrumental": instrumental,
    }


def _looks_like_masculine_consonant(lower: str) -> bool:
    if not lower:
        return False
    return lower[-1] not in "аеёиоуыэюяь"


def _read_stored_labels(settings: dict[str, Any] | None) -> dict[str, str]:
    if not isinstance(settings, dict):
        return {}

    raw = settings.get("hierarchy_labels")
    if not isinstance(raw, dict):
        return {}

    return {
        key: _normalize_text(raw.get(key))
        for key in _HIERARCHY_LABEL_KEYS
        if _normalize_text(raw.get(key))
    }


def resolve_hierarchy_labels_from_relation(
    relation: dict[str, Any] | None,
    *,
    parent_object_type_name: str = "",
) -> HierarchyLabelsDict:
    del parent_object_type_name

    settings = relation.get("settings_json") if isinstance(relation, dict) else {}
    if not isinstance(settings, dict):
        settings = {}

    stored = _read_stored_labels(settings)
    result = dict(DEFAULT_HIERARCHY_LABELS)
    result.update(stored)
    return result  # type: ignore[return-value]


def sanitize_hierarchy_labels_payload(raw: dict[str, Any] | None) -> dict[str, str]:
    if not isinstance(raw, dict):
        return {}

    return {
        key: _normalize_text(raw.get(key))
        for key in _HIERARCHY_LABEL_KEYS
        if _normalize_text(raw.get(key))
    }


def merge_hierarchy_settings(
    settings: dict[str, Any] | None,
    *,
    is_hierarchy: bool | None = None,
    hierarchy_labels: dict[str, Any] | None = None,
) -> dict[str, Any]:
    merged = dict(settings) if isinstance(settings, dict) else {}

    if is_hierarchy is not None:
        merged["is_hierarchy"] = bool(is_hierarchy)

    if hierarchy_labels is not None:
        sanitized = sanitize_hierarchy_labels_payload(hierarchy_labels)
        if sanitized:
            merged["hierarchy_labels"] = sanitized
        elif "hierarchy_labels" in merged:
            del merged["hierarchy_labels"]

    return merged
