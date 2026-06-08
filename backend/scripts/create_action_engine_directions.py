#!/usr/bin/env python3
"""Create Action Engine V1 direction hierarchy in napravleniya object type."""

from __future__ import annotations

import sys
from pathlib import Path
from uuid import UUID

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from platform_data_write_guard import require_platform_data_write_approval
from app.modules.portals.models import Portal  # noqa: F401
from app.modules.users.models import User  # noqa: F401
from app.modules.platform.runtime.entities.models import RuntimeEntity  # noqa: F401
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance  # noqa: F401

from app.db.session import SessionLocal
from app.modules.platform.runtime.catalog import service as catalog_service
from app.modules.platform.runtime.entities import service as entities_service
from app.modules.platform.runtime.entities.schemas import EntityCreate
from app.modules.platform.runtime.relation_instances import service as relations_service
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceCreate

TENANT_ID = 1
OBJECT_TYPE_KEY = "napravleniya"
HIERARCHY_RELATION_KEY = "podpunkt"

ROOT_TITLE = "Action Engine V1"
STATUS_LABEL = "Не начато"

DIRECTIONS = [
    {
        "title": 'Создать раздел "Действия"',
        "steps": [
            "CRUD Action Definition",
            "Настройки действия",
            "Типы действий",
            "Публикация действий",
        ],
    },
    {
        "title": "Реализовать Action Form",
        "steps": [
            "Модель Action Form",
            "Проекция полей",
            "Порядок полей",
            "Обязательные поля",
            "Значения по умолчанию",
            "Подсказки",
            "Drag&Drop настройки",
        ],
    },
    {
        "title": 'Системное действие "Создать запись"',
        "steps": [
            "Создание Action Definition",
            "Связь с Action Form",
            "Создание записи",
            "Создание связей",
            "Проверка прав",
        ],
    },
    {
        "title": "Размещение действий",
        "steps": [
            "Table Toolbar",
            "Table Row Menu",
            "Plan Toolbar",
            "Plan Node Menu",
            "Card Header",
            "Card Footer",
        ],
    },
    {
        "title": "Action Engine Runtime",
        "steps": [
            "Action Resolver",
            "Action Context",
            "Action Executor",
            "Operation Registry",
            "Runtime Events",
        ],
    },
    {
        "title": "Permissions",
        "steps": [
            "Роли действий",
            "Capability проверки",
            "Ограничения",
            "Runtime validation",
        ],
    },
    {
        "title": "Audit",
        "steps": [
            "История выполнения",
            "Логи действий",
            "Ошибки",
            "Аналитика",
        ],
    },
    {
        "title": "Интеграция с BPMN",
        "steps": [
            "Start Process",
            "Complete Task",
            "Approve",
            "Reject",
            "User Task Actions",
        ],
    },
]


def _normalize(value: str) -> str:
    return str(value or "").strip().casefold()


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
    options = settings.get("options") or []
    target = _normalize(label)
    for option in options:
        if _normalize(option.get("label")) == target:
            key = str(option.get("key") or "").strip()
            if key:
                return key
    return None


def _build_values(
    *,
    title: str,
    title_field_key: str,
    status_field: dict | None,
    status_choice_key: str | None,
) -> dict:
    values: dict = {title_field_key: title}
    if status_field and status_choice_key:
        values[str(status_field["key"])] = status_choice_key
    return values


def _create_record(
    db,
    *,
    title_field_key: str,
    status_field,
    status_choice_key,
    title: str,
) -> UUID:
    payload = EntityCreate(
        values=_build_values(
            title=title,
            title_field_key=title_field_key,
            status_field=status_field,
            status_choice_key=status_choice_key,
        ),
    )
    created = entities_service.create_entity(
        db,
        TENANT_ID,
        OBJECT_TYPE_KEY,
        payload,
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
        metadata = catalog_service.get_published_object_type_metadata(
            db,
            TENANT_ID,
            OBJECT_TYPE_KEY,
        )
        fields = metadata.fields
        title_field_key = metadata.title_field_key or "nazvanie"
        title_field = _find_field(fields, name_hint="название", key_hints=(title_field_key, "nazvanie", "title"))
        status_field = _find_field(
            fields,
            name_hint="статус",
            key_hints=("status", "status_zadachi", "status_napravleniya"),
        )

        if not title_field and not title_field_key:
            print("ERROR: title field not found in napravleniya catalog", file=sys.stderr)
            return 1

        if title_field:
            title_field_key = str(title_field["key"])

        status_choice_key = _choice_key_by_label(status_field, STATUS_LABEL)

        if status_field and not status_choice_key:
            print(
                f"ERROR: choice '{STATUS_LABEL}' not found in field {status_field.get('key')}",
                file=sys.stderr,
            )
            return 1

        print(f"Using title field: {title_field_key}")
        print(f"Using status field: {status_field.get('key') if status_field else None} -> {status_choice_key}")

        root_id = _create_record(
            db,
            title_field_key=title_field_key,
            status_field=status_field,
            status_choice_key=status_choice_key,
            title=ROOT_TITLE,
        )
        print(f"Created root: {ROOT_TITLE} ({root_id})")

        for direction in DIRECTIONS:
            direction_id = _create_record(
                db,
                title_field_key=title_field_key,
                status_field=status_field,
                status_choice_key=status_choice_key,
                title=direction["title"],
            )
            _link_parent_child(db, root_id, direction_id)
            print(f"  Direction: {direction['title']} ({direction_id})")

            for step_title in direction["steps"]:
                step_id = _create_record(
                    db,
                    title_field_key=title_field_key,
                    status_field=status_field,
                    status_choice_key=status_choice_key,
                    title=step_title,
                )
                _link_parent_child(db, direction_id, step_id)
                print(f"    Step: {step_title} ({step_id})")

        print("Done.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
