from sqlalchemy.orm import Session
from . import repository


def create_block(db: Session, data):
    return repository.create_block(db, data)


def get_blocks_by_section(db: Session, section_id: int):
    return repository.get_blocks_by_section(db, section_id)


def get_blocks_by_sections(db: Session, section_ids: list[int]):
    return repository.get_blocks_by_sections(db, section_ids)


def get_block(db: Session, block_id: int):
    return repository.get_block(db, block_id)


def update_block(db: Session, block_id: int, data):
    return repository.update_block(db, block_id, data)


def delete_block(db: Session, block_id: int):
    return repository.delete_block(db, block_id)


def move_blocks(db: Session, items):
    return repository.move_blocks(db, items)