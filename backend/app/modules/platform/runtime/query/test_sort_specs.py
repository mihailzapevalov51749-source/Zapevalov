import json

import pytest

from app.modules.platform.runtime.query.validators import (
    parse_sort_specs,
    validate_sort_specs,
)


def test_parse_sort_specs_from_json_array():
    specs = parse_sort_specs(
        {
            "sorts": json.dumps(
                [
                    {"field": "status", "order": "asc"},
                    {"field": "created_at", "order": "desc"},
                ],
            ),
        },
    )

    assert specs == [("status", "asc"), ("created_at", "desc")]


def test_parse_sort_specs_returns_none_without_param():
    assert parse_sort_specs({}) is None


def test_validate_sort_specs_accepts_catalog_and_system_fields():
    field_map = {"status": {"key": "status", "field_type": "text"}}

    validate_sort_specs(
        [("status", "asc"), ("created_at", "desc")],
        field_map,
    )


def test_parse_sort_specs_rejects_invalid_json():
    with pytest.raises(ValueError, match="valid JSON"):
        parse_sort_specs({"sorts": "not-json"})
