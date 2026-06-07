"""Tests for legacy projection metadata validation on view save."""

from app.modules.platform.designer.publish.object_view_contract import (
    normalize_settings_json_for_publish,
    projection_from_object_view,
)
from app.modules.platform.designer.view_definitions.service import (
    _validate_projection_metadata,
)


def test_projection_from_object_view_preserves_info_field_keys_order() -> None:
    object_view = {
        "projection": {
            "fieldKeys": ["title", "city", "room", "type"],
            "fieldOrder": ["title", "city", "room", "type"],
            "titleFieldKey": "title",
            "infoFieldKeys": ["type", "city", "room"],
        },
    }

    projection = projection_from_object_view(object_view)

    assert projection["info_field_keys"] == ["type", "city", "room"]


def test_normalize_settings_json_for_publish_preserves_info_field_keys_order() -> None:
    normalized = normalize_settings_json_for_publish(
        {
            "projection": {
                "visible_fields": ["title", "city", "room", "type"],
                "field_order": ["title", "city", "room", "type"],
                "title_field": "title",
                "info_field_keys": ["type", "city", "room"],
            },
            "objectView": {
                "schemaVersion": 1,
                "key": "plan",
                "viewType": "plan",
                "projection": {
                    "fieldKeys": ["title", "city", "room", "type"],
                    "fieldOrder": ["title", "city", "room", "type"],
                    "titleFieldKey": "title",
                    "infoFieldKeys": ["type", "city", "room"],
                },
                "presentation": {"plan": {}},
            },
        },
        view_key="plan",
        view_type="plan",
        field_keys={"title", "city", "room", "type"},
        ordered_field_keys=["title", "city", "room", "type"],
    )

    assert normalized["objectView"]["projection"]["infoFieldKeys"] == [
        "type",
        "city",
        "room",
    ]
    assert normalized["projection"]["info_field_keys"] == ["type", "city", "room"]


def test_validate_projection_metadata_preserves_info_field_keys_order() -> None:
    settings = {
        "projection": {
            "visible_fields": ["title", "city", "room", "type"],
            "field_order": ["title", "city", "room", "type"],
            "title_field": "title",
            "info_field_keys": ["type", "city", "room"],
            "default_sort": {"field": None, "order": "desc"},
        },
        "objectView": {
            "projection": {
                "fieldKeys": ["title", "city", "room", "type"],
                "fieldOrder": ["title", "city", "room", "type"],
                "titleFieldKey": "title",
                "infoFieldKeys": ["type", "city", "room"],
            },
        },
    }

    result = _validate_projection_metadata(
        settings_json=settings,
        context="test",
    )

    assert result["projection"]["info_field_keys"] == ["type", "city", "room"]


def test_validate_projection_metadata_filters_info_keys_outside_visible_fields() -> None:
    settings = {
        "projection": {
            "visible_fields": ["title", "city"],
            "field_order": ["title", "city"],
            "title_field": "title",
            "info_field_keys": ["city", "removed", "title"],
            "default_sort": {"field": None, "order": "desc"},
        },
    }

    result = _validate_projection_metadata(
        settings_json=settings,
        context="test",
    )

    assert result["projection"]["info_field_keys"] == ["city", "title"]
