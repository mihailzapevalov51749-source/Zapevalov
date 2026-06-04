from typing import Any

from app.modules.platform.designer.publish.object_view_contract import (
    projection_from_object_view,
)


def resolve_title_field_key_from_object_type(object_type: dict[str, Any]) -> str | None:
    views = object_type.get("views") or []
    if not isinstance(views, list) or not views:
        return None

    selected = next(
        (view for view in views if isinstance(view, dict) and view.get("is_default")),
        None,
    )
    if not selected:
        selected = views[0] if isinstance(views[0], dict) else None

    if not selected:
        return None

    settings_json = selected.get("settings_json") or {}
    if not isinstance(settings_json, dict):
        settings_json = {}

    projection = settings_json.get("projection")
    if not isinstance(projection, dict):
        object_view = settings_json.get("objectView")
        if isinstance(object_view, dict):
            projection = projection_from_object_view(object_view)
        else:
            projection = {}

    if not isinstance(projection, dict):
        return None

    title_field = projection.get("title_field") or projection.get("titleFieldKey")
    if isinstance(title_field, str) and title_field.strip():
        return title_field.strip()

    visible_fields = projection.get("visible_fields") or projection.get("fieldKeys")
    if isinstance(visible_fields, list):
        for item in visible_fields:
            if isinstance(item, str) and item.strip():
                return item.strip()

    return None
