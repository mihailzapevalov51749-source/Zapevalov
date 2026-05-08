from sqlalchemy.orm import Session
from .models import NavigationItem


def create_item(db: Session, data):
    item = NavigationItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_items_by_portal(db: Session, portal_id: int):
    return (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == portal_id)
        .order_by(NavigationItem.sort_order.asc())
        .all()
    )


def get_item(db: Session, item_id: int):
    return db.query(NavigationItem).filter(NavigationItem.id == item_id).first()


def update_item(db: Session, item_id: int, data):
    item = get_item(db, item_id)

    if not item:
        return None

    update_data = data.model_dump(exclude_unset=True)

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