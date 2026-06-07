"""Guards for ObjectViewContract v1 in publish/runtime paths."""

from __future__ import annotations

from typing import Any

OBJECT_VIEW_SCHEMA_VERSION = 1

SYSTEM_COLUMN_KEY_PREFIX = "__system_"

OBJECT_VIEW_SYSTEM_FIELD_KEYS = frozenset(
    {
        f"{SYSTEM_COLUMN_KEY_PREFIX}id",
        f"{SYSTEM_COLUMN_KEY_PREFIX}status",
        f"{SYSTEM_COLUMN_KEY_PREFIX}created_at",
        f"{SYSTEM_COLUMN_KEY_PREFIX}updated_at",
        f"{SYSTEM_COLUMN_KEY_PREFIX}created_by",
        f"{SYSTEM_COLUMN_KEY_PREFIX}updated_by",
        f"{SYSTEM_COLUMN_KEY_PREFIX}record_version",
    },
)


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

    visible_set = set(visible_fields)
    info_raw = projection.get("infoFieldKeys") or projection.get("info_field_keys")
    info_field_keys: list[str] | None = None
    if isinstance(info_raw, list):
        info_field_keys = [
            str(key).strip()
            for key in info_raw
            if isinstance(key, str) and str(key).strip() and str(key).strip() in visible_set
        ]

    result: dict[str, Any] = {
        "visible_fields": visible_fields,
        "field_order": field_order_norm,
        "title_field": title_field if isinstance(title_field, str) else None,
        "default_sort": {
            "field": default_sort_field,
            "order": default_sort_order,
        },
    }

    if info_field_keys is not None:
        result["info_field_keys"] = info_field_keys

    return result


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


PLAN_REQUIRED_ROLE_KEYS = ("nodeTitle", "nodeStatus", "nodeDescription")

PLAN_LEGACY_FIELD_KEY_BY_ROLE: dict[str, str] = {
    "nodeTitle": "titleFieldKey",
    "nodeStatus": "statusFieldKey",
    "nodeDescription": "descriptionFieldKey",
    "nextSteps": "nextStepsFieldKey",
}

PLAN_LEGACY_SNAPSHOT_FIELD_KEYS = tuple(PLAN_LEGACY_FIELD_KEY_BY_ROLE.values())


def resolve_uses_legacy_plan_fields(
    role_mapping: dict[str, Any] | None,
    presentation_plan: dict[str, Any] | None,
) -> bool:
    """
    Publish diagnostic: True when Plan still depends on legacy presentation.plan.*FieldKey.

    Snapshot-only — runtime dual-read is unchanged.
    """
    mapping = role_mapping if isinstance(role_mapping, dict) else {}
    plan = presentation_plan if isinstance(presentation_plan, dict) else {}

    def _optional_key(raw_key: Any) -> str:
        return str(raw_key or "").strip()

    for role_key in PLAN_REQUIRED_ROLE_KEYS:
        if not _optional_key(mapping.get(role_key)):
            return True

    for role_key, legacy_key in PLAN_LEGACY_FIELD_KEY_BY_ROLE.items():
        if _optional_key(mapping.get(role_key)):
            continue
        if _optional_key(plan.get(legacy_key)):
            return True

    return False


def _has_required_plan_role_mapping(role_mapping: dict[str, Any] | None) -> bool:
    mapping = role_mapping if isinstance(role_mapping, dict) else {}

    def _optional_key(raw_key: Any) -> str:
        return str(raw_key or "").strip()

    return all(_optional_key(mapping.get(role_key)) for role_key in PLAN_REQUIRED_ROLE_KEYS)


def _strip_legacy_plan_field_keys_from_snapshot(sanitized: dict[str, Any]) -> dict[str, Any]:
    """Remove deprecated *FieldKey entries from published plan presentation only."""
    result = dict(sanitized)
    for key in PLAN_LEGACY_SNAPSHOT_FIELD_KEYS:
        result.pop(key, None)
    return result


PLAN_LAYOUT_TAB_KEYS = ("info", "comments", "history", "files", "tasks", "checklist")
PLAN_LAYOUT_INFO_SECTION_KEYS = (
    "status",
    "progress",
    "description",
    "checklist",
    "fields",
    "problems",
)


