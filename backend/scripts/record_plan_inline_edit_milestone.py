#!/usr/bin/env python3
"""Record Plan inline field editing milestone in istoriya and napravleniya plan tree."""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from platform_data_write_guard import require_platform_data_write_approval
from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.portals.models import Portal  # noqa: F401
from app.modules.users.models import User  # noqa: F401
from app.modules.platform.runtime.entities.models import RuntimeEntity  # noqa: F401
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance  # noqa: F401
from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.entities import service as entities_service
from app.modules.platform.runtime.entities.schemas import EntityCreate
from app.modules.platform.runtime.relation_instances import service as relations_service
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceCreate

TENANT_ID = 1
NAPRAVLENIYA_KEY = "napravleniya"
ISTORIYA_KEY = "istoriya"
HIERARCHY_RELATION_KEY = "podpunkt"

ROOT_TITLE = "Action Engine V1"
DIRECTION_TITLE = "Представления объектов"
STEP_TITLE = "Inline-редактирование полей в Plan View"
STATUS_DONE_LABEL = "Готово"
STATUS_NOT_STARTED_LABEL = "Не начато"

HISTORY_TITLE = "Добавлено inline-редактирование полей в представлении Plan"
HISTORY_DESCRIPTION = (
    "Тип события: Реализация. Область: Plan View. "
    "Добавлено inline-редактирование полей в представлении Plan "
    "(статус, ответственный, приоритет, срок, процент готовности). "
    "Изменённые файлы: "
    "frontend/src/modules/objectViews/services/persistRuntimeEntityFieldUpdate.js, "
    "frontend/src/modules/objectViews/plan/applyPlanEntityPatches.js, "
    "frontend/src/modules/objectViews/plan/resolvePlanInlineEditableFields.js, "
    "frontend/src/modules/objectViews/plan/usePlanInlineEdit.js, "
    "frontend/src/modules/objectViews/plan/PlanInlineFieldCell.jsx, "
    "frontend/src/modules/objectViews/plan/planTreeGrid.js, "
    "frontend/src/modules/objectViews/plan/ObjectPlanView.jsx, "
    "frontend/src/modules/objectViews/plan/PlanTreeNode.jsx, "
    "frontend/src/modules/objectViews/plan/PlanTreePanel.jsx, "
    "frontend/src/modules/objectViews/plan/usePlanHierarchy.js, "
    "frontend/src/modules/objectViews/plan/buildPlanTree.js, "
    "frontend/src/modules/objectViews/plan/planProgressUtils.js, "
    "frontend/src/modules/objectViews/plan/objectPlanView.css, "
    "frontend/src/modules/objectViews/table/hooks/useObjectTableInlineEdit.js. "
    "Автор: Cursor."
)
HISTORY_RESULT = (
    "Plan использует общий runtime update pipeline с Object Table; "
    "дерево сохраняет раскрытие и выбранную запись после изменений."
)

CHANGED_FILES = [
    "frontend/src/modules/objectViews/services/persistRuntimeEntityFieldUpdate.js",
    "frontend/src/modules/objectViews/plan/applyPlanEntityPatches.js",
    "frontend/src/modules/objectViews/plan/resolvePlanInlineEditableFields.js",
    "frontend/src/modules/objectViews/plan/usePlanInlineEdit.js",
    "frontend/src/modules/objectViews/plan/PlanInlineFieldCell.jsx",
    "frontend/src/modules/objectViews/plan/planTreeGrid.js",
    "frontend/src/modules/objectViews/plan/ObjectPlanView.jsx",
    "frontend/src/modules/objectViews/plan/PlanTreeNode.jsx",
    "frontend/src/modules/objectViews/plan/PlanTreePanel.jsx",
    "frontend/src/modules/objectViews/plan/usePlanHierarchy.js",
    "frontend/src/modules/objectViews/plan/buildPlanTree.js",
    "frontend/src/modules/objectViews/plan/planProgressUtils.js",
    "frontend/src/modules/objectViews/plan/objectPlanView.css",
    "frontend/src/modules/objectViews/table/hooks/useObjectTableInlineEdit.js",
]


