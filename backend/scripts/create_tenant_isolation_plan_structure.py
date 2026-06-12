#!/usr/bin/env python3
"""Create «Изоляция компаний» plan hierarchy in napravleniya (План реализации)."""

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
from app.modules.platform.runtime.plan_tree.reorder import reorder_hierarchy_siblings
from app.modules.platform.runtime.plan_tree.root_anchor import get_or_create_plan_tree_root_anchor
from app.modules.platform.runtime.relation_instances import repository as rel_repo
from app.modules.platform.runtime.relation_instances import service as relations_service
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceCreate

TENANT_ID = 1
OBJECT_TYPE_KEY = "napravleniya"
HIERARCHY_RELATION_KEY = "podpunkt"
ROOT_SECTION_TITLE = "Изоляция компаний"

PLAN_STRUCTURE: list[dict] = [
    {
        "title": "Изоляция страниц",
        "tasks": [
            "PortalPageRuntimeContent",
            "Home Page Resolver",
            "Удаление page/1 fallback",
            "Backend validation page.portal_id",
        ],
    },
    {
        "title": "Изоляция Workspace и вкладок",
        "tasks": [
            "Workspace Tabs",
            "Collapsed Tabs",
            "Recent Tabs",
            "Active Tabs",
        ],
    },
    {
        "title": "Изоляция навигации",
        "tasks": [
            "Navigation State",
            "Expanded / Collapsed Nodes",
            "Selected Navigation Item",
            "Navigation Cache",
        ],
    },
    {
        "title": "Изоляция таблиц",
        "tasks": [
            "Universal Table Session",
            "Dirty State",
            "Column Widths",
            "Representations",
            "Expanded Rows",
            "View Settings",
        ],
    },
    {
        "title": "Изоляция Object Views",
        "tasks": [
            "Saved Filters",
            "Sorting",
            "Grouping",
            "Visibility Settings",
            "View Preferences",
        ],
    },
    {
        "title": "Изоляция библиотек документов",
        "tasks": [
            "Column Settings",
            "View State",
            "Navigation State",
        ],
    },
    {
        "title": "Изоляция BPMN",
        "tasks": [
            "Последняя схема",
            "Выбранные элементы",
            "BPMN Cache",
        ],
    },
    {
        "title": "Изоляция Designer",
        "tasks": [
            "Designer State",
            "Workspace State",
            "Route Ownership",
            "Designer Cache",
        ],
    },
    {
        "title": "Изоляция Office",
        "tasks": [
            "Home Page",
            "Office Preferences",
            "Office Cache",
            "User UI State",
        ],
    },
    {
        "title": "Изоляция Yasii",
        "tasks": [
            "Messages",
            "Workspace Mode",
            "Session State",
        ],
    },
    {
        "title": "Изоляция уведомлений",
        "tasks": [
            "Notification Stack",
            "Notification Navigation State",
        ],
    },
    {
        "title": "Изоляция заметок",
        "tasks": [
            "Note Publish State",
            "Note UI State",
        ],
    },
    {
        "title": "Аудит хранения данных",
        "tasks": [
            "localStorage",
            "sessionStorage",
            "React Context",
            "Provider State",
            "In-Memory Cache",
            "Map / WeakMap",
            "window.__*",
        ],
    },
    {
        "title": "Аудит зависимостей",
        "tasks": [
            "useEffect без tenantId / portalId",
            "useMemo без tenantId / portalId",
            "Cache Key без tenantId / portalId",
        ],
    },
    {
        "title": "Аудит пользовательских данных",
        "tasks": [
            "Recent Items",
            "Favorites",
            "Search History",
            "Dashboard Preferences",
            "User Preferences",
        ],
    },
    {
        "title": "Backend-изоляция",
        "tasks": [
            "Tenant Ownership Validation",
            "Cross-Tenant Protection",
            "Runtime API Validation",
            "Designer API Validation",
            "Object API Validation",
            "Page API Validation",
            "Workspace API Validation",
        ],
    },
    {
        "title": "Platform Owner",
        "tasks": [
            "Временный доступ ко всем tenant",
            "Ограничение до Platform + DEV + Template",
            "Управляемый доступ к клиентским tenant",
        ],
    },
    {
        "title": "Финализация",
        "tasks": [
            "Tenant Boundary Rule",
            "Tenant Isolation Audit",
            "Сквозное тестирование DEV ↔ Template ↔ Clients",
        ],
    },
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


def _create_record(db, *, title: str, title_field_key: str) -> UUID:
    created = entities_service.create_entity(
        db,
        TENANT_ID,
        OBJECT_TYPE_KEY,
        EntityCreate(values={title_field_key: title}),
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


def _reorder_children(
    db,
    *,
    parent_id: UUID,
    ordered_child_ids: list[UUID],
    relation_settings_json: dict | None,
) -> None:
    if not ordered_child_ids:
        return

    reorder_hierarchy_siblings(
        db,
        TENANT_ID,
        HIERARCHY_RELATION_KEY,
        parent_entity_id=parent_id,
        ordered_child_ids=ordered_child_ids,
        relation_settings_json=relation_settings_json,
    )
    rel_repo.commit(db)


def apply_isolation_plan_order(
    db,
    *,
    root_id: UUID,
    title_field_key: str,
    relation_settings_json: dict | None,
) -> None:
    stage_ids: list[UUID] = []

    for stage in PLAN_STRUCTURE:
        stage_id = _find_child_by_title(
            db,
            root_id,
            title=stage["title"],
            title_field_key=title_field_key,
        )
        if stage_id is None:
            raise ValueError(f"Stage not found: {stage['title']}")
        stage_ids.append(stage_id)

        task_ids: list[UUID] = []
        for task_title in stage["tasks"]:
            task_id = _find_child_by_title(
                db,
                stage_id,
                title=task_title,
                title_field_key=title_field_key,
            )
            if task_id is None:
                raise ValueError(f"Task not found: {task_title}")
            task_ids.append(task_id)

        _reorder_children(
            db,
            parent_id=stage_id,
            ordered_child_ids=task_ids,
            relation_settings_json=relation_settings_json,
        )

    _reorder_children(
        db,
        parent_id=root_id,
        ordered_child_ids=stage_ids,
        relation_settings_json=relation_settings_json,
    )


def _ensure_child(
    db,
    parent_id: UUID,
    *,
    title: str,
    title_field_key: str,
) -> tuple[UUID, bool]:
    existing_id = _find_child_by_title(
        db,
        parent_id,
        title=title,
        title_field_key=title_field_key,
    )
    if existing_id is not None:
        return existing_id, False

    child_id = _create_record(db, title=title, title_field_key=title_field_key)
    _link_parent_child(db, parent_id, child_id)
    return child_id, True


def main() -> int:
    require_platform_data_write_approval(script_name=Path(__file__).name)
    db = SessionLocal()
    errors: list[str] = []
    created_sections = 0
    created_stages = 0
    created_tasks = 0

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
        title_field_key = metadata.title_field_key or "nazvanie"

        plan_anchor = get_or_create_plan_tree_root_anchor(
            db,
            TENANT_ID,
            metadata,
            HIERARCHY_RELATION_KEY,
        )

        root_id, root_created = _ensure_child(
            db,
            plan_anchor.id,
            title=ROOT_SECTION_TITLE,
            title_field_key=title_field_key,
        )
        if root_created:
            created_sections += 1
            _safe_print(f"Created section: {ROOT_SECTION_TITLE} ({root_id})")
        else:
            _safe_print(f"Section exists: {ROOT_SECTION_TITLE} ({root_id})")

        for stage in PLAN_STRUCTURE:
            stage_title = stage["title"]
            try:
                stage_id, stage_created = _ensure_child(
                    db,
                    root_id,
                    title=stage_title,
                    title_field_key=title_field_key,
                )
                if stage_created:
                    created_stages += 1
                    _safe_print(f"  Created stage: {stage_title} ({stage_id})")
                else:
                    _safe_print(f"  Stage exists: {stage_title} ({stage_id})")

                for task_title in stage["tasks"]:
                    try:
                        _task_id, task_created = _ensure_child(
                            db,
                            stage_id,
                            title=task_title,
                            title_field_key=title_field_key,
                        )
                        if task_created:
                            created_tasks += 1
                            _safe_print(f"    Created task: {task_title}")
                        else:
                            _safe_print(f"    Task exists: {task_title}")
                    except Exception as exc:  # noqa: BLE001
                        message = f"task '{task_title}' under '{stage_title}': {exc}"
                        errors.append(message)
                        _safe_print(f"    ERROR: {message}", file=sys.stderr)
            except Exception as exc:  # noqa: BLE001
                message = f"stage '{stage_title}': {exc}"
                errors.append(message)
                _safe_print(f"  ERROR: {message}", file=sys.stderr)

        apply_isolation_plan_order(
            db,
            root_id=root_id,
            title_field_key=title_field_key,
            relation_settings_json=relation_metadata.settings_json,
        )
        _safe_print("Applied sibling order for «Изоляция компаний»")

        db.commit()

        _safe_print("")
        _safe_print(f"Создано разделов: {created_sections}")
        _safe_print(f"Создано этапов: {created_stages}")
        _safe_print(f"Создано задач: {created_tasks}")
        _safe_print(f"Ошибки: {'нет' if not errors else '; '.join(errors)}")
        return 1 if errors else 0
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        _safe_print(f"FATAL: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