def _sanitize_plan_layout_items(
    raw_items: Any,
    *,
    allowed_keys: tuple[str, ...],
    default_labels: dict[str, str],
    include_show_in_info: bool = False,
) -> list[dict[str, Any]]:
    defaults = {
        key: {
            "key": key,
            "label": default_labels.get(key, key),
            "visible": True,
            "order": (index + 1) * 10,
            "system": True,
            **({"showInInfo": False} if include_show_in_info else {}),
        }
        for index, key in enumerate(allowed_keys)
    }

    if isinstance(raw_items, list):
        for raw_item in raw_items:
            if not isinstance(raw_item, dict):
                continue
            key = str(raw_item.get("key") or "").strip()
            if not key or key not in defaults:
                continue
            label = str(raw_item.get("label") or defaults[key]["label"]).strip() or defaults[key]["label"]
            order_raw = raw_item.get("order")
            order = int(order_raw) if isinstance(order_raw, (int, float)) else defaults[key]["order"]
            sanitized_item = {
                "key": key,
                "label": label,
                "visible": raw_item.get("visible") is not False,
                "order": order,
                "system": raw_item.get("system") is not False,
            }
            if include_show_in_info:
                sanitized_item["showInInfo"] = (
                    key != "info" and raw_item.get("showInInfo") is True
                )
            defaults[key] = sanitized_item

    return [defaults[key] for key in allowed_keys]


def sanitize_plan_layout(
    plan_layout: dict[str, Any] | None,
    *,
    field_keys: set[str] | None = None,
) -> dict[str, Any]:
    if not isinstance(plan_layout, dict):
        plan_layout = {}

    tab_labels = {
        "info": "Инфо",
        "comments": "Комментарии",
        "history": "История",
        "files": "Файлы",
        "tasks": "Задачи",
        "checklist": "Чек-лист",
    }
    section_labels = {
        "status": "Статус",
        "progress": "Готовность",
        "description": "Описание",
        "checklist": "Чек-лист",
        "fields": "Основные поля",
        "problems": "Проблемы",
    }

    fields_raw = plan_layout.get("fields")
    fields_dict = fields_raw if isinstance(fields_raw, dict) else {}

    def _filter_field_keys(raw_keys: Any) -> list[str]:
        if not isinstance(raw_keys, list):
            return []
        result: list[str] = []
        seen: set[str] = set()
        for raw_key in raw_keys:
            key = str(raw_key or "").strip()
            if not key or key in seen:
                continue
            if field_keys is not None and key not in field_keys:
                continue
            seen.add(key)
            result.append(key)
        return result

    return {
        "tabs": _sanitize_plan_layout_items(
            plan_layout.get("tabs"),
            allowed_keys=PLAN_LAYOUT_TAB_KEYS,
            default_labels=tab_labels,
            include_show_in_info=True,
        ),
        "infoSections": _sanitize_plan_layout_items(
            plan_layout.get("infoSections"),
            allowed_keys=PLAN_LAYOUT_INFO_SECTION_KEYS,
            default_labels=section_labels,
        ),
        "fields": {
            "visibleFieldKeys": _filter_field_keys(fields_dict.get("visibleFieldKeys")),
            "hiddenFieldKeys": _filter_field_keys(fields_dict.get("hiddenFieldKeys")),
            "order": _filter_field_keys(fields_dict.get("order")),
        },
    }


