from sqlalchemy.orm import Session

from . import repository
from app.modules.sections import repository as sections_repo
from app.modules.blocks import repository as blocks_repo


def create_page(db: Session, data):
    return repository.create_page(db, data)


def get_pages_by_portal(db: Session, portal_id: int):
    return repository.get_pages_by_portal(db, portal_id)


def get_page(db: Session, page_id: int):
    return repository.get_page(db, page_id)


def update_page(db: Session, page_id: int, data):
    return repository.update_page(db, page_id, data)


def delete_page(db: Session, page_id: int):
    return repository.delete_page(db, page_id)


# ===== НОВОЕ =====

def get_page_full(db: Session, page_id: int):
    page = repository.get_page(db, page_id)

    if not page:
        return None

    # получаем разделы
    sections = sections_repo.get_sections_by_page(db, page_id)

    section_ids = [s.id for s in sections]

    # получаем все блоки разом
    blocks = blocks_repo.get_blocks_by_sections(db, section_ids) if section_ids else []

    # группируем блоки по section_id
    blocks_map = {}
    for block in blocks:
        blocks_map.setdefault(block.section_id, []).append(block)

    # собираем итоговую структуру
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