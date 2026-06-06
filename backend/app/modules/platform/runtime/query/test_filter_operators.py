import json

import pytest

from app.modules.platform.runtime.query.filter_operators import (
    FILTER_OP_CONTAINS,
    FILTER_OP_EQ,
    FILTER_OP_GT,
    FILTER_OP_IS_EMPTY,
    FILTER_OP_IS_NOT_EMPTY,
    FILTER_OP_NEQ,
    allowed_operators_for_field_type,
)
from app.modules.platform.runtime.query.validators import (
    coerce_filter_conditions,
    parse_filter_conditions,
    validate_filter_conditions,
)
from app.modules.platform.shared.enums import FieldType


PROJECT_PEER_ID = "11111111-1111-4111-8111-111111111111"


def _field_map():
    return {
        "title": {"key": "title", "field_type": FieldType.TEXT.value},
        "amount": {"key": "amount", "field_type": FieldType.NUMBER.value},
        "status": {"key": "status", "field_type": "status"},
        "assignee": {"key": "assignee", "field_type": FieldType.USER.value},
        "starts_at": {"key": "starts_at", "field_type": FieldType.DATE.value},
        "active": {"key": "active", "field_type": FieldType.BOOLEAN.value},
        "project": {
            "key": "project",
            "field_type": FieldType.RELATION.value,
            "settings_json": {
                "relation_key": "task_project",
                "role": "source",
                "cardinality": "one",
            },
        },
    }


def test_parse_filter_conditions_from_json_array():
    payload = json.dumps(
        [
            {"field": "title", "op": "contains", "value": "задача"},
            {"field": "amount", "op": "gt", "value": 100},
            {"field": "status", "op": "is_empty"},
        ],
    )

    conditions = parse_filter_conditions({"filters": payload})

    assert len(conditions) == 3
    assert conditions[0].field == "title"
    assert conditions[0].op == FILTER_OP_CONTAINS
    assert conditions[1].op == FILTER_OP_GT
    assert conditions[2].op == FILTER_OP_IS_EMPTY


def test_parse_filter_conditions_keeps_legacy_eq_params():
    conditions = parse_filter_conditions({"filter.title": "demo"})

    assert len(conditions) == 1
    assert conditions[0].field == "title"
    assert conditions[0].op == FILTER_OP_EQ
    assert conditions[0].value == "demo"


def test_validate_filter_conditions_rejects_unknown_operator_for_number():
    conditions = parse_filter_conditions(
        {
            "filters": json.dumps(
                [{"field": "amount", "op": "contains", "value": "10"}],
            ),
        },
    )

    with pytest.raises(ValueError, match="не поддерживается"):
        validate_filter_conditions(conditions, _field_map())


def test_validate_filter_conditions_requires_value_for_eq():
    conditions = parse_filter_conditions(
        {
            "filters": json.dumps([{"field": "title", "op": "eq"}]),
        },
    )

    with pytest.raises(ValueError, match="требует value"):
        validate_filter_conditions(conditions, _field_map())


def test_coerce_filter_conditions_parses_user_and_boolean_values():
    conditions = parse_filter_conditions(
        {
            "filters": json.dumps(
                [
                    {"field": "assignee", "op": "eq", "value": "12"},
                    {"field": "active", "op": "eq", "value": "true"},
                    {"field": "status", "op": "not_in", "value": ["done", "closed"]},
                ],
            ),
        },
    )

    validate_filter_conditions(conditions, _field_map())
    coerced = coerce_filter_conditions(conditions, _field_map())

    assert coerced[0].value == 12
    assert coerced[1].value is True
    assert coerced[2].value == ["done", "closed"]


def test_allowed_empty_operators_do_not_require_value():
    conditions = parse_filter_conditions(
        {
            "filters": json.dumps(
                [
                    {"field": "title", "op": FILTER_OP_IS_EMPTY},
                    {"field": "title", "op": FILTER_OP_IS_NOT_EMPTY},
                ],
            ),
        },
    )

    validate_filter_conditions(conditions, _field_map())
    coerced = coerce_filter_conditions(conditions, _field_map())

    assert coerced[0].value is None
    assert coerced[1].value is None


def test_relation_field_allows_mvp_operators_only():
    allowed = allowed_operators_for_field_type(FieldType.RELATION.value)

    assert allowed == {
        FILTER_OP_EQ,
        FILTER_OP_NEQ,
        FILTER_OP_IS_EMPTY,
        FILTER_OP_IS_NOT_EMPTY,
    }


def test_validate_and_coerce_relation_filter_uuid_value():
    conditions = parse_filter_conditions(
        {
            "filters": json.dumps(
                [
                    {
                        "field": "project",
                        "op": FILTER_OP_EQ,
                        "value": PROJECT_PEER_ID,
                    },
                    {"field": "project", "op": FILTER_OP_IS_EMPTY},
                ],
            ),
        },
    )

    validate_filter_conditions(conditions, _field_map())
    coerced = coerce_filter_conditions(conditions, _field_map())

    assert coerced[0].value == PROJECT_PEER_ID
    assert coerced[1].value is None


def test_validate_relation_filter_rejects_text_operator():
    conditions = parse_filter_conditions(
        {
            "filters": json.dumps(
                [{"field": "project", "op": FILTER_OP_CONTAINS, "value": "demo"}],
            ),
        },
    )

    with pytest.raises(ValueError, match="не поддерживается"):
        validate_filter_conditions(conditions, _field_map())
