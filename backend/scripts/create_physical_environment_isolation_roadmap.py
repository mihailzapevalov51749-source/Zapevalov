#!/usr/bin/env python3
"""Create «Физическая изоляция сред» section in DEV napravleniya plan tree."""

from __future__ import annotations

import json
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
from app.modules.platform.runtime.plan_tree.reorder import reorder_hierarchy_siblings
from app.modules.platform.runtime.plan_tree.root_anchor import get_or_create_plan_tree_root_anchor
from app.modules.platform.runtime.relation_instances import repository as rel_repo
from app.modules.platform.runtime.relation_instances import service as relations_service
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceCreate

TENANT_ID = 1
OBJECT_TYPE_KEY = "napravleniya"
HIERARCHY_RELATION_KEY = "podpunkt"
STATUS_LABEL = "Не начато"

ROOT_TITLE = "Физическая изоляция сред"
ROOT_DESCRIPTION = (
    "Реализовать физическое разделение среды разработки и клиентской среды, включая "
    "отдельные каталоги, базы данных, конфигурации запуска, релизный контур, резервное "
    "копирование и механизм обновления клиентов через релизы."
)

CHILD_STEPS: list[dict[str, str | None]] = [
    {
        "title": "Создать структуру каталогов DEV / CLIENT_DEMO / RELEASES / BACKUPS",
        "description": (
            "Создать отдельные физические каталоги для среды разработки, стабильной "
            "клиентской среды, релизов и резервных копий."
        ),
    },
    {
        "title": "Создать базу yasnopro_dev",
        "description": "Создать отдельную базу данных для разработки.",
    },
    {
        "title": "Создать базу yasnopro_client_demo",
        "description": "Создать отдельную базу данных для стабильной клиентской среды.",
    },
    {"title": "Настроить отдельный .env для DEV", "description": None},
    {"title": "Настроить отдельный .env для CLIENT_DEMO", "description": None},
    {"title": "Настроить запуск DEV", "description": None},
    {"title": "Настроить запуск CLIENT_DEMO", "description": None},
    {"title": "Проверить одновременный запуск сред", "description": None},
    {"title": "Реализовать Environment Guard", "description": None},
    {"title": "Реализовать создание Release Package", "description": None},
    {"title": "Реализовать применение Release Package", "description": None},
    {"title": "Реализовать резервное копирование CLIENT_DEMO", "description": None},
    {"title": "Реализовать Rollback CLIENT_DEMO", "description": None},
    {"title": "Реализовать журнал релизов", "description": None},
    {"title": "Реализовать предложения обновлений", "description": None},
    {"title": "Реализовать обновление клиента через релиз", "description": None},
]


def _normalize(value: str) -> str:
    return str(value or "").strip().casefold()


def _safe_print(message: str, *, file=None) -> None:
    stream = file or sys.stdout
    encoding = getattr(stream, "encoding", None) or "utf-8"
    text = str(message)
    try:
        print(text, file=stream)
    except UnicodeEncodeError:
        print(text.encode(encoding, errors="replace").decode(encoding), file=stream)


def _find_field(fields: list[dict], *, name_hint: str, key_hints: tuple[str, ...] = ()) -> dict | None:
    for field in fields:
        key = str(field.get("key") or "")
        name = str(field.get("name") or "")
        if key in key_hints:
            return field
        if _normalize(name_hint) in _normalize(name):
            return field
    for key in key_hints:
        for field in fields:
            if field.get("key") == key:
                return field
    return None


def _choice_key_by_label(field: dict | None, label: str) -> str | None:
    if not field:
        return None
    settings = field.get("settings_json") or {}
    for option in settings.get("options") or []:
        if _normalize(option.get("label")) == _normalize(label):
            key = str(option.get("key") or "").strip()
            if key:
                return key
    return None


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
    if not row or row[0] is None:
        return None
    raw = row[0]
    if isinstance(raw, str):
        return raw.strip() or None
    return str(raw).strip() or None


def _entity_values_snapshot(db, entity_id: UUID) -> dict[str, str | None]:
    rows = db.execute(
        text(
            """
            SELECT field_key, value_json::text
            FROM runtime_entity_values
            WHERE entity_id = :entity_id
              AND field_key IN ('nazvanie', 'opisanie', 'status')
            """
        ),
        {"entity_id": str(entity_id)},
    ).fetchall()
    return {str(row[0]): row[1] for row in rows}


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


def _find_child_by_title(
    db,
    parent_id: UUID,
    *,
    title: str,
    title_field_key: str,
) -> UUID | None:
    target = _normalize(title)
    for child_id in _child_ids(db, parent_id):
        child_title = _entity_title(db, child_id, title_field_key)
        if child_title and _normalize(child_title) == target:
            return child_id
    return None


def _build_values(
    *,
    title: str,
    description: str | None,
    title_field_key: str,
    description_field_key: str,
    status_field: dict | None,
    status_choice_key: str | None,
) -> dict:
    values: dict = {title_field_key: title}
    if description:
        values[description_field_key] = description
    if status_field and status_choice_key:
        values[str(status_field["key"])] = status_choice_key
    return values