def sanitize_presentation_plan(
    presentation_plan: dict[str, Any] | None,
    *,
    role_mapping: dict[str, Any] | None = None,
    field_keys: set[str] | None = None,
) -> dict[str, Any]:
    """Sanitize plan view presentation before catalog snapshot."""
    if not isinstance(presentation_plan, dict):
        return {}

    status_mapping_raw = presentation_plan.get("statusMapping")
    status_progress_map_raw = presentation_plan.get("statusProgressMap")
    status_mapping: dict[str, int] = {}
    if isinstance(status_mapping_raw, dict):
        for key, value in status_mapping_raw.items():
            normalized_key = str(key or "").strip().lower()
            if not normalized_key:
                continue
            try:
                percent = int(value)
            except (TypeError, ValueError):
                continue
            status_mapping[normalized_key] = max(0, min(100, percent))

    status_progress_map: dict[str, int] = dict(status_mapping)
    if isinstance(status_progress_map_raw, dict):
        for key, value in status_progress_map_raw.items():
            normalized_key = str(key or "").strip().lower()
            if not normalized_key:
                continue
            try:
                percent = int(value)
            except (TypeError, ValueError):
                continue
            status_progress_map[normalized_key] = max(0, min(100, percent))

    progress_mode_raw = presentation_plan.get("progressMode")
    progress_mode = str(progress_mode_raw or "status_based").strip() or "status_based"

    def _optional_key(raw_key: Any) -> str | None:
        normalized = str(raw_key or "").strip()
        return normalized or None

    plan_layout_raw = presentation_plan.get("planLayout")
    sanitized = {
        "hierarchyRelationKey": _optional_key(presentation_plan.get("hierarchyRelationKey")),
        # @deprecated Will be removed after migration cutoff. Use roleMapping.nodeTitle.
        "titleFieldKey": _optional_key(presentation_plan.get("titleFieldKey")),
        # @deprecated Will be removed after migration cutoff. Use roleMapping.nodeStatus.
        "statusFieldKey": _optional_key(presentation_plan.get("statusFieldKey")),
        # @deprecated Will be removed after migration cutoff. Use roleMapping.nodeDescription.
        "descriptionFieldKey": _optional_key(presentation_plan.get("descriptionFieldKey")),
        # @deprecated Will be removed after migration cutoff. Use roleMapping.nextSteps.
        "nextStepsFieldKey": _optional_key(presentation_plan.get("nextStepsFieldKey")),
        "issuesRelationKey": _optional_key(presentation_plan.get("issuesRelationKey")),
        "progressMode": progress_mode,
        "statusProgressMap": status_progress_map,
        "statusMapping": status_progress_map,
        "planLayout": sanitize_plan_layout(
            plan_layout_raw if isinstance(plan_layout_raw, dict) else None,
            field_keys=field_keys,
        ),
    }

    uses_legacy_plan_fields = resolve_uses_legacy_plan_fields(
        role_mapping,
        sanitized,
    )
    sanitized["usesLegacyPlanFields"] = uses_legacy_plan_fields

    if (
        not uses_legacy_plan_fields
        and _has_required_plan_role_mapping(role_mapping)
    ):
        sanitized = _strip_legacy_plan_field_keys_from_snapshot(sanitized)
        sanitized["usesLegacyPlanFields"] = False

    return sanitized


def _normalize_card_visible_flag(value: Any) -> bool:
    """Canonical card visibility: only explicit false hides a block/tab/field."""
    return value is not False


def sanitize_presentation_card(
    presentation_card: dict[str, Any] | None,
    *,
    field_keys: set[str] | None = None,
) -> dict[str, Any] | None:
    """Light sanitization for object card layout before catalog snapshot."""
    if not isinstance(presentation_card, dict):
        return None

    allowed_keys = field_keys or set()

    def _keep_field_key(key: str) -> bool:
        normalized = str(key or "").strip()
        if not normalized or normalized in OBJECT_VIEW_SYSTEM_FIELD_KEYS:
            return False
        if not allowed_keys:
            return True
        return normalized in allowed_keys

    sections: list[dict[str, Any]] = []
    for index, section in enumerate(presentation_card.get("sections") or []):
        if not isinstance(section, dict):
            continue

        field_keys_norm = [
            str(key)
            for key in (section.get("fieldKeys") or [])
            if _keep_field_key(str(key))
        ]
        tab_ids_norm = [
            str(tab_id).strip()
            for tab_id in (section.get("tabIds") or [])
            if str(tab_id or "").strip()
        ]

        sections.append(
            {
                "id": str(section.get("id") or f"section-{index + 1}"),
                "type": str(section.get("type") or "").strip() or None,
                "title": str(section.get("title") or "").strip(),
                "fieldKeys": field_keys_norm,
                "tabIds": tab_ids_norm,
                "visible": _normalize_card_visible_flag(section.get("visible")),
                "order": int(section["order"])
                if isinstance(section.get("order"), (int, float))
                else index,
            }
        )

    tabs: list[dict[str, Any]] = []
    for index, tab in enumerate(presentation_card.get("tabs") or []):
        if not isinstance(tab, dict):
            continue
        tab_id = str(tab.get("id") or "").strip()
        if not tab_id:
            continue
        tabs.append(
            {
                "id": tab_id,
                "visible": _normalize_card_visible_flag(tab.get("visible")),
                "order": int(tab["order"])
                if isinstance(tab.get("order"), (int, float))
                else index,
            }
        )

    hidden_field_keys = [
        str(key)
        for key in (presentation_card.get("hiddenFieldKeys") or [])
        if _keep_field_key(str(key))
    ]

    if not sections and not tabs and not hidden_field_keys:
        return None

    return {
        "sections": sections,
        "tabs": tabs,
        "hiddenFieldKeys": hidden_field_keys,
    }


