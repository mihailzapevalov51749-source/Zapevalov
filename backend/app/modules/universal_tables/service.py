from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.comments import service as comments_service
from app.modules.comments.constants import (
    COMMENT_SYSTEM_EVENT_ASSIGNEE_CHANGED,
    COMMENT_SYSTEM_EVENT_DUE_DATE_CHANGED,
    COMMENT_SYSTEM_EVENT_PRIORITY_CHANGED,
    COMMENT_SYSTEM_EVENT_STATUS_CHANGED,
)
from app.modules.comments.schemas import SystemCommentCreate
from app.modules.users.models import User
from app.modules.universal_tables.models import (
    UniversalTable,
    UniversalTableColumn,
    UniversalTableRow,
)
from app.modules.universal_tables.schemas import (
    UniversalTableCreate,
    UniversalTableUpdate,
    UniversalTableColumnCreate,
    UniversalTableColumnUpdate,
    UniversalTableRowCreate,
    UniversalTableRowUpdate,
)
from app.modules.universal_views.models import UniversalView


DEFAULT_TABLE_TITLE = "Таблица"


def normalize_title(value: str | None, fallback: str = DEFAULT_TABLE_TITLE) -> str:
    if value and value.strip():
        return value.strip()

    return fallback


def normalize_column_title(value: str | None) -> str:
    return (
        (value or "")
        .strip()
        .lower()
        .replace("ё", "е")
        .replace("_", " ")
        .replace("-", " ")
    )


def normalize_parent_row_id(payload) -> int | None:
    return (
        getattr(payload, "parent_row_id", None)
        or getattr(payload, "parent_id", None)
        or getattr(payload, "parentId", None)
    )


def get_next_row_number(db: Session, table_id: int) -> int:
    max_number = (
        db.query(func.max(UniversalTableRow.number))
        .filter(UniversalTableRow.table_id == table_id)
        .scalar()
    )

    return int(max_number or 0) + 1


def build_user_value(user: User) -> dict:
    avatar_settings = user.avatar_settings or {}

    return {
        "id": user.id,
        "user_id": user.id,
        "userId": user.id,
        "full_name": user.full_name,
        "fullName": user.full_name,
        "name": user.full_name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "avatarUrl": user.avatar_url,
        "avatar_settings": avatar_settings,
        "avatarSettings": avatar_settings,
    }


def get_current_user(db: Session, current_user_id: int | None) -> User | None:
    if not current_user_id:
        return None

    return db.query(User).filter(User.id == current_user_id).first()


def is_created_by_column(column: UniversalTableColumn) -> bool:
    if column.system_key == "created_by":
        return True

    title = normalize_column_title(column.title)

    return title in {
        "создатель",
        "создал",
        "автор",
        "кем создано",
        "создано кем",
        "создал пользователь",
        "создатель строки",
        "created by",
        "createdby",
        "created user",
        "creator",
        "author",
    }


def is_updated_by_column(column: UniversalTableColumn) -> bool:
    if column.system_key == "updated_by":
        return True

    title = normalize_column_title(column.title)

    return title in {
        "изменил",
        "изменено кем",
        "кем изменено",
        "редактор",
        "обновил",
        "изменил пользователь",
        "updated by",
        "updatedby",
        "updated user",
        "editor",
        "modified by",
        "modifiedby",
    }


def is_status_column(column: UniversalTableColumn) -> bool:
    if column.system_key in {"status", "task_status"}:
        return True

    title = normalize_column_title(column.title)

    return title in {
        "статус",
        "status",
        "состояние",
        "этап",
        "stage",
    }


def is_due_date_column(column: UniversalTableColumn) -> bool:
    if column.system_key in {"due_date", "deadline", "term"}:
        return True

    title = normalize_column_title(column.title)

    return title in {
        "срок",
        "дедлайн",
        "deadline",
        "due date",
        "дата завершения",
        "срок выполнения",
    }


def is_assignee_column(column: UniversalTableColumn) -> bool:
    if column.system_key in {"assignee", "responsible", "executor"}:
        return True

    title = normalize_column_title(column.title)

    return title in {
        "исполнитель",
        "ответственный",
        "ответственные",
        "assignee",
        "responsible",
        "executor",
    }


def is_priority_column(column: UniversalTableColumn) -> bool:
    if column.system_key in {"priority"}:
        return True

    title = normalize_column_title(column.title)

    return title in {
        "приоритет",
        "priority",
        "важность",
    }