def _create_record(
    db,
    *,
    title_field_key: str,
    description_field_key: str,
    status_field,
    status_choice_key,
    title: str,
    description: str | None,
) -> UUID:
    created = entities_service.create_entity(
        db,
        TENANT_ID,
        OBJECT_TYPE_KEY,
        EntityCreate(
            values=_build_values(
                title=title,
                description=description,
                title_field_key=title_field_key,
                description_field_key=description_field_key,
                status_field=status_field,
                status_choice_key=status_choice_key,
            ),
        ),
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


def _snapshot_existing_root_children(db, anchor_id: UUID, title_field_key: str) -> dict:
    snapshot: dict = {}
    for child_id in _child_ids(db, anchor_id):
        title = _entity_title(db, child_id, title_field_key)
        if not title:
            continue
        snapshot[title] = {
            "id": str(child_id),
            "values": _entity_values_snapshot(db, child_id),
        }
    return snapshot


def main() -> int:
    require_platform_data_write_approval(script_name=Path(__file__).name)
    db = SessionLocal()
    created_ids: list[str] = []

    try:
        metadata = catalog_service.get_published_object_type_metadata(
            db,
            TENANT_ID,
            OBJECT_TYPE_KEY,
        )
        relation_metadata = catalog_service.get_published_relation_metadata(
            db,
            TENANT_ID,
            HIERARCHY_RELATION_KEY,
        )
        fields = metadata.fields
        title_field_key = metadata.title_field_key or "nazvanie"
        description_field = _find_field(fields, name_hint="описание", key_hints=("opisanie",))
        status_field = _find_field(
            fields,
            name_hint="статус",
            key_hints=("status", "status_zadachi", "status_napravleniya"),
        )
        description_field_key = (
            str(description_field["key"]) if description_field else "opisanie"
        )
        status_choice_key = _choice_key_by_label(status_field, STATUS_LABEL)

        if status_field and not status_choice_key:
            raise RuntimeError(
                f"Choice '{STATUS_LABEL}' not found in status field {status_field.get('key')}"
            )

        plan_anchor = get_or_create_plan_tree_root_anchor(
            db,
            TENANT_ID,
            metadata,
            HIERARCHY_RELATION_KEY,
        )

        before_snapshot = _snapshot_existing_root_children(
            db,
            plan_anchor.id,
            title_field_key,
        )

        existing_root = _find_child_by_title(
            db,
            plan_anchor.id,
            title=ROOT_TITLE,
            title_field_key=title_field_key,
        )
        if existing_root is not None:
            raise RuntimeError(
                f"Section already exists: {ROOT_TITLE} ({existing_root}). "
                "Aborting to avoid duplicates."
            )

        root_id = _create_record(
            db,
            title_field_key=title_field_key,
            description_field_key=description_field_key,
            status_field=status_field,
            status_choice_key=status_choice_key,
            title=ROOT_TITLE,
            description=ROOT_DESCRIPTION,
        )
        _link_parent_child(db, plan_anchor.id, root_id)
        created_ids.append(str(root_id))
        _safe_print(f"Created root: {ROOT_TITLE} ({root_id})")

        ordered_child_ids: list[UUID] = []
        for step in CHILD_STEPS:
            title = str(step["title"])
            description = step.get("description")
            description_text = str(description).strip() if description else None

            child_id = _create_record(
                db,
                title_field_key=title_field_key,
                description_field_key=description_field_key,
                status_field=status_field,
                status_choice_key=status_choice_key,
                title=title,
                description=description_text,
            )
            _link_parent_child(db, root_id, child_id)
            ordered_child_ids.append(child_id)
            created_ids.append(str(child_id))
            _safe_print(f"  Created step: {title} ({child_id})")

        reorder_hierarchy_siblings(
            db,
            TENANT_ID,
            HIERARCHY_RELATION_KEY,
            parent_entity_id=root_id,
            ordered_child_ids=ordered_child_ids,
            relation_settings_json=relation_metadata.settings_json,
        )
        rel_repo.commit(db)

        after_snapshot = _snapshot_existing_root_children(
            db,
            plan_anchor.id,
            title_field_key,
        )

        unchanged = True
        for title, payload in before_snapshot.items():
            if title not in after_snapshot:
                unchanged = False
                break
            if after_snapshot[title]["values"] != payload["values"]:
                unchanged = False
                break

        if not unchanged:
            db.rollback()
            raise RuntimeError(
                "Existing root plan records were modified; transaction rolled back."
            )

        db.commit()

        report = {
            "root_id": str(root_id),
            "created_ids": created_ids,
            "created_count": len(created_ids),
            "existing_roots_unchanged": unchanged,
            "existing_root_count_before": len(before_snapshot),
            "existing_root_count_after": len(after_snapshot),
        }
        report_path = BACKEND_ROOT / "_physical_isolation_roadmap_report.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

        _safe_print("")
        _safe_print(f"Created records: {len(created_ids)}")
        _safe_print(f"Existing roots unchanged: {unchanged}")
        _safe_print(f"Report: {report_path}")
        return 0
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        _safe_print(f"FATAL: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
