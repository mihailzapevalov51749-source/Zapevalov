from sqlalchemy.orm import Session

from app.modules.tables import models, schemas
from app.modules.blocks.models import Block
from app.modules.sections.models import Section
from app.modules.pages.models import Page
from app.modules.portals.models import Portal


def get_object_title(obj, default: str = "") -> str:
    if not obj:
        return default

    return (
        getattr(obj, "title", None)
        or getattr(obj, "name", None)
        or getattr(obj, "label", None)
        or default
    )


def normalize_lookup_label(value) -> str:
    if value is None:
        return ""

    if isinstance(value, dict):
        return str(
            value.get("label")
            or value.get("title")
            or value.get("name")
            or value.get("url")
            or value.get("rowId")
            or ""
        ).strip()

    return str(value).strip()


def get_fallback_display_column_id(columns):
    if not columns:
        return None

    for column in columns:
        if column.type == "text":
            return column.id

    for column in columns:
        if column.type not in ("lookup", "boolean"):
            return column.id

    return columns[0].id if columns else None


# ------------------------
# TABLE
# ------------------------

def create_table_for_block(
    db: Session,
    block_id: int,
    title: str = "Таблица",
) -> models.Table:
    existing_table = (
        db.query(models.Table)
        .filter(models.Table.block_id == block_id)
        .first()
    )

    if existing_table:
        return existing_table

    table = models.Table(
        block_id=block_id,
        title=title,
    )

    db.add(table)
    db.flush()

    default_columns = [
        models.TableColumn(
            table_id=table.id,
            title="Название",
            type="text",
            required=False,
            width=220,
            position=0,
            options=[],
            align="left",
            lookup={},
        ),
        models.TableColumn(
            table_id=table.id,
            title="Статус",
            type="text",
            required=False,
            width=180,
            position=1,
            options=[],
            align="left",
            lookup={},
        ),
    ]

    db.add_all(default_columns)
    db.commit()
    db.refresh(table)

    return table


def get_table(db: Session, table_id: int):
    return db.query(models.Table).filter(models.Table.id == table_id).first()


def get_table_by_block(db: Session, block_id: int):
    return (
        db.query(models.Table)
        .filter(models.Table.block_id == block_id)
        .first()
    )


def update_table(db: Session, table_id: int, data: schemas.TableUpdate):
    table = (
        db.query(models.Table)
        .filter(models.Table.id == table_id)
        .first()
    )

    if not table:
        return None

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(table, field, value)

    db.commit()
    db.refresh(table)

    return table


# ------------------------
# COLUMNS
# ------------------------

def create_column(db: Session, table_id: int, data: schemas.TableColumnCreate):
    max_position = (
        db.query(models.TableColumn.position)
        .filter(models.TableColumn.table_id == table_id)
        .order_by(models.TableColumn.position.desc())
        .first()
    )

    next_position = (max_position[0] + 1) if max_position else 0

    column = models.TableColumn(
        table_id=table_id,
        title=data.title,
        type=data.type,
        required=data.required,
        width=data.width,
        position=next_position,
        options=data.options or [],
        align=data.align or "left",
        lookup=data.lookup or {},
    )

    db.add(column)
    db.flush()

    rows = (
        db.query(models.TableRow)
        .filter(models.TableRow.table_id == table_id)
        .all()
    )

    for row in rows:
        row_values = dict(row.values or {})

        if data.type == "lookup":
            row_values[str(column.id)] = {"rowId": None}
        else:
            row_values[str(column.id)] = ""

        row.values = row_values

    db.commit()
    db.refresh(column)

    return column


def update_column(db: Session, column_id: int, data: schemas.TableColumnUpdate):
    column = (
        db.query(models.TableColumn)
        .filter(models.TableColumn.id == column_id)
        .first()
    )

    if not column:
        return None

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(column, field, value)

    db.commit()
    db.refresh(column)

    return column


def delete_column(db: Session, column_id: int):
    column = (
        db.query(models.TableColumn)
        .filter(models.TableColumn.id == column_id)
        .first()
    )

    if not column:
        return False

    table_id = column.table_id
    column_key = str(column.id)

    rows = (
        db.query(models.TableRow)
        .filter(models.TableRow.table_id == table_id)
        .all()
    )

    for row in rows:
        row_values = dict(row.values or {})
        row_values.pop(column_key, None)
        row.values = row_values

    db.delete(column)
    db.commit()

    return True


