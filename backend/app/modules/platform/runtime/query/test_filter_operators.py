import json

import pytest

from app.modules.platform.runtime.query.filter_operators import (
    FILTER_OP_CONTAINS,
    FILTER_OP_EQ,
    FILTER_OP_GT,
    FILTER_OP_IS_EMPTY,
    FILTER_OP_IS_NOT_EMPTY,
    FILTER_OP_NEQ,
)
from app.modules.platform.runtime.query.validators import (
    coerce_filter_conditions,
    parse_filter_conditions,
    validate_filter_conditions,
)
from app.modules.platform.shared.enums import FieldType


def _field_map():
    return {
        "title": {"key": "title", "field_type": FieldType.TEXT.value},
        "amount": {"key": "amount", "field_type": FieldType.NUMBER.value},
        "status": {"key": "status", "field_type": "status"},
        "assignee": {"key": "assignee", "field_type": FieldType.USER.value},
        "starts_at": {"key": "starts_at", "field_type": FieldType.DATE.value},
        "active": {"key": "active", "field_type": FieldType.BOOLEAN.value},
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
