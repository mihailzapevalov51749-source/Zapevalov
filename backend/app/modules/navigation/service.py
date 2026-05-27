from sqlalchemy.orm import Session
from typing import Optional
from . import repository
from .models import NavigationItem


DESIGNER_SYSTEM_ITEMS = [
    {
        "system_key": "designer.objects",
        "title": "Объекты",
        "route": "/designer/tenant/{tenant_id}/object-types",
        "sort_order": 0,
    },
    {
        "system_key": "designer.relations",
        "title": "Связи",
        "route": "/designer/tenant/{tenant_id}/relations",
        "sort_order": 1,
    },
    {
        "system_key": "designer.views",
        "title": "Представления",
        "route": "/designer/tenant/{tenant_id}/views",
        "sort_order": 2,
    },
    {
        "system_key": "designer.users",
        "title": "Пользователи",
        "route": "/designer/tenant/{tenant_id}/users",
        "sort_order": 3,
    },
    {
        "system_key": "designer.settings",
        "title": "Системные настройки",
        "route": "/designer/tenant/{tenant_id}/settings",
        "sort_order": 4,
    },
]


def sort_items(items):
    return sorted(
        items,
        key=lambda item: (
            0 if item.title and item.title.lower() == "главная страница" else 1,
            item.sort_order or 0,
            item.id or 0,
        )
    )


def build_tree(items):
    items = sort_items(items)

    item_map = {item.id: item for item in items}
    tree = []

    for item in items:
        item.children = []

    for item in items:
        if item.parent_id and item.parent_id in item_map:
            parent = item_map[item.parent_id]
            parent.children.append(item)
            parent.children = sort_items(parent.children)
        else:
            tree.append(item)

    return sort_items(tree)


def create_item(db: Session, data):
    return repository.create_item(db, data)


def ensure_designer_system_items(db: Session, portal_id: int):
    existing_items = repository.get_items_by_portal(db, portal_id, "designer")
    existing_by_key = {
        item.system_key: item
        for item in existing_items
        if item.system_key
    }

    changed = False
    for definition in DESIGNER_SYSTEM_ITEMS:
        route = definition["route"].format(tenant_id=portal_id)
        existing = existing_by_key.get(definition["system_key"])

        if existing:
            if (
                existing.menu_scope != "designer"
                or existing.type != "system_page"
                or existing.url != route
                or existing.is_system is not True
                or existing.is_protected is not True
            ):
                existing.menu_scope = "designer"
                existing.type = "system_page"
                existing.url = route
                existing.is_system = True
                existing.is_protected = True
                changed = True
            continue

        db.add(
            NavigationItem(
                portal_id=portal_id,
                parent_id=None,
                type="system_page",
                title=definition["title"],
                url=route,
                sort_order=definition["sort_order"],
                is_visible=True,
                icon=None,
                icon_type=None,
                icon_file_url=None,
                color=None,
                is_bold=False,
                is_italic=False,
                menu_scope="designer",
                system_key=definition["system_key"],
                is_system=True,
                is_protected=True,
            )
        )
        changed = True

    if changed:
        db.commit()


def get_navigation_tree(db: Session, portal_id: int, menu_scope: Optional[str] = None):
    if menu_scope == "designer":
        ensure_designer_system_items(db, portal_id)
    items = repository.get_items_by_portal(db, portal_id, menu_scope)
    return build_tree(items)


def get_navigation_list(db: Session, portal_id: int, menu_scope: Optional[str] = None):
    if menu_scope == "designer":
        ensure_designer_system_items(db, portal_id)
    return repository.get_items_by_portal(db, portal_id, menu_scope)


def update_item(db: Session, item_id: int, data):
    return repository.update_item(db, item_id, data)


def delete_item(db: Session, item_id: int):
    item = repository.get_item(db, item_id)
    if not item:
        return None
    if item.is_protected:
        raise ValueError("Системный пункт меню защищён от удаления")
    return repository.delete_item(db, item_id)


def move_items(db: Session, items):
    return repository.move_items(db, items)