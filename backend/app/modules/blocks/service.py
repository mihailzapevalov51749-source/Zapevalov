from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.pages.tenant_access import (
    assert_section_id_belongs_to_portal,
    assert_section_ids_belong_to_portal,
    get_block_for_portal,
)

from . import repository
from .legacy_guard import (
    LEGACY_STORAGE_CREATION_ERROR_CODE,
    get_legacy_storage_creation_error_message,
    is_legacy_storage_block_type,
)


def create_block(db: Session, data, *, portal_id: int):
    if is_legacy_storage_block_type(data.type):
        raise HTTPException(
            status_code=422,
            detail={
                "code": LEGACY_STORAGE_CREATION_ERROR_CODE,
                "message": get_legacy_storage_creation_error_message(),
            },
        )

    assert_section_id_belongs_to_portal(db, data.section_id, portal_id)
    return repository.create_block(db, data)


def get_blocks_by_section(db: Session, section_id: int, *, portal_id: int):
    assert_section_id_belongs_to_portal(db, section_id, portal_id)
    return repository.get_blocks_by_section(db, section_id)


def get_blocks_by_sections(db: Session, section_ids: list[int], *, portal_id: int):
    assert_section_ids_belong_to_portal(db, section_ids, portal_id)
    return repository.get_blocks_by_sections(db, section_ids)


def get_block(db: Session, block_id: int, *, portal_id: int):
    return get_block_for_portal(db, block_id, portal_id)


def update_block(db: Session, block_id: int, data, *, portal_id: int):
    block = get_block_for_portal(db, block_id, portal_id)
    if not block:
        return None

    update_data = data.model_dump(exclude_unset=True)
    if "section_id" in update_data and update_data["section_id"] is not None:
        assert_section_id_belongs_to_portal(db, int(update_data["section_id"]), portal_id)

    return repository.update_block(db, block_id, data)


def delete_block(db: Session, block_id: int, *, portal_id: int):
    block = get_block_for_portal(db, block_id, portal_id)
    if not block:
        return None
    return repository.delete_block(db, block_id)


def move_blocks(db: Session, items, *, portal_id: int):
    if not items:
        return []

    for item in items:
        assert_section_id_belongs_to_portal(db, item.section_id, portal_id)
        block = get_block_for_portal(db, item.id, portal_id)
        if block is None:
            continue

    return repository.move_blocks(db, items)