def _enforce_title_field_first_in_column_order(
    column_order: list[str],
    title_field: str | None,
) -> list[str]:
    title = str(title_field or "").strip()
    if not title:
        return column_order

    without_title = [key for key in column_order if key != title]
    if title not in column_order:
        return column_order

    return [title, *without_title]


def sync_object_view_projection_from_legacy(
    object_view: dict[str, Any],
    legacy_projection: dict[str, Any],
    *,
    field_keys: set[str],
) -> dict[str, Any]:
    """Apply Studio legacy projection.title_field onto objectView before publish."""
    object_view = dict(object_view)
    projection_raw = object_view.get("projection")
    projection = dict(projection_raw) if isinstance(projection_raw, dict) else {}

    legacy_title = legacy_projection.get("title_field")
    if isinstance(legacy_title, str) and legacy_title.strip():
        normalized_title = legacy_title.strip()
        if not field_keys or normalized_title in field_keys:
            projection["titleFieldKey"] = normalized_title

    legacy_visible = legacy_projection.get("visible_fields")
    legacy_order = legacy_projection.get("field_order")
    if _is_str_list(legacy_order):
        order = [
            str(key).strip()
            for key in legacy_order
            if str(key or "").strip() and str(key) not in OBJECT_VIEW_SYSTEM_FIELD_KEYS
        ]
        if order:
            projection["fieldKeys"] = order
            projection["fieldOrder"] = list(order)
    elif _is_str_list(legacy_visible):
        visible = [
            str(key).strip()
            for key in legacy_visible
            if str(key or "").strip() and str(key) not in OBJECT_VIEW_SYSTEM_FIELD_KEYS
        ]
        if visible:
            projection["fieldKeys"] = visible
            projection["fieldOrder"] = list(visible)

    legacy_info = legacy_projection.get("info_field_keys")
    existing_info = projection.get("infoFieldKeys")
    if _is_str_list(legacy_info) and legacy_info:
        field_key_set = {
            str(key).strip()
            for key in (projection.get("fieldKeys") or [])
            if str(key or "").strip()
        }
        normalized_legacy_info = [
            str(key).strip()
            for key in legacy_info
            if str(key or "").strip()
            and (not field_key_set or str(key).strip() in field_key_set)
        ]
        if normalized_legacy_info and not (
            isinstance(existing_info, list) and existing_info
        ):
            projection["infoFieldKeys"] = normalized_legacy_info

    object_view["projection"] = projection
    return object_view


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

    info_raw = projection.get("infoFieldKeys") or projection.get("info_field_keys") or []
    if isinstance(info_raw, list):
        projection["infoFieldKeys"] = [
            str(key).strip()
            for key in info_raw
            if str(key or "").strip() and str(key).strip() in seen
        ]
    else:
        projection["infoFieldKeys"] = []

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
            title_key = projection.get("titleFieldKey") or projection.get("title_field_key")
            table["columnOrder"] = _enforce_title_field_first_in_column_order(
                column_order,
                title_key if isinstance(title_key, str) else None,
            )
            presentation = dict(presentation)
            presentation["table"] = table
            object_view["presentation"] = presentation

    object_view["projection"] = projection
    return object_view


