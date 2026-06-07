"""Lightweight unit checks for ObjectView publish/runtime contract helpers."""

from types import SimpleNamespace
from uuid import uuid4

from app.modules.platform.designer.publish.object_view_contract import (
    OBJECT_VIEW_SCHEMA_VERSION,
    ensure_object_view_contract_scaffold,
    merge_legacy_projection_field_keys,
    merge_object_view_projection_field_keys,
    normalize_settings_json_for_publish,
    projection_from_object_view,
    resolve_uses_legacy_plan_fields,
    sanitize_presentation_card,
    sanitize_presentation_table,
    sanitize_role_mapping,
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


def test_projection_from_object_view_preserves_info_field_keys_order() -> None:
    object_view = {
        "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
        "key": "plan",
        "viewType": "plan",
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
                "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
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
                    "hiddenFieldKeys": ["__system_id", "title"],
                    "columnOrder": ["__system_id", "title"],
                    "columnWidths": {"__system_id": 120, "title": 200},
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
    assert "__system_id" not in table["hiddenFieldKeys"]
    assert "__system_id" not in table["columnOrder"]
    assert "__system_id" not in table["columnWidths"]
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


def test_normalize_settings_json_applies_legacy_title_field_to_object_view() -> None:
    settings = {
        "objectView": {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": "default_table",
            "viewType": "table",
            "projection": {
                "fieldKeys": ["title", "assignee"],
                "fieldOrder": ["title", "assignee"],
                "titleFieldKey": "title",
            },
        },
        "projection": {
            "visible_fields": ["title", "assignee"],
            "field_order": ["title", "assignee"],
            "title_field": "assignee",
            "default_sort": {"field": "created_at", "order": "desc"},
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="default_table",
        view_type="table",
        field_keys={"title", "assignee"},
    )

    assert normalized["projection"]["title_field"] == "assignee"
    assert normalized["objectView"]["projection"]["titleFieldKey"] == "assignee"


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


def test_merge_object_view_projection_includes_user_status_field() -> None:
    """User field key 'status' must not be treated as entity system status."""
    merged = merge_object_view_projection_field_keys(
        {
            "projection": {
                "fieldKeys": ["title"],
                "fieldOrder": ["title"],
                "titleFieldKey": "title",
            },
        },
        ordered_non_system_field_keys=["title", "status", "priority"],
    )

    assert merged["projection"]["fieldKeys"] == ["title", "status", "priority"]
    assert merged["projection"]["fieldOrder"] == ["title", "status", "priority"]


def test_merge_legacy_projection_appends_new_fields_as_visible() -> None:
    projection = {
        "visible_fields": ["title"],
        "field_order": ["title"],
        "title_field": "title",
    }

    merged = merge_legacy_projection_field_keys(
        projection,
        ordered_non_system_field_keys=["title", "assignee", "due_date"],
    )

    assert merged["field_order"] == ["title", "assignee", "due_date"]
    assert merged["visible_fields"] == ["title", "assignee", "due_date"]


def test_normalize_legacy_projection_only_appends_new_fields() -> None:
    settings = {
        "projection": {
            "visible_fields": ["title"],
            "field_order": ["title"],
            "title_field": "title",
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="default_table",
        view_type="table",
        field_keys={"title", "priority"},
        ordered_field_keys=["title", "priority"],
    )

    assert normalized["projection"]["field_order"] == ["title", "priority"]
    assert normalized["projection"]["visible_fields"] == ["title", "priority"]


def test_normalize_settings_json_preserves_card_visibility_on_publish() -> None:
    settings = {
        "objectView": {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": "default_table",
            "viewType": "table",
            "projection": {
                "fieldKeys": ["title", "assignee"],
                "fieldOrder": ["title", "assignee"],
            },
            "presentation": {
                "table": {"hiddenFieldKeys": [], "columnOrder": ["title", "assignee"]},
                "card": {
                    "sections": [
                        {
                            "id": "comments",
                            "type": "comments",
                            "visible": False,
                            "order": 5,
                            "fieldKeys": [],
                        },
                        {
                            "id": "attachments",
                            "type": "attachments",
                            "visible": True,
                            "order": 4,
                            "fieldKeys": [],
                        },
                    ],
                    "tabs": [
                        {"id": "notes", "visible": False, "order": 0},
                        {"id": "relations", "visible": True, "order": 1},
                    ],
                    "hiddenFieldKeys": ["assignee"],
                },
            },
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="default_table",
        view_type="table",
        field_keys={"title", "assignee"},
    )

    card = normalized["objectView"]["presentation"]["card"]
    comments = next(section for section in card["sections"] if section["id"] == "comments")
    notes = next(tab for tab in card["tabs"] if tab["id"] == "notes")

    assert comments["visible"] is False
    assert notes["visible"] is False
    assert card["hiddenFieldKeys"] == ["assignee"]


def test_sanitize_presentation_card_keeps_explicit_false_visible() -> None:
    card = sanitize_presentation_card(
        {
            "sections": [{"id": "comments", "visible": False, "fieldKeys": []}],
            "tabs": [],
            "hiddenFieldKeys": [],
        },
        field_keys={"title"},
    )

    assert card is not None
    assert card["sections"][0]["visible"] is False


def test_normalize_settings_json_preserves_plan_presentation() -> None:
    settings = {
        "objectView": {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": "architecture",
            "viewType": "plan",
            "presentation": {
                "plan": {
                    "hierarchyRelationKey": "parent_child",
                    "titleFieldKey": "name",
                    "progressMode": "status_based",
                    "statusProgressMap": {"done": 100},
                },
            },
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="architecture",
        view_type="plan",
        field_keys={"name"},
    )

    plan = normalized["objectView"]["presentation"]["plan"]
    assert plan["hierarchyRelationKey"] == "parent_child"
    assert plan["titleFieldKey"] == "name"
    assert plan["progressMode"] == "status_based"
    assert plan["statusProgressMap"]["done"] == 100
    assert plan["usesLegacyPlanFields"] is True


def test_normalize_settings_json_scaffolds_plan_object_view_without_object_view() -> None:
    settings = {
        "projection": {
            "visible_fields": [],
            "field_order": [],
            "title_field": None,
            "default_sort": {"field": None, "order": "desc"},
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="architecture",
        view_type="plan",
        field_keys=set(),
    )

    object_view = normalized["objectView"]
    assert object_view["schemaVersion"] == OBJECT_VIEW_SCHEMA_VERSION
    assert object_view["key"] == "architecture"
    assert object_view["viewType"] == "plan"
    assert isinstance(object_view["presentation"]["plan"], dict)


def test_normalize_settings_json_scaffolds_quick_form_presentation() -> None:
    settings = {
        "projection": {
            "visible_fields": ["title"],
            "field_order": ["title"],
            "title_field": "title",
            "default_sort": {"field": None, "order": "desc"},
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="default_quick_form",
        view_type="quick_form",
        field_keys={"title"},
    )

    object_view = normalized["objectView"]
    assert object_view["viewType"] == "quick_form"
    assert isinstance(object_view["presentation"]["quickForm"], dict)


def test_normalize_settings_json_preserves_tab_settings_menu_in_tab() -> None:
    settings = {
        "tabSettings": {"menuInTab": True},
        "projection": {
            "visible_fields": ["name"],
            "field_order": ["name"],
            "title_field": "name",
            "default_sort": {"field": None, "order": "desc"},
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="default_table",
        view_type="table",
        field_keys={"name"},
    )

    assert normalized["tabSettings"] == {"menuInTab": True}


def test_preserve_object_tab_settings_keeps_false() -> None:
    from app.modules.platform.designer.publish.object_view_contract import (
        preserve_object_tab_settings,
    )

    assert preserve_object_tab_settings({"tabSettings": {"menuInTab": False}}) == {
        "tabSettings": {"menuInTab": False},
    }


def test_ensure_object_view_contract_scaffold_adds_role_mapping() -> None:
    scaffolded = ensure_object_view_contract_scaffold(
        {},
        view_key="new_tab",
        view_type="table",
    )

    object_view = scaffolded["objectView"]
    assert object_view["roleMapping"] == {}
    assert object_view["projection"]["fieldKeys"] == []
    assert isinstance(object_view["query"]["filters"]["conditions"], list)


def test_sanitize_role_mapping_drops_keys_outside_projection() -> None:
    sanitized = sanitize_role_mapping(
        {"nodeTitle": "title", "nodeStatus": "status"},
        projection_field_keys={"title"},
    )

    assert sanitized == {"nodeTitle": "title"}


def test_sanitize_role_mapping_preserves_labels() -> None:
    sanitized = sanitize_role_mapping(
        {
            "nodeTitle": "title",
            "nodeStatus": "status",
            "labels": {"nodeStatus": "Состояние", "nextSteps": "Действия"},
        },
        projection_field_keys={"title", "status"},
    )

    assert sanitized == {
        "nodeTitle": "title",
        "nodeStatus": "status",
        "labels": {"nodeStatus": "Состояние", "nextSteps": "Действия"},
    }


def test_validate_object_view_role_mapping_not_in_projection() -> None:
    issues = validate_object_view_for_publish(
        view_key="plan",
        view_type="plan",
        settings_json={
            "objectView": {
                "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
                "key": "plan",
                "viewType": "plan",
                "projection": {
                    "fieldKeys": ["title"],
                    "fieldOrder": ["title"],
                },
                "roleMapping": {
                    "nodeStatus": "status",
                },
            },
        },
        field_keys={"title", "status"},
    )

    assert any(
        code == "object_view_role_mapping_field_not_in_projection"
        for code, _ in issues
    )


def test_validate_object_view_unknown_projection_field() -> None:
    issues = validate_object_view_for_publish(
        view_key="main",
        view_type="table",
        settings_json={
            "objectView": {
                "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
                "key": "main",
                "viewType": "table",
                "projection": {
                    "fieldKeys": ["title", "missing_field"],
                    "fieldOrder": ["title", "missing_field"],
                },
            },
        },
        field_keys={"title"},
    )

    assert any(code == "object_view_unknown_projection_field" for code, _ in issues)


def test_normalize_settings_json_preserves_valid_role_mapping() -> None:
    settings = {
        "objectView": {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": "plan",
            "viewType": "plan",
            "projection": {
                "fieldKeys": ["title", "status"],
                "fieldOrder": ["title", "status"],
            },
            "roleMapping": {
                "nodeTitle": "title",
                "nodeStatus": "status",
            },
            "presentation": {"plan": {}},
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="plan",
        view_type="plan",
        field_keys={"title", "status"},
    )

    assert normalized["objectView"]["roleMapping"] == {
        "nodeTitle": "title",
        "nodeStatus": "status",
    }


def test_normalize_settings_json_strips_invalid_role_mapping_at_publish() -> None:
    settings = {
        "objectView": {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": "plan",
            "viewType": "plan",
            "projection": {
                "fieldKeys": ["title"],
                "fieldOrder": ["title"],
            },
            "roleMapping": {
                "nodeTitle": "title",
                "nodeStatus": "status",
            },
            "presentation": {"plan": {}},
        },
    }

    normalized = normalize_settings_json_for_publish(
        settings,
        view_key="plan",
        view_type="plan",
        field_keys={"title"},
    )

    assert normalized["objectView"]["roleMapping"] == {"nodeTitle": "title"}


def test_resolve_uses_legacy_plan_fields_new_plan_with_role_mapping() -> None:
    assert (
        resolve_uses_legacy_plan_fields(
            {
                "nodeTitle": "module_name",
                "nodeStatus": "status",
                "nodeDescription": "description",
            },
            {
                "titleFieldKey": "title",
                "statusFieldKey": "status",
            },
        )
        is False
    )


def test_resolve_uses_legacy_plan_fields_old_plan_legacy_only() -> None:
    assert (
        resolve_uses_legacy_plan_fields(
            {},
            {
                "titleFieldKey": "title",
                "statusFieldKey": "status",
                "descriptionFieldKey": "description",
            },
        )
        is True
    )


def test_resolve_uses_legacy_plan_fields_mixed_role_mapping_and_legacy() -> None:
    assert (
        resolve_uses_legacy_plan_fields(
            {"nodeTitle": "module_name"},
            {
                "statusFieldKey": "status",
                "descriptionFieldKey": "description",
            },
        )
        is True
    )


def test_normalize_settings_json_sets_uses_legacy_plan_fields_on_publish() -> None:
    new_plan = normalize_settings_json_for_publish(
        {
            "objectView": {
                "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
                "key": "plan",
                "viewType": "plan",
                "projection": {
                    "fieldKeys": ["module_name", "status", "description"],
                    "fieldOrder": ["module_name", "status", "description"],
                },
                "roleMapping": {
                    "nodeTitle": "module_name",
                    "nodeStatus": "status",
                    "nodeDescription": "description",
                },
                "presentation": {"plan": {}},
            },
        },
        view_key="plan",
        view_type="plan",
        field_keys={"module_name", "status", "description"},
    )

    legacy_plan = normalize_settings_json_for_publish(
        {
            "objectView": {
                "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
                "key": "legacy_plan",
                "viewType": "plan",
                "projection": {
                    "fieldKeys": ["title", "status", "description"],
                    "fieldOrder": ["title", "status", "description"],
                },
                "roleMapping": {},
                "presentation": {
                    "plan": {
                        "titleFieldKey": "title",
                        "statusFieldKey": "status",
                        "descriptionFieldKey": "description",
                    },
                },
            },
        },
        view_key="legacy_plan",
        view_type="plan",
        field_keys={"title", "status", "description"},
    )

    new_plan_presentation = new_plan["objectView"]["presentation"]["plan"]
    assert new_plan_presentation["usesLegacyPlanFields"] is False
    assert "titleFieldKey" not in new_plan_presentation
    assert "statusFieldKey" not in new_plan_presentation
    assert "descriptionFieldKey" not in new_plan_presentation
    assert "nextStepsFieldKey" not in new_plan_presentation

    legacy_plan_presentation = legacy_plan["objectView"]["presentation"]["plan"]
    assert legacy_plan_presentation["usesLegacyPlanFields"] is True
    assert legacy_plan_presentation["titleFieldKey"] == "title"
    assert legacy_plan_presentation["descriptionFieldKey"] == "description"


def test_sanitize_presentation_plan_includes_plan_layout_defaults() -> None:
    from app.modules.platform.designer.publish.object_view_contract import (
        sanitize_presentation_plan,
    )

    plan = sanitize_presentation_plan(
        {"hierarchyRelationKey": "podpunkt"},
        role_mapping={
            "nodeTitle": "nazvanie",
            "nodeStatus": "status",
            "nodeDescription": "opisanie",
        },
        field_keys={"priority", "deadline"},
    )

    assert "planLayout" in plan
    assert len(plan["planLayout"]["tabs"]) == 6
    assert plan["planLayout"]["tabs"][-1]["key"] == "checklist"
    assert plan["planLayout"]["tabs"][-1]["showInInfo"] is False
    assert len(plan["planLayout"]["infoSections"]) == 6
    assert plan["planLayout"]["fields"]["order"] == []


def test_sanitize_presentation_plan_strips_legacy_when_role_mapping_ready() -> None:
    from app.modules.platform.designer.publish.object_view_contract import (
        sanitize_presentation_plan,
    )

    plan = sanitize_presentation_plan(
        {
            "hierarchyRelationKey": "podpunkt",
            "titleFieldKey": "nazvanie",
            "descriptionFieldKey": "opisanie",
            "issuesRelationKey": "problemy",
        },
        role_mapping={
            "nodeTitle": "nazvanie",
            "nodeStatus": "status",
            "nodeDescription": "opisanie",
        },
    )

    assert plan["usesLegacyPlanFields"] is False
    assert plan["hierarchyRelationKey"] == "podpunkt"
    assert plan["issuesRelationKey"] == "problemy"
    assert "titleFieldKey" not in plan
    assert "descriptionFieldKey" not in plan


def test_sanitize_presentation_plan_keeps_legacy_when_still_dependent() -> None:
    from app.modules.platform.designer.publish.object_view_contract import (
        sanitize_presentation_plan,
    )

    plan = sanitize_presentation_plan(
        {
            "titleFieldKey": "nazvanie",
            "descriptionFieldKey": "opisanie",
        },
        role_mapping={},
    )

    assert plan["usesLegacyPlanFields"] is True
    assert plan["titleFieldKey"] == "nazvanie"
    assert plan["descriptionFieldKey"] == "opisanie"
