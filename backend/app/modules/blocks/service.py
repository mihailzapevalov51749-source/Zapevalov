from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import repository
from .legacy_guard import (
    LEGACY_STORAGE_CREATION_ERROR_CODE,
    get_legacy_storage_creation_error_message,
    is_legacy_storage_block_type,
)


def create_block(db: Session, data):
    if is_legacy_storage_block_type(data.type):
        raise HTTPException(
            status_code=422,
            detail={
                "code": LEGACY_STORAGE_CREATION_ERROR_CODE,
                "message": get_legacy_storage_creation_error_message(),
            },
        )

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
