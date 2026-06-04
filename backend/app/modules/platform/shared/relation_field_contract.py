"""Relation field contract (ADR-Object-Relation-Field) — backend / publish / runtime."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from app.modules.platform.shared.enums import FieldType

RELATION_FIELD_ROLES = frozenset({"source", "target"})
RELATION_FIELD_CARDINALITIES = frozenset({"one", "many"})

UNKNOWN_RELATION_DEFINITION = "Unknown relation definition"
INACTIVE_RELATION_DEFINITION = "Relation definition is not active"
MISSING_RELATION_DEFINITION_PUBLISH_TEMPLATE = (
    "Relation field references missing relation definition: {relation_key}"
)


@dataclass(frozen=True)
class RelationFieldPublishIssue:
    code: str
    path: str
    message: str


def is_relation_field_type(field_type: str | FieldType | None) -> bool:
    if field_type is None:
        return False
    if isinstance(field_type, FieldType):
        return field_type == FieldType.RELATION
    return str(field_type).strip().lower() == FieldType.RELATION.value


def _require_non_empty_string(settings: dict[str, Any], key: str) -> str:
    raw = settings.get(key)
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError(f"settings_json.{key} обязателен для relation field")
    return raw.strip()


def validate_relation_field_settings(settings_json: dict[str, Any] | None) -> dict[str, Any]:
    """Validate relation field settings shape (no DB)."""
    if not isinstance(settings_json, dict):
        raise ValueError("settings_json для relation field должен быть объектом")

    relation_key = _require_non_empty_string(settings_json, "relation_key")
    role = _require_non_empty_string(settings_json, "role")
    cardinality = _require_non_empty_string(settings_json, "cardinality")

    if role not in RELATION_FIELD_ROLES:
        raise ValueError(
            f"settings_json.role должен быть одним из: {', '.join(sorted(RELATION_FIELD_ROLES))}",
        )

    if cardinality not in RELATION_FIELD_CARDINALITIES:
        raise ValueError(
            "settings_json.cardinality должен быть одним из: "
            f"{', '.join(sorted(RELATION_FIELD_CARDINALITIES))}",
        )

    return {
        "relation_key": relation_key,
        "role": role,
        "cardinality": cardinality,
    }


def validate_relation_field_with_definition(
    *,
    settings_json: dict[str, Any],
    object_type_id: UUID,
    relation: Any | None,
) -> None:
    """Bind relation field to an active relation definition and object type role."""
    normalized = validate_relation_field_settings(settings_json)

    if relation is None:
        raise ValueError(UNKNOWN_RELATION_DEFINITION)

    if getattr(relation, "deleted_at", None) is not None:
        raise ValueError(UNKNOWN_RELATION_DEFINITION)

    if not getattr(relation, "is_active", True):
        raise ValueError(INACTIVE_RELATION_DEFINITION)

    relation_key = normalized["relation_key"]
    if getattr(relation, "key", None) != relation_key:
        raise ValueError(UNKNOWN_RELATION_DEFINITION)

    role = normalized["role"]
    source_id = getattr(relation, "source_object_type_id", None)
    target_id = getattr(relation, "target_object_type_id", None)

    if role == "source" and source_id != object_type_id:
        raise ValueError(
            "settings_json.role=source не соответствует source object type relation definition",
        )

    if role == "target" and target_id != object_type_id:
        raise ValueError(
            "settings_json.role=target не соответствует target object type relation definition",
        )


def validate_relation_field_for_publish(
    *,
    field_key: str,
    settings_json: dict[str, Any] | None,
    object_type_id: UUID,
    relations_by_key: dict[str, Any],
    default_value_json: Any | None = None,
) -> list[RelationFieldPublishIssue]:
    issues: list[RelationFieldPublishIssue] = []
    base_path = f"fields[{field_key}]"

    if default_value_json is not None:
        issues.append(
            RelationFieldPublishIssue(
                code="relation_field_default_value_forbidden",
                path=f"{base_path}.default_value_json",
                message="relation field не использует default_value_json",
            ),
        )

    try:
        normalized = validate_relation_field_settings(settings_json)
    except ValueError as exc:
        issues.append(
            RelationFieldPublishIssue(
                code="relation_field_invalid_settings",
                path=f"{base_path}.settings_json",
                message=str(exc),
            ),
        )
        return issues

    relation = relations_by_key.get(normalized["relation_key"])
    if relation is None:
        issues.append(
            RelationFieldPublishIssue(
                code="relation_field_missing_definition",
                path=f"{base_path}.settings_json.relation_key",
                message=MISSING_RELATION_DEFINITION_PUBLISH_TEMPLATE.format(
                    relation_key=normalized["relation_key"],
                ),
            ),
        )
        return issues

    try:
        validate_relation_field_with_definition(
            settings_json=normalized,
            object_type_id=object_type_id,
            relation=relation,
        )
    except ValueError as exc:
        issues.append(
            RelationFieldPublishIssue(
                code="relation_field_invalid_binding",
                path=f"{base_path}.settings_json",
                message=str(exc),
            ),
        )

    return issues


def validate_relation_field_type_payload(
    *,
    default_value_json: Any | None,
    settings_json: dict[str, Any],
) -> None:
    """FieldDefinition create/update payload rules for relation type."""
    if default_value_json is not None:
        raise ValueError("default_value_json для relation field должен быть null")

    validate_relation_field_settings(settings_json)
