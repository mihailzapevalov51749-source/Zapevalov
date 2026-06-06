from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.modules.platform.shared.enums import FieldType

FILTER_OP_EQ = "eq"
FILTER_OP_NEQ = "neq"
FILTER_OP_CONTAINS = "contains"
FILTER_OP_NOT_CONTAINS = "not_contains"
FILTER_OP_STARTS_WITH = "starts_with"
FILTER_OP_ENDS_WITH = "ends_with"
FILTER_OP_GT = "gt"
FILTER_OP_GTE = "gte"
FILTER_OP_LT = "lt"
FILTER_OP_LTE = "lte"
FILTER_OP_BEFORE = "before"
FILTER_OP_AFTER = "after"
FILTER_OP_IN = "in"
FILTER_OP_NOT_IN = "not_in"
FILTER_OP_IS_EMPTY = "is_empty"
FILTER_OP_IS_NOT_EMPTY = "is_not_empty"

VALUE_LESS_OPERATORS = frozenset(
    {
        FILTER_OP_IS_EMPTY,
        FILTER_OP_IS_NOT_EMPTY,
    },
)

TEXT_OPERATORS = frozenset(
    {
        FILTER_OP_EQ,
        FILTER_OP_NEQ,
        FILTER_OP_CONTAINS,
        FILTER_OP_NOT_CONTAINS,
        FILTER_OP_STARTS_WITH,
        FILTER_OP_ENDS_WITH,
        FILTER_OP_IS_EMPTY,
        FILTER_OP_IS_NOT_EMPTY,
    },
)

NUMBER_OPERATORS = frozenset(
    {
        FILTER_OP_EQ,
        FILTER_OP_NEQ,
        FILTER_OP_GT,
        FILTER_OP_GTE,
        FILTER_OP_LT,
        FILTER_OP_LTE,
        FILTER_OP_IS_EMPTY,
        FILTER_OP_IS_NOT_EMPTY,
    },
)

DATE_OPERATORS = frozenset(
    {
        FILTER_OP_EQ,
        FILTER_OP_BEFORE,
        FILTER_OP_AFTER,
        FILTER_OP_IS_EMPTY,
        FILTER_OP_IS_NOT_EMPTY,
    },
)

USER_OPERATORS = frozenset(
    {
        FILTER_OP_EQ,
        FILTER_OP_NEQ,
        FILTER_OP_IS_EMPTY,
        FILTER_OP_IS_NOT_EMPTY,
    },
)

CHOICE_OPERATORS = frozenset(
    {
        FILTER_OP_EQ,
        FILTER_OP_NEQ,
        FILTER_OP_IN,
        FILTER_OP_NOT_IN,
        FILTER_OP_IS_EMPTY,
        FILTER_OP_IS_NOT_EMPTY,
    },
)

BOOLEAN_OPERATORS = frozenset({FILTER_OP_EQ, FILTER_OP_NEQ})

RELATION_OPERATORS = frozenset(
    {
        FILTER_OP_EQ,
        FILTER_OP_NEQ,
        FILTER_OP_IS_EMPTY,
        FILTER_OP_IS_NOT_EMPTY,
    },
)

CHOICE_LIKE_FIELD_TYPES = frozenset(
    {
        FieldType.CHOICE.value,
        FieldType.MULTI_CHOICE.value,
        "status",
        "select",
        "option",
    },
)


@dataclass(frozen=True)
class ParsedFilterCondition:
    field: str
    op: str
    value: Any = None


def normalize_catalog_field_type(field_type: str | None) -> str:
    normalized = str(field_type or FieldType.TEXT.value).strip().lower()

    if normalized in CHOICE_LIKE_FIELD_TYPES:
        if normalized == FieldType.MULTI_CHOICE.value:
            return FieldType.MULTI_CHOICE.value
        return FieldType.CHOICE.value

    if normalized == FieldType.TEXTAREA.value:
        return FieldType.TEXT.value

    if normalized == FieldType.LINK.value:
        return FieldType.TEXT.value

    if normalized in {field.value for field in FieldType}:
        return normalized

    return FieldType.TEXT.value


def allowed_operators_for_field_type(field_type: str | None) -> frozenset[str]:
    normalized = normalize_catalog_field_type(field_type)

    if normalized == FieldType.NUMBER.value:
        return NUMBER_OPERATORS
    if normalized in {FieldType.DATE.value, FieldType.DATETIME.value}:
        return DATE_OPERATORS
    if normalized == FieldType.USER.value:
        return USER_OPERATORS
    if normalized in {FieldType.CHOICE.value, FieldType.MULTI_CHOICE.value}:
        return CHOICE_OPERATORS
    if normalized == FieldType.BOOLEAN.value:
        return BOOLEAN_OPERATORS
    if normalized == FieldType.RELATION.value:
        return RELATION_OPERATORS

    return TEXT_OPERATORS


def operator_requires_value(operator: str) -> bool:
    return operator not in VALUE_LESS_OPERATORS


def normalize_filter_operator(operator: str | None) -> str:
    normalized = str(operator or FILTER_OP_EQ).strip().lower()

    aliases = {
        "equals": FILTER_OP_EQ,
        "not_equals": FILTER_OP_NEQ,
        "greater": FILTER_OP_GT,
        "less": FILTER_OP_LT,
        "empty": FILTER_OP_IS_EMPTY,
        "not_empty": FILTER_OP_IS_NOT_EMPTY,
    }

    return aliases.get(normalized, normalized)