def merge_legacy_projection_field_keys(
    projection: dict[str, Any],
    *,
    ordered_non_system_field_keys: list[str],
) -> dict[str, Any]:
    """Append new object-type fields to legacy settings.projection (designer ViewsTab)."""
    projection = dict(projection)

    visible_raw = projection.get("visible_fields")
    order_raw = projection.get("field_order")

    visible_list = (
        [str(key) for key in visible_raw if str(key or "").strip()]
        if _is_str_list(visible_raw)
        else []
    )
    order_list = (
        [str(key) for key in order_raw if str(key or "").strip()]
        if _is_str_list(order_raw)
        else []
    )

    visible_set = {
        key
        for key in visible_list
        if key not in OBJECT_VIEW_SYSTEM_FIELD_KEYS
    }

    merged_order: list[str] = []
    order_seen: set[str] = set()

    for key in order_list:
        if key in OBJECT_VIEW_SYSTEM_FIELD_KEYS or key in order_seen:
            continue
        order_seen.add(key)
        merged_order.append(key)

    for key in ordered_non_system_field_keys:
        normalized = str(key or "").strip()
        if (
            not normalized
            or normalized in OBJECT_VIEW_SYSTEM_FIELD_KEYS
            or normalized in order_seen
        ):
            continue
        order_seen.add(normalized)
        merged_order.append(normalized)
        visible_set.add(normalized)

    projection["field_order"] = merged_order
    projection["visible_fields"] = [key for key in merged_order if key in visible_set]

    return projection


ROLE_MAPPING_LABELS_KEY = "labels"


def sanitize_role_mapping(
    role_mapping: dict[str, Any] | None,
    *,
    projection_field_keys: set[str] | None = None,
) -> dict[str, Any]:
    """Normalize roleMapping; optionally drop entries outside projection.fieldKeys."""
    if not isinstance(role_mapping, dict):
        return {}

    allowed = projection_field_keys or set()
    result: dict[str, Any] = {}

    for role, field_key in role_mapping.items():
        normalized_role = str(role or "").strip()
        if not normalized_role or normalized_role == ROLE_MAPPING_LABELS_KEY:
            continue
        if not isinstance(field_key, str):
            continue
        normalized_field = str(field_key or "").strip()
        if not normalized_field:
            continue
        if allowed and normalized_field not in allowed:
            continue
        result[normalized_role] = normalized_field

    labels_raw = role_mapping.get(ROLE_MAPPING_LABELS_KEY)
    if isinstance(labels_raw, dict):
        allowed_label_roles = set(PLAN_REQUIRED_ROLE_KEYS) | {"nextSteps"}
        labels: dict[str, str] = {}
        for role_key, label in labels_raw.items():
            normalized_role = str(role_key or "").strip()
            normalized_label = str(label or "").strip()
            if (
                not normalized_role
                or not normalized_label
                or normalized_role not in allowed_label_roles
            ):
                continue
            labels[normalized_role] = normalized_label
        if labels:
            result[ROLE_MAPPING_LABELS_KEY] = labels

    return result