def extract_display_value(value) -> str:
    if value is None:
        return "—"

    if isinstance(value, str):
        return value or "—"

    if isinstance(value, (int, float, bool)):
        return str(value)

    if isinstance(value, list):
        items = [extract_display_value(item) for item in value]
        items = [item for item in items if item and item != "—"]
        return ", ".join(items) if items else "—"

    if isinstance(value, dict):
        return (
            value.get("label")
            or value.get("title")
            or value.get("name")
            or value.get("full_name")
            or value.get("fullName")
            or value.get("value")
            or "—"
        )

    return str(value)


def build_system_comment_payload(
    column: UniversalTableColumn,
    old_values: dict,
    new_values: dict,
):
    column_id = str(column.id)

    old_value = old_values.get(column_id)
    new_value = new_values.get(column_id)

    if old_value == new_value:
        return None

    event_key = None

    if is_status_column(column):
        event_key = COMMENT_SYSTEM_EVENT_STATUS_CHANGED

    elif is_due_date_column(column):
        event_key = COMMENT_SYSTEM_EVENT_DUE_DATE_CHANGED

    elif is_assignee_column(column):
        event_key = COMMENT_SYSTEM_EVENT_ASSIGNEE_CHANGED

    elif is_priority_column(column):
        event_key = COMMENT_SYSTEM_EVENT_PRIORITY_CHANGED

    if not event_key:
        return None

    return {
        "system_event_key": event_key,
        "system_payload": {
            "fieldId": column.id,
            "fieldTitle": column.title,
            "from": extract_display_value(old_value),
            "to": extract_display_value(new_value),
        },
    }


def create_row_system_comments(
    db: Session,
    table: UniversalTable,
    row: UniversalTableRow,
    old_values: dict,
    new_values: dict,
):
    for column in table.columns:
        payload = build_system_comment_payload(
            column=column,
            old_values=old_values,
            new_values=new_values,
        )

        if not payload:
            continue

        comments_service.create_system_comment(
            db=db,
            payload=SystemCommentCreate(
                entity_type=f"universal_table:{table.id}",
                entity_id=str(row.id),
                system_event_key=payload["system_event_key"],
                system_payload=payload["system_payload"],
            ),
        )


def apply_create_user_values(
    table: UniversalTable,
    values: dict,
    user: User | None,
) -> dict:
    next_values = dict(values or {})

    if not user:
        return next_values

    user_value = build_user_value(user)

    next_values["created_by"] = user_value
    next_values["updated_by"] = user_value

    for column in table.columns:
        if is_created_by_column(column):
            next_values[str(column.id)] = user_value

        if is_updated_by_column(column):
            next_values[str(column.id)] = user_value

    return next_values


def apply_update_user_values(
    table: UniversalTable,
    current_values: dict,
    incoming_values: dict,
    user: User | None,
) -> dict:
    next_values = dict(current_values or {})
    next_values.update(dict(incoming_values or {}))

    if not user:
        return next_values

    user_value = build_user_value(user)

    next_values["updated_by"] = user_value

    for column in table.columns:
        if is_updated_by_column(column):
            next_values[str(column.id)] = user_value

    return next_values


