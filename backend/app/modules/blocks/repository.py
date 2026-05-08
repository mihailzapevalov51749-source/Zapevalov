import json

from sqlalchemy import text
from sqlalchemy.orm import Session

from .models import Block


def create_block(db: Session, data):
    block = Block(**data.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block


def get_blocks_by_section(db: Session, section_id: int):
    return (
        db.query(Block)
        .filter(Block.section_id == section_id)
        .order_by(Block.sort_order.asc(), Block.id.asc())
        .all()
    )


def get_blocks_by_sections(db: Session, section_ids: list[int]):
    return (
        db.query(Block)
        .filter(Block.section_id.in_(section_ids))
        .order_by(Block.section_id.asc(), Block.sort_order.asc(), Block.id.asc())
        .all()
    )


def get_block(db: Session, block_id: int):
    return db.query(Block).filter(Block.id == block_id).first()


def update_block(db: Session, block_id: int, data):
    block = get_block(db, block_id)

    if not block:
        return None

    update_data = data.model_dump(exclude_unset=True)

    print("BLOCK UPDATE DATA:", update_data)

    normal_fields = {}

    for key, value in update_data.items():
        if key != "settings":
            normal_fields[key] = value

    if normal_fields:
        db.query(Block).filter(Block.id == block_id).update(normal_fields)

    if "settings" in update_data:
        incoming_settings = update_data.get("settings") or {}

        current_settings = dict(block.settings or {})
        current_settings.update(incoming_settings)

        print("FINAL BLOCK SETTINGS TO SAVE:", current_settings)

        db.execute(
            text(
                """
                UPDATE blocks
                SET settings = CAST(:settings AS JSON)
                WHERE id = :block_id
                """
            ),
            {
                "settings": json.dumps(current_settings),
                "block_id": block_id,
            },
        )

    db.commit()
    db.expire_all()

    saved_block = get_block(db, block_id)

    print("SAVED BLOCK SETTINGS:", saved_block.settings)

    return saved_block


def delete_block(db: Session, block_id: int):
    block = get_block(db, block_id)

    if not block:
        return None

    section_id = block.section_id

    db.delete(block)
    db.commit()

    normalize_section_blocks(db, section_id)

    return block


def move_blocks(db: Session, items):
    if not items:
        return []

    item = items[0]

    moved_block = get_block(db, item.id)

    if not moved_block:
        return []

    source_section_id = moved_block.section_id
    target_section_id = item.section_id
    target_index = max(0, item.sort_order)

    source_blocks = (
        db.query(Block)
        .filter(Block.section_id == source_section_id)
        .filter(Block.id != moved_block.id)
        .order_by(Block.sort_order.asc(), Block.id.asc())
        .all()
    )

    target_blocks = (
        db.query(Block)
        .filter(Block.section_id == target_section_id)
        .filter(Block.id != moved_block.id)
        .order_by(Block.sort_order.asc(), Block.id.asc())
        .all()
    )

    if source_section_id == target_section_id:
        blocks = source_blocks

        if target_index > len(blocks):
            target_index = len(blocks)

        blocks.insert(target_index, moved_block)

        for index, block in enumerate(blocks):
            block.section_id = target_section_id
            block.sort_order = index

        updated = blocks

    else:
        if target_index > len(target_blocks):
            target_index = len(target_blocks)

        target_blocks.insert(target_index, moved_block)

        for index, block in enumerate(source_blocks):
            block.sort_order = index

        for index, block in enumerate(target_blocks):
            block.section_id = target_section_id
            block.sort_order = index

        updated = source_blocks + target_blocks

    db.commit()

    for block in updated:
        db.refresh(block)

    return updated


def normalize_section_blocks(db: Session, section_id: int):
    blocks = (
        db.query(Block)
        .filter(Block.section_id == section_id)
        .order_by(Block.sort_order.asc(), Block.id.asc())
        .all()
    )

    for index, block in enumerate(blocks):
        block.sort_order = index

    db.commit()

    return blocks