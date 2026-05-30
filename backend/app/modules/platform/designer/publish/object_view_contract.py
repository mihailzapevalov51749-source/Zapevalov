"""Guards for ObjectViewContract v1 in publish/runtime paths."""

from __future__ import annotations

from typing import Any

OBJECT_VIEW_SCHEMA_VERSION = 1

OBJECT_VIEW_SYSTEM_FIELD_KEYS = frozenset({"id", "status", "created_at"})


def _is_str_list(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def projection_from_object_view(object_view: dict[str, Any]) -> dict[str, Any]:
    """Build legacy snake_case projection from camelCase objectView projection."""
    projection = object_view.get("projection") if isinstance(object_view.get("projection"), dict) else {}

    field_keys = projection.get("fieldKeys") or projection.get("field_keys") or []
    field_order = projection.get("fieldOrder") or projection.get("field_order") or field_keys
    title_field = projection.get("titleFieldKey") or projection.get("title_field_key")

    sort_rules = []
    query = object_view.get("query")
    if isinstance(query, dict):
        sort = query.get("sort")
        if isinstance(sort, dict) and isinstance(sort.get("rules"), list):
            sort_rules = sort.get("rules") or []

    default_sort_field = None
    default_sort_order = "desc"
    if sort_rules and isinstance(sort_rules[0], dict):
        raw_field = sort_rules[0].get("field")
        if isinstance(raw_field, str) and raw_field.strip():
            default_sort_field = raw_field.strip()
        raw_order = sort_rules[0].get("order")
        if raw_order in {"asc", "desc"}:
            default_sort_order = raw_order

    visible_fields = [str(key) for key in field_keys if isinstance(key, str) and key.strip()]
    field_order_norm = [str(key) for key in field_order if isinstance(key, str) and key.strip()]
    if not field_order_norm and visible_fields:
        field_order_norm = list(visible_fields)

    return {
        "visible_fields": visible_fields,
        "field_order": field_order_norm,
        "title_field": title_field if isinstance(title_field, str) else None,
        "default_sort": {
            "field": default_sort_field,
            "order": default_sort_order,
        },
    }


def sanitize_presentation_table(
    presentation_table: dict[str, Any] | None,
    *,
    field_keys: set[str],
) -> dict[str, Any]:
    if not isinstance(presentation_table, dict):
        return {}

    def _keep_field_key(key: str) -> bool:
        normalized = str(key or "").strip()
        if not normalized or normalized in OBJECT_VIEW_SYSTEM_FIELD_KEYS:
            return False
        if not field_keys:
            return True
        return normalized in field_keys

    hidden = [
        str(key)
        for key in (presentation_table.get("hiddenFieldKeys") or [])
        if _keep_field_key(str(key))
    ]

    order = [
        str(key)
        for key in (presentation_table.get("columnOrder") or [])
        if _keep_field_key(str(key))
    ]

    widths_raw = presentation_table.get("columnWidths")
    widths: dict[str, float] = {}
    if isinstance(widths_raw, dict):
        for key, value in widths_raw.items():
            if not _keep_field_key(str(key)):
                continue
            try:
                width = float(value)
            except (TypeError, ValueError):
                continue
            if width > 0:
                widths[str(key)] = width

    density = presentation_table.get("density")
    if density not in {"compact", "comfortable"}:
        density = "compact"

    return {
        "hiddenFieldKeys": hidden,
        "columnOrder": order,
        "columnWidths": widths,
        "density": density,
    }


def merge_object_view_projection_field_keys(
    object_view: dict[str, Any],
    *,
    ordered_non_system_field_keys: list[str],
) -> dict[str, Any]:
    """Append new object-type fields to objectView.projection (preserve existing order)."""
    object_view = dict(object_view)
    projection_raw = object_view.get("projection")
    projection = dict(projection_raw) if isinstance(projection_raw, dict) else {}

    existing_order: list[str] = []
    seen: set[str] = set()

    for source in (
        projection.get("fieldOrder") or projection.get("field_order") or [],
        projection.get("fieldKeys") or projection.get("field_keys") or [],
    ):
        if not isinstance(source, list):
            continue
        for key in source:
            normalized = str(key or "").strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            existing_order.append(normalized)

    for key in ordered_non_system_field_keys:
        normalized = str(key or "").strip()
        if (
            not normalized
            or normalized in OBJECT_VIEW_SYSTEM_FIELD_KEYS
            or normalized in seen
        ):
            continue
        seen.add(normalized)
        existing_order.append(normalized)

    projection["fieldKeys"] = existing_order
    projection["fieldOrder"] = list(existing_order)

    title = projection.get("titleFieldKey") or projection.get("title_field_key")
    if isinstance(title, str) and title.strip() and title.strip() in seen:
        projection["titleFieldKey"] = title.strip()
    else:
        projection["titleFieldKey"] = next(
            (
                key
                for key in existing_order
                if key not in OBJECT_VIEW_SYSTEM_FIELD_KEYS
            ),
            None,
        )

    presentation = object_view.get("presentation")
    if isinstance(presentation, dict):
        table = presentation.get("table")
        if isinstance(table, dict):
            table = dict(table)
            column_order = [
                str(key)
                for key in (table.get("columnOrder") or [])
                if str(key or "").strip()
            ]
            column_seen = set(column_order)
            for key in existing_order:
                if key not in column_seen:
                    column_order.append(key)
                    column_seen.add(key)
            table["columnOrder"] = column_order
            presentation = dict(presentation)
            presentation["table"] = table
            object_view["presentation"] = presentation

    object_view["projection"] = projection
    return object_view


def normalize_settings_json_for_publish(
    settings_json: dict[str, Any] | None,
    *,
    view_key: str,
    view_type: str,
    field_keys: set[str],
    ordered_field_keys: list[str] | None = None,
) -> dict[str, Any]:
    """
    Sanitize objectView and rebuild legacy compatibility projection before snapshot.

    When objectView is present it is the source of truth; settings.projection is
    always derived via projection_from_object_view(). Legacy views without
    objectView keep their existing projection unchanged.
    """
    settings = dict(settings_json) if isinstance(settings_json, dict) else {}

    object_view = settings.get("objectView")
    if isinstance(object_view, dict):
        presentation = object_view.get("presentation")
        if isinstance(presentation, dict):
            table = presentation.get("table")
            if isinstance(table, dict):
                presentation = dict(presentation)
                presentation["table"] = sanitize_presentation_table(
                    table,
                    field_keys=field_keys,
                )
                object_view = dict(object_view)
                object_view["presentation"] = presentation

        ordered_non_system = [
            str(key)
            for key in (ordered_field_keys or sorted(field_keys))
            if str(key or "").strip() and str(key) not in OBJECT_VIEW_SYSTEM_FIELD_KEYS
        ]
        object_view = merge_object_view_projection_field_keys(
            object_view,
            ordered_non_system_field_keys=ordered_non_system,
        )
        settings["objectView"] = object_view

        # objectView is the source of truth; projection is a compatibility snapshot.
        settings["projection"] = projection_from_object_view(object_view)

    projection = settings.get("projection")
    if isinstance(projection, dict):
        visible = projection.get("visible_fields")
        order = projection.get("field_order")
        if _is_str_list(visible):
            projection["visible_fields"] = [
                key for key in visible if key not in OBJECT_VIEW_SYSTEM_FIELD_KEYS
            ]
        if _is_str_list(order):
            projection["field_order"] = [
                key for key in order if key not in OBJECT_VIEW_SYSTEM_FIELD_KEYS
            ]
        settings["projection"] = projection

    # Keep canonical objectView key/viewType aligned with view row identity.
    if isinstance(settings.get("objectView"), dict):
        ov = dict(settings["objectView"])
        ov.setdefault("schemaVersion", OBJECT_VIEW_SCHEMA_VERSION)
        ov["key"] = str(ov.get("key") or view_key)
        ov["viewType"] = str(ov.get("viewType") or view_type)
        settings["objectView"] = ov

    return settings


def validate_object_view_for_publish(
    *,
    view_key: str,
    view_type: str,
    settings_json: dict[str, Any] | None,
    field_keys: set[str],
) -> list[tuple[str, str]]:
    """
    Returns list of (code, message) publish validation errors.
    Lightweight guards — not full JSON Schema.
    """
    issues: list[tuple[str, str]] = []

    if not isinstance(settings_json, dict):
        return issues

    object_view = settings_json.get("objectView")
    if not isinstance(object_view, dict):
        return issues

    schema_version = object_view.get("schemaVersion")
    if schema_version is None:
        issues.append(
            (
                "object_view_missing_schema_version",
                "settings_json.objectView.schemaVersion обязателен",
            ),
        )
    elif int(schema_version) != OBJECT_VIEW_SCHEMA_VERSION:
        issues.append(
            (
                "object_view_invalid_schema_version",
                f"settings_json.objectView.schemaVersion должен быть {OBJECT_VIEW_SCHEMA_VERSION}",
            ),
        )

    ov_key = object_view.get("key")
    if isinstance(ov_key, str) and ov_key.strip() and ov_key.strip() != view_key:
        issues.append(
            (
                "object_view_key_mismatch",
                "settings_json.objectView.key должен совпадать с view.key",
            ),
        )

    ov_view_type = object_view.get("viewType")
    if isinstance(ov_view_type, str) and ov_view_type.strip() and ov_view_type != view_type:
        issues.append(
            (
                "object_view_type_mismatch",
                "settings_json.objectView.viewType должен совпадать с view.view_type",
            ),
        )

    presentation = object_view.get("presentation")
    if isinstance(presentation, dict):
        table = presentation.get("table")
        if isinstance(table, dict):
            for key in (table.get("hiddenFieldKeys") or []):
                normalized = str(key or "").strip()
                if normalized in OBJECT_VIEW_SYSTEM_FIELD_KEYS:
                    issues.append(
                        (
                            "object_view_system_column_in_presentation",
                            f"Системная колонка '{normalized}' не должна быть в presentation.table",
                        ),
                    )
                elif field_keys and normalized and normalized not in field_keys:
                    issues.append(
                        (
                            "object_view_unknown_presentation_field",
                            f"presentation.table ссылается на неизвестное поле '{normalized}'",
                        ),
                    )

    filters = object_view.get("query", {}).get("filters") if isinstance(object_view.get("query"), dict) else None
    if isinstance(filters, dict):
        saved_filters = filters.get("savedFilters")
        if saved_filters is not None and not isinstance(saved_filters, list):
            issues.append(
                (
                    "object_view_invalid_saved_filters",
                    "settings_json.objectView.query.filters.savedFilters должен быть массивом",
                ),
            )

    return issues
