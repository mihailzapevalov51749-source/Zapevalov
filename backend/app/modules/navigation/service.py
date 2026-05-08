from sqlalchemy.orm import Session
from . import repository


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


def get_navigation_tree(db: Session, portal_id: int):
    items = repository.get_items_by_portal(db, portal_id)
    return build_tree(items)


def get_navigation_list(db: Session, portal_id: int):
    return repository.get_items_by_portal(db, portal_id)


def update_item(db: Session, item_id: int, data):
    return repository.update_item(db, item_id, data)


def delete_item(db: Session, item_id: int):
    return repository.delete_item(db, item_id)


def move_items(db: Session, items):
    return repository.move_items(db, items)