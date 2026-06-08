#!/usr/bin/env python3
"""Record Plan Studio/Office Info tab parity milestone."""

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
STEP_TITLE = "Plan Studio/Office — единая вкладка Инфо"
HISTORY_TITLE = "Унификация вкладки Инфо Plan: Studio и Office"
HISTORY_DESCRIPTION = (
    "Проведён аудит расхождения Studio и Office. "
    "Карточка записи приведена к единому published layout (plan info grid + projection.infoFieldKeys). "
    "Office теперь использует опубликованное представление, настроенное в Studio. "
    "Файлы: PlanInfoTab.jsx, PlanInfoFieldValue.jsx, objectPlanView.css. Автор: Cursor."
)
HISTORY_RESULT = (
    "Studio и Office отображают вкладку Инфо Plan одинаково; "
    "inline-редактирование в Office встроено в ту же сетку через PlanInfoFieldValue."
)


def _normalize(value: str) -> str:
    return str(value or "").strip().casefold()


def _choice_key_by_label(field: dict | None, label: str) -> str | None:
    if not field:
        return None
    for option in (field.get("settings_json") or {}).get("options") or []:
        if _normalize(option.get("label")) == _normalize(label):
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
            "SELECT value_json FROM runtime_entity_values "
            "WHERE entity_id = :entity_id AND field_key = :field_key LIMIT 1"
        ),
        {"entity_id": str(entity_id), "field_key": title_field_key},
    ).fetchone()
    return _scalar_value_from_json(row[0] if row else None)


def _find_entity_id_by_title(db, *, object_type_key: str, title_field_key: str, title: str) -> UUID | None:
    row = db.execute(
        text(
            """
            SELECT e.id::text FROM runtime_entities e
            JOIN runtime_entity_values v ON v.entity_id = e.id
            WHERE e.tenant_id = :tenant_id AND e.object_type_key = :object_type_key
              AND e.deleted_at IS NULL AND v.field_key = :field_key
              AND lower(trim(v.value_json #>> '{}')) = :title LIMIT 1
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "object_type_key": object_type_key,
            "field_key": title_field_key,
            "title": _normalize(title),
        },
    ).fetchone()
    return UUID(str(row[0])) if row else None


def _child_ids(db, parent_id: UUID) -> list[UUID]:
    rows = db.execute(
        text(
            """
            SELECT target_entity_id::text FROM runtime_relation_instances
            WHERE tenant_id = :tenant_id AND relation_key = :relation_key
              AND source_entity_id = :parent_id AND deleted_at IS NULL
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "relation_key": HIERARCHY_RELATION_KEY,
            "parent_id": str(parent_id),
        },
    ).fetchall()
    return [UUID(str(row[0])) for row in rows]


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
        title_key = napravleniya_meta.title_field_key or "nazvanie"
        status_field = _find_field(napravleniya_meta.fields, key_hints=("status",))
        done_key = _choice_key_by_label(status_field, "Готово")

        root_id = _find_entity_id_by_title(
            db, object_type_key=NAPRAVLENIYA_KEY, title_field_key=title_key, title=ROOT_TITLE
        )
        if not root_id:
            print("ERROR: root not found", file=sys.stderr)
            return 1

        if not any(
            _normalize(_entity_title(db, cid, title_key) or "") == _normalize(STEP_TITLE)
            for cid in _child_ids(db, root_id)
        ):
            values = {title_key: STEP_TITLE}
            if status_field and done_key:
                values[str(status_field["key"])] = done_key
            step = entities_service.create_entity(
                db, TENANT_ID, NAPRAVLENIYA_KEY, EntityCreate(values=values), current_user=None
            )
            relations_service.create_relation_instance(
                db,
                TENANT_ID,
                HIERARCHY_RELATION_KEY,
                RelationInstanceCreate(source_entity_id=root_id, target_entity_id=step.id),
                current_user=None,
            )
            print(f"Created step: {STEP_TITLE}")

        istoriya_title_key = istoriya_meta.title_field_key or "nazvanie_sobytiya"
        istoriya_values = {
            istoriya_title_key: HISTORY_TITLE,
            "opisanie_izmeneniy": HISTORY_DESCRIPTION,
            "rezultat": HISTORY_RESULT,
        }
        tip_key = _choice_key_by_label(
            _find_field(istoriya_meta.fields, key_hints=("tip_sobytiya",)), "Реализация"
        )
        if tip_key:
            istoriya_values["tip_sobytiya"] = tip_key

        if not _find_entity_id_by_title(
            db, object_type_key=ISTORIYA_KEY, title_field_key=istoriya_title_key, title=HISTORY_TITLE
        ):
            created = entities_service.create_entity(
                db, TENANT_ID, ISTORIYA_KEY, EntityCreate(values=istoriya_values), current_user=None
            )
            print(f"Created istoriya: {created.id}")
        else:
            print("Istoriya already exists")

        print("Done.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
