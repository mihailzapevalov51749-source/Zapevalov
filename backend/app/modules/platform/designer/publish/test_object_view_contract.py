"""Lightweight unit checks for ObjectView publish/runtime contract helpers."""

from types import SimpleNamespace
from uuid import uuid4

from app.modules.platform.designer.publish.object_view_contract import (
    OBJECT_VIEW_SCHEMA_VERSION,
    merge_object_view_projection_field_keys,
    normalize_settings_json_for_publish,
    projection_from_object_view,
    sanitize_presentation_table,
    validate_object_view_for_publish,
)


def test_projection_from_object_view_preserves_sort_and_fields() -> None:
    object_view = {
        "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
        "key": "main",
        "viewType": "table",
        "projection": {
            "fieldKeys": ["title", "status"],
            "fieldOrder": ["status", "title"],
            "titleFieldKey": "title",
        },
        "query": {
            "sort": {
                "rules": [{"field": "title", "order": "asc"}],
            },
        },
    }

    projection = projection_from_object_view(object_view)

    assert projection["visible_fields"] == ["title", "status"]
    assert projection["field_order"] == ["status", "title"]
    assert projection["title_field"] == "title"
    assert projection["default_sort"] == {"field": "title", "order": "asc"}


def test_normalize_settings_json_strips_system_columns_from_presentation() -> None:
    settings = {
        "objectView": {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": "main",
            "viewType": "table",
            "projection": {
                "fieldKeys": ["title"],
                "fieldOrder": ["title"],
            },
            "presentation": {
                "table": {
                    "hiddenFieldKeys": ["id", "title"],
                    "columnOrder": ["id", "title"],
                    "columnWidths": {"id": 120, "title": 200},
                },
            },
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="main",
        view_type="table",
        field_keys={"title"},
    )

    table = normalized["objectView"]["presentation"]["table"]
    assert "id" not in table["hiddenFieldKeys"]
    assert "id" not in table["columnOrder"]
    assert "id" not in table["columnWidths"]
    assert "title" in table["hiddenFieldKeys"]
    assert isinstance(normalized.get("projection"), dict)
    assert normalized["projection"]["visible_fields"] == ["title"]


def test_validate_object_view_key_mismatch() -> None:
    issues = validate_object_view_for_publish(
        view_key="main",
        view_type="table",
        settings_json={
            "objectView": {
                "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
                "key": "other",
                "viewType": "table",
            },
        },
        field_keys=set(),
    )

    assert any(code == "object_view_key_mismatch" for code, _ in issues)


def test_normalize_settings_json_syncs_projection_from_object_view_on_drift() -> None:
    """Stale legacy projection must be overwritten from objectView at publish."""
    settings = {
        "objectView": {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": "main",
            "viewType": "table",
            "projection": {
                "fieldKeys": ["title", "priority"],
                "fieldOrder": ["title", "priority"],
                "titleFieldKey": "title",
            },
            "query": {
                "sort": {"rules": [{"field": "title", "order": "asc"}]},
            },
        },
        "projection": {
            "visible_fields": ["priority", "title"],
            "field_order": ["priority", "title"],
            "title_field": "priority",
            "default_sort": {"field": "priority", "order": "desc"},
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="main",
        view_type="table",
        field_keys={"title", "priority"},
    )

    assert normalized["projection"]["visible_fields"] == ["title", "priority"]
    assert normalized["projection"]["field_order"] == ["title", "priority"]
    assert normalized["projection"]["title_field"] == "title"
    assert normalized["projection"]["default_sort"] == {"field": "title", "order": "asc"}


def test_normalize_settings_json_preserves_legacy_projection_without_object_view() -> None:
    settings = {
        "projection": {
            "visible_fields": ["priority", "title"],
            "field_order": ["priority", "title"],
            "title_field": "title",
            "default_sort": {"field": "priority", "order": "desc"},
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="legacy",
        view_type="table",
        field_keys={"title", "priority"},
    )

    assert normalized["projection"]["field_order"] == ["priority", "title"]
    assert "objectView" not in normalized


def test_normalize_settings_json_preserves_filters_and_presentation() -> None:
    saved_filters = [{"id": "qf-1", "name": "Active", "isQuick": True}]
    settings = {
        "objectView": {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": "main",
            "viewType": "table",
            "projection": {
                "fieldKeys": ["title"],
                "fieldOrder": ["title"],
            },
            "query": {
                "filters": {
                    "savedFilters": saved_filters,
                    "quickFilters": saved_filters,
                },
            },
            "presentation": {
                "table": {
                    "hiddenFieldKeys": ["title"],
                    "columnOrder": ["title"],
                    "columnWidths": {"title": 240},
                },
            },
        },
        "projection": {
            "visible_fields": ["title"],
            "field_order": ["title"],
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="main",
        view_type="table",
        field_keys={"title"},
    )

    filters = normalized["objectView"]["query"]["filters"]
    assert filters["savedFilters"] == saved_filters
    table = normalized["objectView"]["presentation"]["table"]
    assert table["hiddenFieldKeys"] == ["title"]
    assert table["columnOrder"] == ["title"]
    assert table["columnWidths"] == {"title": 240.0}


def test_snapshot_builder_serializes_synced_projection() -> None:
    """Publish snapshot path must apply normalize_settings_json_for_publish."""
    from app.modules.platform.designer.publish.snapshot_builder import _serialize_view

    view = SimpleNamespace(
        id=uuid4(),
        key="main",
        name="Main",
        description=None,
        view_type="table",
        is_default=True,
        is_system=False,
        is_active=True,
        sort_order=0,
        settings_json={
            "objectView": {
                "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
                "key": "main",
                "viewType": "table",
                "projection": {
                    "fieldKeys": ["title", "priority"],
                    "fieldOrder": ["title", "priority"],
                },
            },
            "projection": {
                "visible_fields": ["priority", "title"],
                "field_order": ["priority", "title"],
            },
        },
        layout_json={},
        filters_json={"objectView": {"filters": {"savedFilters": []}}},
        visibility_json={},
    )

    payload = _serialize_view(view, field_keys={"title", "priority"})
    projection = payload["settings_json"]["projection"]

    assert projection["field_order"] == ["title", "priority"]
    assert payload["filters_json"] == {"objectView": {"filters": {"savedFilters": []}}}


def test_sanitize_presentation_table_unknown_field_removed() -> None:
    table = sanitize_presentation_table(
        {
            "hiddenFieldKeys": ["unknown", "title"],
            "columnOrder": ["unknown"],
            "columnWidths": {"unknown": 100},
        },
        field_keys={"title"},
    )

    assert table["hiddenFieldKeys"] == ["title"]
    assert table["columnOrder"] == []
    assert table["columnWidths"] == {}


def test_merge_object_view_projection_appends_new_catalog_fields() -> None:
    object_view = {
        "projection": {
            "fieldKeys": ["title"],
            "fieldOrder": ["title"],
            "titleFieldKey": "title",
        },
        "presentation": {
            "table": {
                "hiddenFieldKeys": [],
                "columnOrder": ["title"],
                "columnWidths": {},
            },
        },
    }

    merged = merge_object_view_projection_field_keys(
        object_view,
        ordered_non_system_field_keys=["title", "priority", "due_date"],
    )

    assert merged["projection"]["fieldKeys"] == ["title", "priority", "due_date"]
    assert merged["projection"]["fieldOrder"] == ["title", "priority", "due_date"]
    assert merged["presentation"]["table"]["columnOrder"] == [
        "title",
        "priority",
        "due_date",
    ]


def test_normalize_settings_json_appends_new_field_keys_on_publish() -> None:
    settings = {
        "objectView": {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": "main",
            "viewType": "table",
            "projection": {
                "fieldKeys": ["title"],
                "fieldOrder": ["title"],
                "titleFieldKey": "title",
            },
            "presentation": {
                "table": {
                    "hiddenFieldKeys": [],
                    "columnOrder": ["title"],
                },
            },
        },
        "projection": {
            "visible_fields": ["title"],
            "field_order": ["title"],
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="main",
        view_type="table",
        field_keys={"title", "priority"},
        ordered_field_keys=["title", "priority"],
    )

    assert normalized["objectView"]["projection"]["fieldKeys"] == [
        "title",
        "priority",
    ]
    assert normalized["projection"]["visible_fields"] == ["title", "priority"]
