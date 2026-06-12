from sqlalchemy.orm import Session

from app.modules.pages.tenant_access import (
    assert_page_id_belongs_to_portal,
    assert_section_id_belongs_to_portal,
    get_section_for_portal,
)

from . import repository


def create_section(db: Session, data, *, portal_id: int):
    assert_page_id_belongs_to_portal(db, data.page_id, portal_id)
    return repository.create_section(db, data)


def get_sections_by_page(db: Session, page_id: int, *, portal_id: int):
    assert_page_id_belongs_to_portal(db, page_id, portal_id)
    return repository.get_sections_by_page(db, page_id)


def get_section(db: Session, section_id: int, *, portal_id: int):
    return get_section_for_portal(db, section_id, portal_id)


def update_section(db: Session, section_id: int, data, *, portal_id: int):
    section = get_section_for_portal(db, section_id, portal_id)
    if not section:
        return None
    return repository.update_section(db, section_id, data)


def delete_section(db: Session, section_id: int, *, portal_id: int):
    section = get_section_for_portal(db, section_id, portal_id)
    if not section:
        return None
    return repository.delete_section(db, section_id)


def move_sections(db: Session, items, *, portal_id: int):
    if not items:
        return []

    for item in items:
        assert_section_id_belongs_to_portal(db, item.id, portal_id)

    return repository.move_sections(db, items)
