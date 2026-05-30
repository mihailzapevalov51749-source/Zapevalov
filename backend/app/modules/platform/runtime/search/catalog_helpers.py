from typing import Any
from uuid import UUID

from app.modules.platform.runtime.catalog import repository as catalog_repository


def load_catalog_object_types(db, tenant_id: int) -> list[dict[str, Any]]:
    snapshot = catalog_repository.get_latest_snapshot(db, tenant_id)
    if not snapshot:
        return []

    payload = snapshot.payload or {}
    object_types = payload.get("object_types") or []
    if not isinstance(object_types, list):
        return []

    return [ot for ot in object_types if isinstance(ot, dict)]


def resolve_title_field(object_type_payload: dict[str, Any]) -> str | None:
    views_payload = object_type_payload.get("views") or []
    if not isinstance(views_payload, list):
        views_payload = []

    selected_view = None
    default_candidates = [
        view
        for view in views_payload
        if isinstance(view, dict) and view.get("is_active", True) and view.get("is_default")
    ]
    if default_candidates:
        selected_view = default_candidates[0]
    else:
        for view in views_payload:
            if isinstance(view, dict) and view.get("is_active", True):
                selected_view = view
                break
        if not selected_view and views_payload:
            selected_view = views_payload[0] if isinstance(views_payload[0], dict) else None

    field_keys = [
        field.get("key")
        for field in (object_type_payload.get("fields") or [])
        if isinstance(field, dict) and field.get("key")
    ]

    if not selected_view:
        for candidate in ("title", "name"):
            if candidate in field_keys:
                return candidate
        return field_keys[0] if field_keys else None

    view_settings = selected_view.get("settings_json") or {}
    if not isinstance(view_settings, dict):
        view_settings = {}

    projection = view_settings.get("projection")
    if not isinstance(projection, dict):
        projection = {}

    title_field = projection.get("title_field")
    if isinstance(title_field, str) and title_field.strip():
        return title_field.strip()

    visible_fields = projection.get("visible_fields")
    if isinstance(visible_fields, list):
        for item in visible_fields:
            if isinstance(item, str) and item.strip():
                return item.strip()

    for candidate in ("title", "name"):
        if candidate in field_keys:
            return candidate

    return field_keys[0] if field_keys else None


def resolve_object_type_from_params(
    object_types: list[dict[str, Any]],
    params: dict[str, Any],
) -> dict[str, Any] | None:
    object_type_id = params.get("objectTypeId") or params.get("object_type_id")
    object_type_key = params.get("objectTypeKey") or params.get("object_type_key")

    object_type_id_str = str(object_type_id).strip() if object_type_id not in (None, "") else ""
    object_type_key_str = (
        str(object_type_key).strip() if object_type_key not in (None, "") else ""
    )

    for object_type in object_types:
        raw_id = object_type.get("id")
        raw_key = object_type.get("key")
        if object_type_id_str and raw_id and str(raw_id) == object_type_id_str:
            return object_type
        if object_type_key_str and raw_key and str(raw_key) == object_type_key_str:
            return object_type

    return None


def object_type_uuid(object_type_payload: dict[str, Any]) -> UUID | None:
    raw_id = object_type_payload.get("id")
    if not raw_id:
        return None
    try:
        return UUID(str(raw_id))
    except ValueError:
        return None
