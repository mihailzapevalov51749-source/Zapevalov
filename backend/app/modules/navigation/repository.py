from sqlalchemy.orm import Session
from typing import Optional

from app.modules.platform.designer.shared.soft_delete import apply_soft_delete

from .models import NavigationItem
from .runtime_protected_pages import apply_runtime_protected_nav_flags


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
    apply_runtime_protected_nav_flags(item)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_items_by_portal(db: Session, portal_id: int, menu_scope: Optional[str] = None):
    query = db.query(NavigationItem).filter(
        NavigationItem.portal_id == portal_id,
        NavigationItem.deleted_at.is_(None),
    )

    if menu_scope:
        query = query.filter(NavigationItem.menu_scope == menu_scope)

    return query.order_by(NavigationItem.sort_order.asc()).all()


def get_item(db: Session, item_id: int, *, include_deleted: bool = False):
    query = db.query(NavigationItem).filter(NavigationItem.id == item_id)

    if not include_deleted:
        query = query.filter(NavigationItem.deleted_at.is_(None))

    return query.first()


def get_item_for_portal(
    db: Session,
    item_id: int,
    portal_id: int,
    *,
    include_deleted: bool = False,
):
    from app.modules.navigation.tenant_access import get_navigation_item_for_portal

    return get_navigation_item_for_portal(
        db,
        item_id,
        portal_id,
        include_deleted=include_deleted,
    )


def count_active_children(db: Session, item_id: int) -> int:
    return (
        db.query(NavigationItem)
        .filter(
            NavigationItem.parent_id == item_id,
            NavigationItem.deleted_at.is_(None),
        )
        .count()
    )


def update_item(db: Session, item_id: int, portal_id: int, data):
    item = get_item_for_portal(db, item_id, portal_id)

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

    apply_runtime_protected_nav_flags(item)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: int, portal_id: int, *, deleted_by: int | None = None):
    item = get_item_for_portal(db, item_id, portal_id, include_deleted=True)

    if not item or item.deleted_at is not None:
        return None

    apply_soft_delete(item, deleted_by=deleted_by)
    db.commit()
    db.refresh(item)
    return item


def move_items(db: Session, portal_id: int, items):
    updated = []

    for item_data in items:
        item = get_item_for_portal(db, item_data.id, portal_id)
        if not item:
            continue

        if item_data.parent_id is not None:
            parent = get_item_for_portal(db, item_data.parent_id, portal_id)
            if not parent:
                continue

        item.parent_id = item_data.parent_id
        item.sort_order = item_data.sort_order
        updated.append(item)

    db.commit()

    for item in updated:
        db.refresh(item)

    return updated