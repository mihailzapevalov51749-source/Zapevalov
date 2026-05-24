from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.checklists.models import ChecklistItem


def get_checklist_items(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
):
    query = (
        select(ChecklistItem)
        .where(ChecklistItem.entity_type == entity_type)
        .where(ChecklistItem.entity_id == entity_id)
        .order_by(ChecklistItem.position.asc())
    )

    return db.scalars(query).all()


def create_checklist_item(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
    title: str,
    created_by_id: int | None,
    position: int | None = None,
):
    if position is None:
        max_position_query = (
            select(func.max(ChecklistItem.position))
            .where(ChecklistItem.entity_type == entity_type)
            .where(ChecklistItem.entity_id == entity_id)
        )

        max_position = db.scalar(max_position_query)

        position = (max_position or 0) + 1

    item = ChecklistItem(
        entity_type=entity_type,
        entity_id=entity_id,
        title=title,
        position=position,
        created_by_id=created_by_id,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


def get_checklist_item_by_id(
    db: Session,
    *,
    item_id: int,
):
    query = select(ChecklistItem).where(
        ChecklistItem.id == item_id
    )

    return db.scalar(query)


def update_checklist_item(
    db: Session,
    *,
    item: ChecklistItem,
    title: str | None = None,
    is_completed: bool | None = None,
    position: int | None = None,
    completed_by_id: int | None = None,
):
    if title is not None:
        item.title = title

    if position is not None:
        item.position = position

    if is_completed is not None:
        item.is_completed = is_completed

        if is_completed:
            item.completed_at = datetime.utcnow()
            item.completed_by_id = completed_by_id
        else:
            item.completed_at = None
            item.completed_by_id = None

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


def reorder_checklist_items(
    db: Session,
    *,
    ordered_ids: list[int],
):
    if not ordered_ids:
        return

    query = select(ChecklistItem).where(
        ChecklistItem.id.in_(ordered_ids)
    )

    items = db.scalars(query).all()

    items_map = {
        item.id: item
        for item in items
    }

    for index, item_id in enumerate(ordered_ids):
        item = items_map.get(item_id)

        if not item:
            continue

        item.position = index + 1

        db.add(item)

    db.commit()


def delete_checklist_item(
    db: Session,
    *,
    item: ChecklistItem,
):
    db.delete(item)
    db.commit()


def build_checklist_response(
    *,
    entity_type: str,
    entity_id: str,
    items: list[ChecklistItem],
):
    total = len(items)

    completed = len(
        [
            item
            for item in items
            if item.is_completed
        ]
    )

    progress = 0

    if total > 0:
        progress = round(
            (completed / total) * 100,
            2,
        )

    return {
        "entity": {
            "type": entity_type,
            "id": entity_id,
        },
        "items": items,
        "total": total,
        "completed": completed,
        "progress": progress,
    }