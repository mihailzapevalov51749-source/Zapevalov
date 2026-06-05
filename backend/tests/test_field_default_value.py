from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.modules.platform.shared.default_value import (
    DEFAULT_VALUE_CONSTANT,
    DEFAULT_VALUE_NONE,
    DEFAULT_VALUE_NOW,
    DEFAULT_VALUE_OPTION,
    DEFAULT_VALUE_SPECIFIC_RECORD,
    DEFAULT_VALUE_TODAY,
    DEFAULT_VALUE_TODAY_PLUS_DAYS,
    DEFAULT_VALUE_TRUE,
    DefaultValueResolveContext,
    apply_defaults_to_values,
    empty_default_value,
    normalize_default_value_json,
    resolve_default_value,
    validate_default_value_json,
)
from app.modules.platform.shared.enums import FieldType


def test_empty_default_value_shape():
    assert empty_default_value() == {"type": "none", "value": None}


def test_normalize_legacy_boolean():
    assert normalize_default_value_json(True, FieldType.BOOLEAN) == {
        "type": DEFAULT_VALUE_TRUE,
        "value": None,
    }


def test_validate_text_constant():
    payload = validate_default_value_json(
        field_type=FieldType.TEXT,
        default_value_json={"type": DEFAULT_VALUE_CONSTANT, "value": "Новый проект"},
    )
    assert payload["value"] == "Новый проект"


def test_resolve_today_and_today_plus_days():
    ctx = DefaultValueResolveContext(
        now=datetime(2026, 6, 5, 12, 0, tzinfo=timezone.utc),
    )

    assert resolve_default_value(
        field_type=FieldType.DATE,
        default_value_json={"type": DEFAULT_VALUE_TODAY, "value": None},
        context=ctx,
    ) == "2026-06-05"

    assert resolve_default_value(
        field_type=FieldType.DATE,
        default_value_json={"type": DEFAULT_VALUE_TODAY_PLUS_DAYS, "value": 7},
        context=ctx,
    ) == "2026-06-12"


def test_apply_defaults_skips_explicit_keys():
    fields = [
        {
            "key": "title",
            "field_type": "text",
            "default_value_json": {"type": DEFAULT_VALUE_CONSTANT, "value": "Default"},
        },
        {
            "key": "status",
            "field_type": "choice",
            "settings_json": {"options": [{"key": "new", "label": "Новая"}]},
            "default_value_json": {"type": DEFAULT_VALUE_OPTION, "value": "new"},
        },
    ]

    merged = apply_defaults_to_values(
        fields=fields,
        values={"title": "Manual"},
    )

    assert merged["title"] == "Manual"
    assert merged["status"] == "new"


def test_validate_relation_specific_record():
    entity_id = str(uuid4())

    validate_default_value_json(
        field_type=FieldType.RELATION,
        default_value_json={
            "type": DEFAULT_VALUE_SPECIFIC_RECORD,
            "value": entity_id,
        },
        settings_json={
            "relation_key": "task_project",
            "role": "source",
            "cardinality": "one",
        },
    )


def test_file_field_rejects_default_value():
    with pytest.raises(ValueError, match="null"):
        validate_default_value_json(
            field_type=FieldType.FILE,
            default_value_json={"type": DEFAULT_VALUE_NONE, "value": None},
        )
