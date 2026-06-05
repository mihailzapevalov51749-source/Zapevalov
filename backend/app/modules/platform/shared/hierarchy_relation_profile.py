"""Hierarchy relation profiles (task_subtask, document_subdocument, …)."""

from __future__ import annotations

from typing import Any

from app.modules.platform.shared.task_subtask_contract import (
    TASK_SUBTASK_RELATION_KEY,
    TASK_SUBTASK_SEMANTIC_PROFILE,
)

HIERARCHY_PROFILE_SUFFIXES = (
    "_subtask",
    "_subdocument",
    "_subordinate",
    "_subfolder",
    "_subcategory",
)


def _normalize_key(value: Any) -> str:
    return str(value or "").strip()


def is_hierarchy_semantic_profile(profile: str) -> bool:
    normalized = _normalize_key(profile)
    if not normalized:
        return False
    if normalized == TASK_SUBTASK_SEMANTIC_PROFILE:
        return True
    return any(normalized.endswith(suffix) for suffix in HIERARCHY_PROFILE_SUFFIXES)


def is_hierarchy_relation_definition(
    relation: dict[str, Any] | None,
    current_object_type_key: str,
) -> bool:
    current_key = _normalize_key(current_object_type_key)
    if not relation or not current_key:
        return False

    settings = relation.get("settings_json")
    if not isinstance(settings, dict):
        settings = {}

    profile = _normalize_key(settings.get("semantic_profile"))
    relation_key = _normalize_key(relation.get("key"))

    marked_hierarchy = (
        settings.get("is_hierarchy") is True
        or is_hierarchy_semantic_profile(profile)
        or relation_key == TASK_SUBTASK_RELATION_KEY
        or is_hierarchy_semantic_profile(relation_key)
    )
    if not marked_hierarchy:
        return False

    source_key = _normalize_key(relation.get("source_object_type_key"))
    target_key = _normalize_key(relation.get("target_object_type_key"))
    return current_key == source_key or current_key == target_key


def is_hierarchy_subtask_parent_relation_definition(
    relation: dict[str, Any] | None,
    current_object_type_key: str,
) -> bool:
    if not is_hierarchy_relation_definition(relation, current_object_type_key):
        return False

    settings = relation.get("settings_json")
    if not isinstance(settings, dict):
        settings = {}

    parent_side = _normalize_key(settings.get("parent_entity_side") or "source")
    child_side = _normalize_key(settings.get("child_entity_side") or "target")
    source_key = _normalize_key(relation.get("source_object_type_key"))
    target_key = _normalize_key(relation.get("target_object_type_key"))
    current_key = _normalize_key(current_object_type_key)

    if parent_side == "source" and child_side == "target":
        return current_key == source_key
    if parent_side == "target" and child_side == "source":
        return current_key == target_key
    return current_key == source_key


def list_hierarchy_subtask_relation_keys(
    relations: list[dict[str, Any]] | None,
    current_object_type_key: str,
) -> list[str]:
    keys: set[str] = set()
    for relation in relations or []:
        if is_hierarchy_subtask_parent_relation_definition(relation, current_object_type_key):
            key = _normalize_key(relation.get("key"))
            if key:
                keys.add(key)
    return sorted(keys)


def resolve_primary_hierarchy_subtask_relation_key(
    relations: list[dict[str, Any]] | None,
    object_type_key: str,
) -> str:
    keys = list_hierarchy_subtask_relation_keys(relations, object_type_key)
    if not keys:
        return ""
    if TASK_SUBTASK_RELATION_KEY in keys:
        return TASK_SUBTASK_RELATION_KEY
    return keys[0]


def resolve_hierarchy_relation_entity_sides(
    settings_json: dict[str, Any] | None,
) -> tuple[str, str]:
    settings = settings_json if isinstance(settings_json, dict) else {}
    parent_side = _normalize_key(settings.get("parent_entity_side") or "source")
    child_side = _normalize_key(settings.get("child_entity_side") or "target")
    if parent_side == "target" and child_side == "source":
        return "target", "source"
    return "source", "target"


def hierarchy_parent_child_from_edge(
    *,
    source_entity_id,
    target_entity_id,
    parent_side: str,
    child_side: str,
) -> tuple[str, str]:
    source_id = _normalize_key(source_entity_id)
    target_id = _normalize_key(target_entity_id)
    if parent_side == "source" and child_side == "target":
        return source_id, target_id
    return target_id, source_id
