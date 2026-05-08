import json

from sqlalchemy import text
from sqlalchemy.orm import Session

from .models import Section


def create_section(db: Session, data):
    section = Section(**data.model_dump())
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


def get_sections_by_page(db: Session, page_id: int):
    return (
        db.query(Section)
        .filter(Section.page_id == page_id)
        .order_by(Section.sort_order.asc(), Section.id.asc())
        .all()
    )


def get_section(db: Session, section_id: int):
    return db.query(Section).filter(Section.id == section_id).first()


def update_section(db: Session, section_id: int, data):
    section = get_section(db, section_id)

    if not section:
        return None

    update_data = data.model_dump(exclude_unset=True)

    print("SECTION UPDATE DATA:", update_data)

    normal_fields = {}

    for key, value in update_data.items():
        if key != "settings":
            normal_fields[key] = value

    if normal_fields:
        db.query(Section).filter(Section.id == section_id).update(normal_fields)

    if "settings" in update_data:
        incoming_settings = update_data.get("settings") or {}

        current_settings = dict(section.settings or {})
        current_settings.update(incoming_settings)

        print("FINAL SETTINGS TO SAVE:", current_settings)

        db.execute(
            text(
                """
                UPDATE sections
                SET settings = CAST(:settings AS JSON)
                WHERE id = :section_id
                """
            ),
            {
                "settings": json.dumps(current_settings),
                "section_id": section_id,
            },
        )

    db.commit()
    db.expire_all()

    saved_section = get_section(db, section_id)

    print("SAVED SETTINGS:", saved_section.settings)

    return saved_section


def delete_section(db: Session, section_id: int):
    section = get_section(db, section_id)

    if not section:
        return None

    page_id = section.page_id

    db.delete(section)
    db.commit()

    normalize_page_sections(db, page_id)

    return section


def move_sections(db: Session, items):
    if not items:
        return []

    item = items[0]

    moved_section = get_section(db, item.id)

    if not moved_section:
        return []

    page_id = moved_section.page_id
    target_index = max(0, item.sort_order)

    sections = (
        db.query(Section)
        .filter(Section.page_id == page_id)
        .filter(Section.id != moved_section.id)
        .order_by(Section.sort_order.asc(), Section.id.asc())
        .all()
    )

    if target_index > len(sections):
        target_index = len(sections)

    sections.insert(target_index, moved_section)

    for index, section in enumerate(sections):
        section.sort_order = index

    db.commit()

    for section in sections:
        db.refresh(section)

    return sections


def normalize_page_sections(db: Session, page_id: int):
    sections = (
        db.query(Section)
        .filter(Section.page_id == page_id)
        .order_by(Section.sort_order.asc(), Section.id.asc())
        .all()
    )

    for index, section in enumerate(sections):
        section.sort_order = index

    db.commit()

    return sections