def _normalize(value: str) -> str:
    return str(value or "").strip().casefold()


def _choice_key_by_label(field: dict | None, label: str) -> str | None:
    if not field:
        return None
    settings = field.get("settings_json") or {}
    options = settings.get("options") or []
    target = _normalize(label)
    for option in options:
        if _normalize(option.get("label")) == target:
            key = str(option.get("key") or "").strip()
            if key:
                return key
    return None


def _find_field(fields: list[dict], *, key_hints: tuple[str, ...]) -> dict | None:
    for key in key_hints:
        for field in fields:
            if field.get("key") == key:
                return field
    return None


def _scalar_value_from_json(raw) -> str | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        return raw.strip() or None
    return str(raw).strip() or None


def _entity_title(db, entity_id: UUID, title_field_key: str) -> str | None:
    row = db.execute(
        text(
            """
            SELECT value_json
            FROM runtime_entity_values
            WHERE entity_id = :entity_id AND field_key = :field_key
            LIMIT 1
            """
        ),
        {"entity_id": str(entity_id), "field_key": title_field_key},
    ).fetchone()
    return _scalar_value_from_json(row[0] if row else None)


def _find_entity_id_by_title(
    db,
    *,
    object_type_key: str,
    title_field_key: str,
    title: str,
) -> UUID | None:
    target = _normalize(title)
    rows = db.execute(
        text(
            """
            SELECT e.id::text
            FROM runtime_entities e
            JOIN runtime_entity_values v ON v.entity_id = e.id
            WHERE e.tenant_id = :tenant_id
              AND e.object_type_key = :object_type_key
              AND e.deleted_at IS NULL
              AND v.field_key = :field_key
              AND lower(trim(v.value_json #>> '{}')) = :title
            LIMIT 1
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "object_type_key": object_type_key,
            "field_key": title_field_key,
            "title": target,
        },
    ).fetchone()
    if not rows:
        return None
    return UUID(str(rows[0]))


def _child_ids(db, parent_id: UUID) -> list[UUID]:
    rows = db.execute(
        text(
            """
            SELECT target_entity_id::text
            FROM runtime_relation_instances
            WHERE tenant_id = :tenant_id
              AND relation_key = :relation_key
              AND source_entity_id = :parent_id
              AND deleted_at IS NULL
            ORDER BY created_at
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "relation_key": HIERARCHY_RELATION_KEY,
            "parent_id": str(parent_id),
        },
    ).fetchall()
    return [UUID(str(row[0])) for row in rows]


def _create_napravleniya_record(
    db,
    *,
    title: str,
    title_field_key: str,
    status_field: dict | None,
    status_choice_key: str | None,
) -> UUID:
    values: dict = {title_field_key: title}
    if status_field and status_choice_key:
        values[str(status_field["key"])] = status_choice_key
    created = entities_service.create_entity(
        db,
        TENANT_ID,
        NAPRAVLENIYA_KEY,
        EntityCreate(values=values),
        current_user=None,
    )
    return created.id


def _link_parent_child(db, parent_id: UUID, child_id: UUID) -> None:
    relations_service.create_relation_instance(
        db,
        TENANT_ID,
        HIERARCHY_RELATION_KEY,
        RelationInstanceCreate(
            source_entity_id=parent_id,
            target_entity_id=child_id,
        ),
        current_user=None,
    )


