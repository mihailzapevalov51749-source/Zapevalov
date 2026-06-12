from sqlalchemy.orm import Session

from app.modules.platform.designer.shared.soft_delete import apply_soft_delete

from .models import Page
from .protected_pages import assert_page_deletion_allowed


def create_page(db: Session, data):
    page = Page(**data.model_dump())
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


def get_pages_by_portal(db: Session, portal_id: int):
    return (
        db.query(Page)
        .filter(Page.portal_id == portal_id, Page.deleted_at.is_(None))
        .order_by(Page.sort_order.asc(), Page.id.asc())
        .all()
    )


def get_page(db: Session, page_id: int):
    return db.query(Page).filter(Page.id == page_id).first()


def get_active_page(db: Session, page_id: int):
    """Страница для runtime и публичных сценариев — без soft-deleted."""
    return (
        db.query(Page)
        .filter(Page.id == page_id, Page.deleted_at.is_(None))
        .first()
    )


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


def delete_page(db: Session, page_id: int, *, deleted_by: int | None = None):
    page = get_page(db, page_id)

    if not page or page.deleted_at is not None:
        return None

    assert_page_deletion_allowed(db, tenant_id=int(page.portal_id), page=page, hard_delete=False)

    apply_soft_delete(page, deleted_by=deleted_by)
    db.commit()
    db.refresh(page)
    return page