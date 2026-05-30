from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.navigation.models import NavigationItem
from app.modules.navigation.schemas import NavigationItemResponse, NavigationTreeItem

OBJECT_TYPE_NAV_TYPE = "object_type"
METADATA_FIELDS_BLOCKED_ON_OBJECT_TYPE = frozenset(
    {"title", "icon", "icon_type", "icon_file_url", "color"},
)


def is_object_type_navigation_item(item: NavigationItem) -> bool:
    return item.type == OBJECT_TYPE_NAV_TYPE or item.object_type_id is not None


def strip_object_type_metadata_updates(update_data: dict) -> dict:
    if not update_data:
        return update_data
    return {
        key: value
        for key, value in update_data.items()
        if key not in METADATA_FIELDS_BLOCKED_ON_OBJECT_TYPE
    }


def load_object_types_map(
    db: Session,
    object_type_ids: set[UUID],
) -> dict[UUID, DesignerObjectType]:
    if not object_type_ids:
        return {}

    rows = (
        db.query(DesignerObjectType)
        .filter(DesignerObjectType.id.in_(object_type_ids))
        .filter(DesignerObjectType.deleted_at.is_(None))
        .all()
    )
    return {row.id: row for row in rows}


def enrich_navigation_item(
    item: NavigationItem,
    object_types_by_id: dict[UUID, DesignerObjectType],
) -> NavigationItemResponse:
    payload = NavigationItemResponse.model_validate(item)

    if item.object_type_id and item.object_type_id in object_types_by_id:
        object_type = object_types_by_id[item.object_type_id]
        payload.display_title = object_type.name
        payload.display_icon_type = object_type.icon_type
        payload.display_icon_file_url = object_type.icon_file_url
        payload.display_color = object_type.color

    return payload


def collect_object_type_ids(items: list[NavigationItem]) -> set[UUID]:
    ids: set[UUID] = set()
    for item in items:
        if item.object_type_id:
            ids.add(item.object_type_id)
    return ids


def enrich_navigation_list(
    db: Session,
    items: list[NavigationItem],
) -> list[NavigationItemResponse]:
    object_types_by_id = load_object_types_map(db, collect_object_type_ids(items))
    return [enrich_navigation_item(item, object_types_by_id) for item in items]


def enrich_navigation_tree(
    db: Session,
    tree: list[NavigationItem],
) -> list[NavigationTreeItem]:
    flat_items: list[NavigationItem] = []

    def walk(nodes: list[NavigationItem]) -> None:
        for node in nodes:
            flat_items.append(node)
            if getattr(node, "children", None):
                walk(node.children)

    walk(tree)
    object_types_by_id = load_object_types_map(db, collect_object_type_ids(flat_items))

    def map_node(node: NavigationItem) -> NavigationTreeItem:
        enriched = enrich_navigation_item(node, object_types_by_id)
        children = getattr(node, "children", None) or []
        return NavigationTreeItem(
            **enriched.model_dump(),
            children=[map_node(child) for child in children],
        )

    return [map_node(node) for node in tree]