def main() -> int:
    require_platform_data_write_approval(script_name=Path(__file__).name)
    db = SessionLocal()
    try:
        napravleniya_meta = catalog_service.get_published_object_type_metadata(
            db, TENANT_ID, NAPRAVLENIYA_KEY
        )
        istoriya_meta = catalog_service.get_published_object_type_metadata(
            db, TENANT_ID, ISTORIYA_KEY
        )

        napravleniya_title_key = napravleniya_meta.title_field_key or "nazvanie"
        status_field = _find_field(
            napravleniya_meta.fields,
            key_hints=("status",),
        )
        done_status_key = _choice_key_by_label(status_field, STATUS_DONE_LABEL)
        not_started_status_key = _choice_key_by_label(status_field, STATUS_NOT_STARTED_LABEL)

        root_id = _find_entity_id_by_title(
            db,
            object_type_key=NAPRAVLENIYA_KEY,
            title_field_key=napravleniya_title_key,
            title=ROOT_TITLE,
        )
        if root_id is None:
            print(f"ERROR: root '{ROOT_TITLE}' not found", file=sys.stderr)
            return 1

        direction_id = None
        for child_id in _child_ids(db, root_id):
            title = _entity_title(db, child_id, napravleniya_title_key)
            if title and _normalize(title) == _normalize(DIRECTION_TITLE):
                direction_id = child_id
                break

        if direction_id is None:
            print(f"WARN: direction '{DIRECTION_TITLE}' not found; using root as parent")
            direction_id = root_id

        existing_step_id = None
        for child_id in _child_ids(db, direction_id):
            title = _entity_title(db, child_id, napravleniya_title_key)
            if title and _normalize(title) == _normalize(STEP_TITLE):
                existing_step_id = child_id
                break

        if existing_step_id is None:
            step_id = _create_napravleniya_record(
                db,
                title=STEP_TITLE,
                title_field_key=napravleniya_title_key,
                status_field=status_field,
                status_choice_key=done_status_key or not_started_status_key,
            )
            _link_parent_child(db, direction_id, step_id)
            print(f"Created napravleniya step: {STEP_TITLE} ({step_id})")
        else:
            print(f"Step already exists: {STEP_TITLE} ({existing_step_id})")

        istoriya_title_key = istoriya_meta.title_field_key or "nazvanie_sobytiya"
        istoriya_values: dict = {
            istoriya_title_key: HISTORY_TITLE,
            "opisanie_izmeneniy": HISTORY_DESCRIPTION,
            "rezultat": HISTORY_RESULT,
        }

        oblast_field = _find_field(istoriya_meta.fields, key_hints=("oblast", "area"))
        if oblast_field:
            oblast_key = _choice_key_by_label(oblast_field, "Plan View")
            if oblast_key:
                istoriya_values[str(oblast_field["key"])] = oblast_key

        napravlenie_field = _find_field(istoriya_meta.fields, key_hints=("napravlenie",))
        if napravlenie_field and napravlenie_field.get("field_type") == "relation":
            settings = napravlenie_field.get("settings_json") or {}
            relation_key = str(settings.get("relation_key") or "").strip()
            if relation_key:
                istoriya_values["napravlenie"] = [
                    {
                        "relation_key": relation_key,
                        "target_entity_id": str(root_id),
                    }
                ]

        tip_field = _find_field(istoriya_meta.fields, key_hints=("tip_sobytiya",))
        tip_key = _choice_key_by_label(tip_field, "Реализация")
        if tip_key:
            istoriya_values["tip_sobytiya"] = tip_key

        status_istoriya_field = _find_field(istoriya_meta.fields, key_hints=("status",))
        status_istoriya_key = _choice_key_by_label(status_istoriya_field, "Готово")
        if status_istoriya_key:
            istoriya_values["status"] = status_istoriya_key

        history_id = _find_entity_id_by_title(
            db,
            object_type_key=ISTORIYA_KEY,
            title_field_key=istoriya_title_key,
            title=HISTORY_TITLE,
        )
        if history_id is None:
            created = entities_service.create_entity(
                db,
                TENANT_ID,
                ISTORIYA_KEY,
                EntityCreate(values=istoriya_values),
                current_user=None,
            )
            print(f"Created istoriya record: {HISTORY_TITLE} ({created.id})")
        else:
            print(f"Istoriya record already exists: {history_id}")

        print("Changed files:")
        for path in CHANGED_FILES:
            print(f"  - {path}")
        print("Done.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
