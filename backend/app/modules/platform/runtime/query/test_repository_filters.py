import json

import pytest
from sqlalchemy.dialects import postgresql

from app.modules.platform.runtime.entities.models import RuntimeEntityValue
from app.modules.platform.runtime.query.filter_operators import (
    FILTER_OP_CONTAINS,
    FILTER_OP_EQ,
    FILTER_OP_GT,
    FILTER_OP_IS_EMPTY,
)
from app.modules.platform.runtime.query.repository import (
    _apply_custom_field_predicate,
    _has_meaningful_custom_value,
)
from app.modules.platform.shared.enums import FieldType


def _compile_sql(expression) -> str:
    return str(expression.compile(dialect=postgresql.dialect()))


def test_user_eq_predicate_compiles_without_astext_on_instrumented_attribute():
    column = RuntimeEntityValue.value_json
    predicate = _apply_custom_field_predicate(column, FieldType.USER.value, FILTER_OP_EQ, 1)
    sql = _compile_sql(predicate).lower()

    assert "value_json" in sql
    assert "jsonb" in sql
    assert "astext" not in sql


def test_number_gt_predicate_uses_jsonb_comparison():
    column = RuntimeEntityValue.value_json
    predicate = _apply_custom_field_predicate(
        column,
        FieldType.NUMBER.value,
        FILTER_OP_GT,
        3,
    )
    sql = _compile_sql(predicate).lower()

    assert "value_json" in sql
    assert "jsonb" in sql
    assert "astext" not in sql


def test_text_contains_predicate_uses_jsonb_text_extraction():
    column = RuntimeEntityValue.value_json
    predicate = _apply_custom_field_predicate(
        column,
        FieldType.TEXT.value,
        FILTER_OP_CONTAINS,
        "задача",
    )
    sql = _compile_sql(predicate).lower()

    assert "#>>" in sql
    assert "ilike" in sql


def test_nonempty_predicate_compiles_for_is_empty_path():
    column = RuntimeEntityValue.value_json
    predicate = _has_meaningful_custom_value(column)
    sql = _compile_sql(predicate).lower()

    assert "#>>" in sql
    assert "is not null" in sql