def ensure_object_view_contract_scaffold(
    settings_json: dict[str, Any] | None,
    *,
    view_key: str,
    view_type: str,
) -> dict[str, Any]:
    """Ensure objectView scaffold with projection, query, roleMapping, presentation."""
    settings = dict(settings_json) if isinstance(settings_json, dict) else {}
    normalized_view_type = str(view_type or "table").strip().lower() or "table"

    object_view = settings.get("objectView")
    if not isinstance(object_view, dict):
        object_view = {
            "schemaVersion": OBJECT_VIEW_SCHEMA_VERSION,
            "key": view_key,
            "viewType": normalized_view_type,
        }

    object_view = dict(object_view)
    object_view.setdefault("schemaVersion", OBJECT_VIEW_SCHEMA_VERSION)
    object_view["key"] = str(object_view.get("key") or view_key)
    object_view["viewType"] = str(object_view.get("viewType") or normalized_view_type)

    projection = object_view.get("projection")
    if not isinstance(projection, dict):
        projection = {}
    else:
        projection = dict(projection)

    field_keys = projection.get("fieldKeys") or projection.get("field_keys") or []
    field_order = projection.get("fieldOrder") or projection.get("field_order") or field_keys
    projection.setdefault(
        "fieldKeys",
        [str(key) for key in field_keys if isinstance(key, str) and str(key).strip()],
    )
    projection.setdefault(
        "fieldOrder",
        [str(key) for key in field_order if isinstance(key, str) and str(key).strip()],
    )
    projection.setdefault("titleFieldKey", projection.get("titleFieldKey") or projection.get("title_field_key"))
    info_raw = projection.get("infoFieldKeys") or projection.get("info_field_keys") or []
    field_key_set = set(projection.get("fieldKeys") or [])
    if isinstance(info_raw, list):
        projection["infoFieldKeys"] = [
            str(key).strip()
            for key in info_raw
            if str(key or "").strip() and str(key).strip() in field_key_set
        ]
    else:
        projection["infoFieldKeys"] = []
    object_view["projection"] = projection

    if not isinstance(object_view.get("roleMapping"), dict):
        object_view["roleMapping"] = {}

    query = object_view.get("query")
    if not isinstance(query, dict):
        query = {}
    else:
        query = dict(query)

    filters = query.get("filters")
    if not isinstance(filters, dict):
        filters = {}
    else:
        filters = dict(filters)

    filters.setdefault("conditions", filters.get("conditions") or [])
    filters.setdefault("savedFilters", filters.get("savedFilters") or [])
    filters.setdefault("quickFilters", filters.get("quickFilters") or [])
    filters.setdefault("defaultQuickFilterId", filters.get("defaultQuickFilterId"))
    query["filters"] = filters

    sort = query.get("sort")
    if not isinstance(sort, dict):
        sort = {"rules": []}
    else:
        sort = dict(sort)
    sort.setdefault("rules", sort.get("rules") or [])
    query["sort"] = sort

    pagination = query.get("pagination")
    if not isinstance(pagination, dict):
        pagination = {"defaultPageSize": 20}
    else:
        pagination = dict(pagination)
    pagination.setdefault("defaultPageSize", pagination.get("defaultPageSize") or 20)
    query["pagination"] = pagination
    object_view["query"] = query

    presentation = object_view.get("presentation")
    if not isinstance(presentation, dict):
        presentation = {}
    else:
        presentation = dict(presentation)

    if normalized_view_type == "plan":
        plan = presentation.get("plan")
        if not isinstance(plan, dict):
            plan = {}
        presentation["plan"] = plan

    if normalized_view_type == "quick_form":
        quick_form = presentation.get("quickForm")
        if not isinstance(quick_form, dict):
            quick_form = {}
        presentation["quickForm"] = quick_form

    object_view["presentation"] = presentation
    settings["objectView"] = object_view

    return settings


def ensure_plan_object_view_scaffold(
    settings_json: dict[str, Any] | None,
    *,
    view_key: str,
    view_type: str,
) -> dict[str, Any]:
    """Ensure objectView contract scaffold (including plan presentation when applicable)."""
    return ensure_object_view_contract_scaffold(
        settings_json,
        view_key=view_key,
        view_type=view_type,
    )


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
    menu_in_tab_input = read_menu_in_tab_from_settings(settings)

    settings = ensure_object_view_contract_scaffold(
        settings,
        view_key=view_key,
        view_type=view_type,
    )

    object_view = settings.get("objectView")
    if isinstance(object_view, dict):
        presentation = object_view.get("presentation")
        if isinstance(presentation, dict):
            presentation = dict(presentation)
            table = presentation.get("table")
            if isinstance(table, dict):
                presentation["table"] = sanitize_presentation_table(
                    table,
                    field_keys=field_keys,
                )
            card = presentation.get("card")
            if isinstance(card, dict):
                sanitized_card = sanitize_presentation_card(
                    card,
                    field_keys=field_keys,
                )
                if sanitized_card is not None:
                    presentation["card"] = sanitized_card
            plan = presentation.get("plan")
            if isinstance(plan, dict):
                presentation["plan"] = sanitize_presentation_plan(
                    plan,
                    role_mapping=object_view.get("roleMapping"),
                    field_keys=field_keys,
                )
            elif str(view_type or "").strip().lower() == "plan":
                presentation["plan"] = sanitize_presentation_plan(
                    {},
                    role_mapping=object_view.get("roleMapping"),
                    field_keys=field_keys,
                )
            object_view = dict(object_view)
            object_view["presentation"] = presentation

        ordered_non_system = [
            str(key)
            for key in (ordered_field_keys or sorted(field_keys))
            if str(key or "").strip() and str(key) not in OBJECT_VIEW_SYSTEM_FIELD_KEYS
        ]
        legacy_projection = settings.get("projection")
        if isinstance(legacy_projection, dict):
            object_view = sync_object_view_projection_from_legacy(
                object_view,
                legacy_projection,
                field_keys=field_keys,
            )

        object_view = merge_object_view_projection_field_keys(
            object_view,
            ordered_non_system_field_keys=ordered_non_system,
        )

        projection_keys = set()
        projection_raw = object_view.get("projection")
        if isinstance(projection_raw, dict):
            for key in projection_raw.get("fieldKeys") or projection_raw.get("field_keys") or []:
                normalized = str(key or "").strip()
                if normalized:
                    projection_keys.add(normalized)

        object_view["roleMapping"] = sanitize_role_mapping(
            object_view.get("roleMapping"),
            projection_field_keys=projection_keys,
        )

        if str(view_type or "").strip().lower() == "plan":
            presentation = object_view.get("presentation")
            if isinstance(presentation, dict):
                presentation = dict(presentation)
                plan = presentation.get("plan")
                if isinstance(plan, dict):
                    presentation["plan"] = sanitize_presentation_plan(
                        plan,
                        role_mapping=object_view.get("roleMapping"),
                        field_keys=projection_keys,
                    )
                    object_view = dict(object_view)
                    object_view["presentation"] = presentation

        settings["objectView"] = object_view

        # objectView is the source of truth; projection is a compatibility snapshot.
        settings["projection"] = projection_from_object_view(object_view)

    projection = settings.get("projection")
    if isinstance(projection, dict):
        ordered_non_system = [
            str(key)
            for key in (ordered_field_keys or sorted(field_keys))
            if str(key or "").strip() and str(key) not in OBJECT_VIEW_SYSTEM_FIELD_KEYS
        ]

        if not isinstance(settings.get("objectView"), dict):
            projection = merge_legacy_projection_field_keys(
                projection,
                ordered_non_system_field_keys=ordered_non_system,
            )
        else:
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

    if menu_in_tab_input is not None:
        settings["tabSettings"] = {"menuInTab": bool(menu_in_tab_input)}

    return preserve_object_tab_settings(settings)


