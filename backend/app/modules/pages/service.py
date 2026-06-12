from sqlalchemy.orm import Session

from . import repository
from .runtime_access import assert_page_office_runtime_access
from .tenant_access import (
    assert_portal_id_matches_expected,
    get_page_for_portal,
    get_page_for_portal_any_state,
)
from app.modules.sections import repository as sections_repo
from app.modules.blocks import repository as blocks_repo


def create_page(db: Session, data, *, portal_id: int):
    assert_portal_id_matches_expected(int(data.portal_id), portal_id)
    return repository.create_page(db, data)


def get_pages_by_portal(db: Session, portal_id: int, *, request_portal_id: int):
    assert_portal_id_matches_expected(request_portal_id, portal_id)
    return repository.get_pages_by_portal(db, portal_id)


def get_page(db: Session, page_id: int, *, portal_id: int):
    return get_page_for_portal_any_state(db, page_id, portal_id)


def update_page(db: Session, page_id: int, data, *, portal_id: int):
    page = get_page_for_portal_any_state(db, page_id, portal_id)
    if not page:
        return None
    return repository.update_page(db, page_id, data)


def delete_page(
    db: Session,
    page_id: int,
    *,
    portal_id: int,
    deleted_by: int | None = None,
):
    page = get_page_for_portal_any_state(db, page_id, portal_id)
    if not page:
        return None
    return repository.delete_page(db, page_id, deleted_by=deleted_by)


def get_page_full(db: Session, page_id: int, *, portal_id: int, office_access: bool = False):
    page = get_page_for_portal(db, page_id, portal_id)
    if not page:
        return None

    if office_access:
        assert_page_office_runtime_access(page.status)

    sections = sections_repo.get_sections_by_page(db, page_id)

    section_ids = [s.id for s in sections]

    blocks = blocks_repo.get_blocks_by_sections(db, section_ids) if section_ids else []

    blocks_map = {}
    for block in blocks:
        blocks_map.setdefault(block.section_id, []).append(block)

    result_sections = []
    for section in sections:
        result_sections.append({
            "section": section,
            "blocks": blocks_map.get(section.id, [])
        })

    return {
        "page": page,
        "sections": result_sections
    }
