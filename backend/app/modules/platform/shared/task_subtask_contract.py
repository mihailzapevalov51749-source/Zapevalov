"""Canonical task_subtask semantic profile (ADR_TASK_SUBTASK_RELATION_SPEC)."""

from __future__ import annotations

from typing import Any

TASK_SUBTASK_RELATION_KEY = "task_subtask"
TASK_SUBTASK_SEMANTIC_PROFILE = "task_subtask"


def is_task_subtask_relation(
    *,
    relation_key: str,
    settings_json: dict[str, Any] | None = None,
) -> bool:
    """True when relation is the task_subtask WBS profile (not generic self-relation)."""
    normalized_key = str(relation_key or "").strip()
    if normalized_key == TASK_SUBTASK_RELATION_KEY:
        return True

    settings = settings_json if isinstance(settings_json, dict) else {}
    return str(settings.get("semantic_profile") or "").strip() == TASK_SUBTASK_SEMANTIC_PROFILE
