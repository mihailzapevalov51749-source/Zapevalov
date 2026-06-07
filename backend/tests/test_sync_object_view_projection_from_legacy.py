"""Publish path: legacy info_field_keys sync onto objectView."""

from app.modules.platform.designer.publish.object_view_contract import (
    sync_object_view_projection_from_legacy,
)


def test_sync_object_view_projection_from_legacy_fills_missing_info_field_keys() -> None:
    object_view = {
        "projection": {
            "fieldKeys": ["title", "city", "room", "type"],
            "fieldOrder": ["title", "city", "room", "type"],
            "titleFieldKey": "title",
            "infoFieldKeys": [],
        },
    }
    legacy_projection = {
        "visible_fields": ["title", "city", "room", "type"],
        "field_order": ["title", "city", "room", "type"],
        "title_field": "title",
        "info_field_keys": ["type", "city", "room"],
    }

    result = sync_object_view_projection_from_legacy(
        object_view,
        legacy_projection,
        field_keys={"title", "city", "room", "type"},
    )

    assert result["projection"]["infoFieldKeys"] == ["type", "city", "room"]


def test_sync_object_view_projection_from_legacy_keeps_object_view_info_field_keys() -> None:
    object_view = {
        "projection": {
            "fieldKeys": ["title", "city", "room", "type"],
            "fieldOrder": ["title", "city", "room", "type"],
            "titleFieldKey": "title",
            "infoFieldKeys": ["room", "type", "city"],
        },
    }
    legacy_projection = {
        "visible_fields": ["title", "city", "room", "type"],
        "field_order": ["title", "city", "room", "type"],
        "title_field": "title",
        "info_field_keys": ["type", "city", "room"],
    }

    result = sync_object_view_projection_from_legacy(
        object_view,
        legacy_projection,
        field_keys={"title", "city", "room", "type"},
    )

    assert result["projection"]["infoFieldKeys"] == ["room", "type", "city"]