def preserve_object_tab_settings(settings: dict[str, Any]) -> dict[str, Any]:
    """Keep Object Tab Settings (menuInTab) through publish normalization."""
    result = dict(settings)
    menu_in_tab = read_menu_in_tab_from_settings(result)

    if menu_in_tab is None:
        return result

    result["tabSettings"] = {"menuInTab": bool(menu_in_tab)}
    return result


def read_menu_in_tab_from_settings(settings: dict[str, Any] | None) -> bool | None:
    if not isinstance(settings, dict):
        return None

    raw = settings.get("tabSettings")
    if not isinstance(raw, dict):
        raw = settings.get("objectTabSettings")
    if not isinstance(raw, dict):
        raw = settings.get("tab_settings")
    if not isinstance(raw, dict):
        return None

    if "menuInTab" in raw:
        return bool(raw["menuInTab"])
    if "menu_in_tab" in raw:
        return bool(raw["menu_in_tab"])

    return None


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

    projection_raw = object_view.get("projection")
    projection_field_keys: set[str] = set()
    if isinstance(projection_raw, dict):
        for key in projection_raw.get("fieldKeys") or projection_raw.get("field_keys") or []:
            normalized = str(key or "").strip()
            if normalized and normalized not in OBJECT_VIEW_SYSTEM_FIELD_KEYS:
                if field_keys and normalized not in field_keys:
                    issues.append(
                        (
                            "object_view_unknown_projection_field",
                            f"projection.fieldKeys ссылается на неизвестное поле '{normalized}'",
                        ),
                    )
                projection_field_keys.add(normalized)

    role_mapping_raw = object_view.get("roleMapping")
    if isinstance(role_mapping_raw, dict):
        for role, mapped_field in role_mapping_raw.items():
            normalized_role = str(role or "").strip()
            if not normalized_role or normalized_role == ROLE_MAPPING_LABELS_KEY:
                continue
            if not isinstance(mapped_field, str):
                continue
            normalized_field = str(mapped_field or "").strip()
            if not normalized_field:
                continue
            if projection_field_keys and normalized_field not in projection_field_keys:
                issues.append(
                    (
                        "object_view_role_mapping_field_not_in_projection",
                        (
                            f"roleMapping.{normalized_role} ссылается на поле "
                            f"'{normalized_field}', которое отсутствует в projection.fieldKeys"
                        ),
                    ),
                )
            elif field_keys and normalized_field not in field_keys:
                issues.append(
                    (
                        "object_view_role_mapping_unknown_field",
                        f"roleMapping.{normalized_role} ссылается на неизвестное поле '{normalized_field}'",
                    ),
                )

    return issues
