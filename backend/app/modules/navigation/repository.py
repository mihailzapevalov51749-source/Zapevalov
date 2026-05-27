from sqlalchemy.orm import Session
from typing import Optional
from .models import NavigationItem


def create_item(db: Session, data):
    payload = data.model_dump()
    payload["url"] = payload.get("route") or payload.get("path") or payload.get("url")
    payload["menu_scope"] = (
        payload.get("menu_scope")
        or payload.get("scope")
        or payload.get("mode")
        or payload.get("context")
        or "runtime"
    )
    payload.pop("scope", None)
    payload.pop("mode", None)
    payload.pop("context", None)
    payload.pop("route", None)
    payload.pop("path", None)

    item = NavigationItem(**payload)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_items_by_portal(db: Session, portal_id: int, menu_scope: Optional[str] = None):
    query = db.query(NavigationItem).filter(NavigationItem.portal_id == portal_id)

    if menu_scope:
        query = query.filter(NavigationItem.menu_scope == menu_scope)

    return query.order_by(NavigationItem.sort_order.asc()).all()


def get_item(db: Session, item_id: int):
    return db.query(NavigationItem).filter(NavigationItem.id == item_id).first()


def update_item(db: Session, item_id: int, data):
    item = get_item(db, item_id)

    if not item:
        return None

    update_data = data.model_dump(exclude_unset=True)
    if "route" in update_data or "path" in update_data:
        update_data["url"] = (
            update_data.get("route")
            or update_data.get("path")
            or update_data.get("url")
        )
        update_data.pop("route", None)
        update_data.pop("path", None)

    for key, value in update_data.items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: int):
    item = get_item(db, item_id)

    if not item:
        return None

    db.delete(item)
    db.commit()
    return item


def move_items(db: Session, items):
    updated = []

    for item_data in items:
        item = get_item(db, item_data.id)
        if item:
            item.parent_id = item_data.parent_id
            item.sort_order = item_data.sort_order
            updated.append(item)

    db.commit()

    for item in updated:
        db.refresh(item)

    return updated