# ------------------------
# ROWS
# ------------------------

def create_row(db: Session, table_id: int, data: schemas.TableRowCreate | None = None):
    columns = (
        db.query(models.TableColumn)
        .filter(models.TableColumn.table_id == table_id)
        .order_by(models.TableColumn.position)
        .all()
    )

    max_position = (
        db.query(models.TableRow.position)
        .filter(models.TableRow.table_id == table_id)
        .order_by(models.TableRow.position.desc())
        .first()
    )

    next_position = (max_position[0] + 1) if max_position else 0

    initial_values = {}

    for column in columns:
        if column.type == "lookup":
            initial_values[str(column.id)] = {"rowId": None}
        else:
            initial_values[str(column.id)] = ""

    if data and data.values:
        initial_values.update(data.values)

    row = models.TableRow(
        table_id=table_id,
        values=initial_values,
        position=next_position,
    )

    db.add(row)
    db.commit()
    db.refresh(row)

    return row


def update_row(db: Session, row_id: int, data: schemas.TableRowUpdate):
    row = (
        db.query(models.TableRow)
        .filter(models.TableRow.id == row_id)
        .first()
    )

    if not row:
        return None

    update_data = data.model_dump(exclude_unset=True)

    if "values" in update_data:
        current_values = dict(row.values or {})
        current_values.update(update_data["values"] or {})
        row.values = current_values

    if "position" in update_data:
        row.position = update_data["position"]

    db.commit()
    db.refresh(row)

    return row


def delete_row(db: Session, row_id: int):
    row = (
        db.query(models.TableRow)
        .filter(models.TableRow.id == row_id)
        .first()
    )

    if not row:
        return False

    db.delete(row)
    db.commit()

    return True


# ------------------------
# LOOKUP
# ------------------------

def get_lookup_sources(db: Session):
    tables = db.query(models.Table).all()

    result = []

    for table in tables:
        block = db.query(Block).filter(Block.id == table.block_id).first()

        section = None
        page = None
        portal = None

        if block:
            section_id = getattr(block, "section_id", None)
            if section_id:
                section = (
                    db.query(Section)
                    .filter(Section.id == section_id)
                    .first()
                )

        if section:
            page_id = getattr(section, "page_id", None)
            if page_id:
                page = db.query(Page).filter(Page.id == page_id).first()

        if page:
            portal_id = getattr(page, "portal_id", None)
            if portal_id:
                portal = db.query(Portal).filter(Portal.id == portal_id).first()

        portal_title = get_object_title(portal)
        page_title = get_object_title(page)
        section_title = get_object_title(section)
        block_title = get_object_title(block)
        table_title = table.title or "Таблица"

        path_parts = [
            portal_title,
            page_title,
            section_title,
            table_title,
        ]

        path = " / ".join(filter(None, path_parts)) or table_title

        result.append({
            "portal_id": portal.id if portal else None,
            "portal_title": portal_title,
            "page_id": page.id if page else None,
            "page_title": page_title,
            "section_id": section.id if section else None,
            "section_title": section_title,
            "block_id": block.id if block else None,
            "block_title": block_title,
            "table_id": table.id,
            "table_title": table_title,
            "path": path,
        })

    return result


def get_lookup_options(
    db: Session,
    source_table_id: int,
    display_column_id: int,
):
    rows = (
        db.query(models.TableRow)
        .filter(models.TableRow.table_id == source_table_id)
        .order_by(models.TableRow.position, models.TableRow.id)
        .all()
    )

    columns = (
        db.query(models.TableColumn)
        .filter(models.TableColumn.table_id == source_table_id)
        .order_by(models.TableColumn.position, models.TableColumn.id)
        .all()
    )

    fallback_column_id = get_fallback_display_column_id(columns)

    result = []

    for row in rows:
        values = row.values or {}

        raw_label = values.get(str(display_column_id))
        label = normalize_lookup_label(raw_label)

        if not label and fallback_column_id:
            fallback_value = values.get(str(fallback_column_id))
            label = normalize_lookup_label(fallback_value)

        if not label:
            label = f"Строка {row.id}"

        result.append({
            "row_id": row.id,
            "label": label,
        })

    return result