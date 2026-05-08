from sqlalchemy.orm import Session
from .models import Page


def create_page(db: Session, data):
    page = Page(**data.model_dump())
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


def get_pages_by_portal(db: Session, portal_id: int):
    return (
        db.query(Page)
        .filter(Page.portal_id == portal_id)
        .order_by(Page.sort_order.asc(), Page.id.asc())
        .all()
    )


def get_page(db: Session, page_id: int):
    return db.query(Page).filter(Page.id == page_id).first()


def update_page(db: Session, page_id: int, data):
    page = get_page(db, page_id)

    if not page:
        return None

    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(page, key, value)

    db.commit()
    db.refresh(page)
    return page


def delete_page(db: Session, page_id: int):
    page = get_page(db, page_id)

    if not page:
        return None

    db.delete(page)
    db.commit()
    return page