def serialize_row(row: UniversalTableRow) -> dict:
    return {
        "id": row.id,
        "table_id": row.table_id,
        "number": row.number,
        "system_number": row.number,
        "systemNumber": row.number,
        "row_number": row.number,
        "rowNumber": row.number,
        "values": row.values or {},
        "position": row.position,
        "parent_row_id": row.parent_row_id,
        "parent_id": row.parent_row_id,
        "parentId": row.parent_row_id,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def serialize_column(column: UniversalTableColumn) -> dict:
    return {
        "id": column.id,
        "table_id": column.table_id,
        "title": column.title,
        "type": column.type,
        "system_key": column.system_key,
        "required": column.required,
        "width": column.width,
        "position": column.position,
        "options": column.options or [],
        "multiple": bool(column.multiple),
        "align": column.align,
        "lookup": column.lookup or {},
        "is_system": column.is_system,
        "is_readonly": column.is_readonly,
        "lock_position": column.lock_position,
        "lock_width": column.lock_width,
        "lock_delete": column.lock_delete,
        "created_at": column.created_at,
        "updated_at": column.updated_at,
    }


def serialize_table(table: UniversalTable) -> dict:
    return {
        "id": table.id,
        "block_id": table.block_id,
        "title": table.title,
        "settings": table.settings or {},
        "columns": [serialize_column(column) for column in table.columns],
        "rows": [serialize_row(row) for row in table.rows],
        "created_at": table.created_at,
        "updated_at": table.updated_at,
    }


def get_lookup_sources(db: Session) -> list[dict]:
    tables = db.query(UniversalTable).order_by(UniversalTable.title.asc()).all()

    return [
        {
            "id": table.id,
            "title": table.title,
            "label": table.title,
            "block_id": table.block_id,
            "columns": [serialize_column(column) for column in table.columns],
        }
        for table in tables
    ]


def get_lookup_options(
    db: Session,
    source_table_id: int,
    display_column_id: int,
) -> list[dict]:
    rows = (
        db.query(UniversalTableRow)
        .filter(UniversalTableRow.table_id == source_table_id)
        .order_by(UniversalTableRow.position.asc(), UniversalTableRow.id.asc())
        .all()
    )

    result = []

    for row in rows:
        values = row.values or {}

        label = (
            values.get(str(display_column_id))
            or values.get(display_column_id)
            or f"Строка {row.number or row.id}"
        )

        result.append(
            {
                "id": row.id,
                "row_id": row.id,
                "rowId": row.id,
                "number": row.number,
                "value": row.id,
                "label": str(label),
                "values": values,
            }
        )

    return result


def get_table(db: Session, table_id: int) -> UniversalTable | None:
    return db.query(UniversalTable).filter(UniversalTable.id == table_id).first()


def get_table_by_block(db: Session, block_id: int) -> UniversalTable | None:
    return db.query(UniversalTable).filter(UniversalTable.block_id == block_id).first()


def create_table(db: Session, payload: UniversalTableCreate) -> UniversalTable:
    table = UniversalTable(
        block_id=payload.block_id,
        title=normalize_title(payload.title),
        settings=payload.settings or {},
    )

    db.add(table)
    db.flush()

    default_view = UniversalView(
        table_id=table.id,
        name="Таблица",
        type="table",
        position=0,
        is_system=True,
        is_default=True,
        is_visible=True,
        settings={
            "fields": [],
            "filters": [],
            "sorting": [],
            "grouping": [],
            "visible_fields": [],
        },
    )

    db.add(default_view)
    db.commit()
    db.refresh(table)

    return table


def update_table(
    db: Session,
    table_id: int,
    payload: UniversalTableUpdate,
) -> UniversalTable | None:
    table = get_table(db, table_id)

    if not table:
        return None

    if payload.title is not None:
        table.title = normalize_title(payload.title)

    if payload.settings is not None:
        table.settings = payload.settings

    db.commit()
    db.refresh(table)

    return table


def delete_table(db: Session, table_id: int) -> bool:
    table = get_table(db, table_id)

    if not table:
        return False

    db.delete(table)
    db.commit()

    return True


def create_column(
    db: Session,
    table_id: int,
    payload: UniversalTableColumnCreate,
) -> UniversalTableColumn | None:
    table = get_table(db, table_id)

    if not table:
        return None

    position = payload.position

    if position is None:
        position = (
            db.query(UniversalTableColumn)
            .filter(UniversalTableColumn.table_id == table_id)
            .count()
        )

    column = UniversalTableColumn(
        table_id=table_id,
        title=normalize_title(payload.title, fallback="Столбец"),
        type=payload.type,
        system_key=payload.system_key,
        required=payload.required,
        width=payload.width,
        position=position,
        options=payload.options or [],
        multiple=bool(payload.multiple),
        align=payload.align,
        lookup=payload.lookup or {},
    )

    db.add(column)
    db.commit()
    db.refresh(column)

    return column


def update_column(
    db: Session,
    column_id: int,
    payload: UniversalTableColumnUpdate,
) -> UniversalTableColumn | None:
    column = (
        db.query(UniversalTableColumn)
        .filter(UniversalTableColumn.id == column_id)
        .first()
    )

    if not column:
        return None

    data = payload.model_dump(exclude_unset=True)

    if "title" in data:
        data["title"] = normalize_title(data.get("title"), fallback="Столбец")

    for key, value in data.items():
        setattr(column, key, value)

    db.commit()
    db.refresh(column)

    return column


def delete_column(db: Session, column_id: int) -> bool:
    column = (
        db.query(UniversalTableColumn)
        .filter(UniversalTableColumn.id == column_id)
        .first()
    )

    if not column:
        return False

    db.delete(column)
    db.commit()

    return True


def create_row(
    db: Session,
    table_id: int,
    payload: UniversalTableRowCreate,
    current_user_id: int | None = None,
) -> UniversalTableRow | None:
    table = get_table(db, table_id)

    if not table:
        return None

    parent_row_id = normalize_parent_row_id(payload)

    position = payload.position

    if position is None:
        position = (
            db.query(UniversalTableRow)
            .filter(
                UniversalTableRow.table_id == table_id,
                UniversalTableRow.parent_row_id == parent_row_id,
            )
            .count()
        )

    current_user = get_current_user(db, current_user_id)

    values = apply_create_user_values(
        table=table,
        values=payload.values or {},
        user=current_user,
    )

    row = UniversalTableRow(
        table_id=table_id,
        number=get_next_row_number(db, table_id),
        values=values,
        position=position,
        parent_row_id=parent_row_id,
    )

    db.add(row)
    db.commit()
    db.refresh(row)

    return row


def update_row(
    db: Session,
    row_id: int,
    payload: UniversalTableRowUpdate,
    current_user_id: int | None = None,
) -> UniversalTableRow | None:
    row = (
        db.query(UniversalTableRow)
        .filter(UniversalTableRow.id == row_id)
        .first()
    )

    if not row:
        return None

    table = get_table(db, row.table_id)

    old_values = dict(row.values or {})

    data = payload.model_dump(exclude_unset=True)

    if "parent_id" in data or "parentId" in data:
        data["parent_row_id"] = (
            data.get("parent_row_id")
            or data.get("parent_id")
            or data.get("parentId")
        )

    data.pop("parent_id", None)
    data.pop("parentId", None)

    data.pop("number", None)
    data.pop("system_number", None)
    data.pop("systemNumber", None)
    data.pop("row_number", None)
    data.pop("rowNumber", None)

    should_reorder = "position" in data or "parent_row_id" in data

    if should_reorder:
        new_parent_row_id = data.get("parent_row_id", row.parent_row_id)
        new_position = data.get("position", row.position)

        siblings = (
            db.query(UniversalTableRow)
            .filter(
                UniversalTableRow.table_id == row.table_id,
                UniversalTableRow.parent_row_id == new_parent_row_id,
                UniversalTableRow.id != row.id,
            )
            .order_by(UniversalTableRow.position.asc(), UniversalTableRow.id.asc())
            .all()
        )

        insert_index = max(0, min(int(new_position or 0), len(siblings)))

        row.parent_row_id = new_parent_row_id
        siblings.insert(insert_index, row)

        for index, sibling in enumerate(siblings):
            sibling.position = index
            sibling.parent_row_id = new_parent_row_id

        data.pop("position", None)
        data.pop("parent_row_id", None)

    if "values" in data:
        current_user = get_current_user(db, current_user_id)

        if table:
            data["values"] = apply_update_user_values(
                table=table,
                current_values=row.values or {},
                incoming_values=data.get("values") or {},
                user=current_user,
            )

    for key, value in data.items():
        setattr(row, key, value)

    db.commit()
    db.refresh(row)

    if table and "values" in data:
        create_row_system_comments(
            db=db,
            table=table,
            row=row,
            old_values=old_values,
            new_values=row.values or {},
        )

    return row


def collect_row_and_children_ids(db: Session, row_id: int) -> list[int]:
    ids_to_delete = {row_id}
    changed = True

    while changed:
        changed = False

        children = (
            db.query(UniversalTableRow)
            .filter(UniversalTableRow.parent_row_id.in_(ids_to_delete))
            .all()
        )

        for child in children:
            if child.id not in ids_to_delete:
                ids_to_delete.add(child.id)
                changed = True

    return list(ids_to_delete)


def delete_row(db: Session, row_id: int) -> bool:
    row = (
        db.query(UniversalTableRow)
        .filter(UniversalTableRow.id == row_id)
        .first()
    )

    if not row:
        return False

    ids_to_delete = collect_row_and_children_ids(db, row_id)

    (
        db.query(UniversalTableRow)
        .filter(UniversalTableRow.id.in_(ids_to_delete))
        .delete(synchronize_session=False)
    )

    db.commit()

    return True