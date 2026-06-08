from sqlalchemy.orm import Session

from app.modules.platform.runtime.actions.resolver import resolve_actions_for_placement
from app.modules.platform.runtime.actions.schemas import PublishedRuntimeAction
from app.modules.platform.runtime.catalog import repository as catalog_repository


def get_actions_for_placement(
    db: Session,
    tenant_id: int,
    object_type_key: str,
    placement_key: str,
) -> list[PublishedRuntimeAction]:
    """Return published runtime actions for an object type and placement key."""
    snapshot = catalog_repository.get_latest_snapshot(db, tenant_id)
    if not snapshot:
        return []

    payload = snapshot.payload or {}
    normalized_object_type_key = str(object_type_key or "").strip()
    if not normalized_object_type_key:
        return []

    for object_type in payload.get("object_types", []):
        if not isinstance(object_type, dict):
            continue
        if object_type.get("key") != normalized_object_type_key:
            continue

        actions = object_type.get("actions", [])
        if not isinstance(actions, list):
            return []

        return resolve_actions_for_placement(actions, placement_key)

    return []
