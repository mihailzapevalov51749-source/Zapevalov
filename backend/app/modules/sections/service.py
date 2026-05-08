from sqlalchemy.orm import Session
from . import repository


def create_section(db: Session, data):
    return repository.create_section(db, data)


def get_sections_by_page(db: Session, page_id: int):
    return repository.get_sections_by_page(db, page_id)


def get_section(db: Session, section_id: int):
    return repository.get_section(db, section_id)


def update_section(db: Session, section_id: int, data):
    return repository.update_section(db, section_id, data)


def delete_section(db: Session, section_id: int):
    return repository.delete_section(db, section_id)


def move_sections(db: Session, items):
    return repository.move_sections(db, items)