#!/usr/bin/env python3
"""Populate platform implementation roadmap in DEV napravleniya (План реализации)."""

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
from app.modules.platform.runtime.entities.schemas import EntityCreate, EntityUpdate
from app.modules.platform.runtime.plan_tree.reorder import reorder_hierarchy_siblings
from app.modules.platform.runtime.plan_tree.root_anchor import get_or_create_plan_tree_root_anchor
from app.modules.platform.runtime.relation_instances import repository as rel_repo
from app.modules.platform.runtime.relation_instances import service as relations_service
from app.modules.platform.runtime.relation_instances.schemas import RelationInstanceCreate

TENANT_ID = 1
OBJECT_TYPE_KEY = "napravleniya"
HIERARCHY_RELATION_KEY = "podpunkt"
VIEW_KEY = "arhitektura"
STATUS_LABEL = "Не начато"

ROADMAP_ITEMS: list[dict[str, str]] = [
    {
        "title": "Создание компании",
        "description": (
            "Реализовать полный цикл создания новой компании в ЯсноПро, включая создание "
            "тенанта, первичную настройку структуры, назначение администратора и подготовку "
            "среды к работе."
        ),
    },
    {
        "title": "Приглашение пользователей",
        "description": (
            "Реализовать механизм приглашения пользователей в компанию по электронной почте, "
            "включая регистрацию, принятие приглашения и присоединение к компании."
        ),
    },
    {
        "title": "Смена администратора",
        "description": (
            "Реализовать безопасную передачу полномочий администратора компании другому "
            "пользователю с журналированием изменений."
        ),
    },
    {
        "title": "Настроить календарь",
        "description": (
            "Реализовать настройку календарей компании, рабочих графиков, праздничных дней и "
            "интеграцию с объектами системы."
        ),
    },
    {
        "title": "Чат",
        "description": (
            "Реализовать корпоративный чат внутри платформы с поддержкой личных и групповых "
            "сообщений."
        ),
    },
    {
        "title": "Видеовстречи",
        "description": (
            "Реализовать механизм проведения видеовстреч и интеграцию их с календарём, "
            "задачами и уведомлениями."
        ),
    },
    {
        "title": "Документы",
        "description": (
            "Реализовать подсистему хранения документов, совместной работы, версионирования и "
            "маршрутов согласования."
        ),
    },
    {
        "title": "Задачи через объекты",
        "description": (
            "Реализовать возможность постановки задач через любые объекты платформы с "
            "автоматическим формированием связей и истории."
        ),
    },
    {
        "title": "Объекты платформы",
        "description": (
            "Завершить разработку конструктора объектов платформы, включая поля, связи, "
            "формы, представления и публикацию."
        ),
    },
    {
        "title": "Уведомления",
        "description": (
            "Реализовать единую систему уведомлений платформы с поддержкой внутренних, "
            "почтовых и системных уведомлений."
        ),
    },
    {
        "title": "YASII",
        "description": (
            "Разработать и внедрить ИИ-помощника YASII как платформенный сервис поддержки "
            "пользователей и настройки системы."
        ),
    },
    {
        "title": "Изоляция компаний",
        "description": (
            "Обеспечить физическую и логическую изоляцию компаний, разделение сред разработки "
            "и эксплуатации, релизный контур и независимость клиентских данных."
        ),
    },
    {
        "title": "Журнал событий",
        "description": (
            "Реализовать журналы событий платформы и компаний с разграничением доступа и "
            "полной трассировкой действий."
        ),
    },
    {
        "title": "Роли и доступы",
        "description": (
            "Завершить реализацию ролевой модели, матрицы прав доступа и механизмов "
            "делегирования полномочий."
        ),
    },
    {
        "title": "Создать демо компанию Техзак",
        "description": (
            "Создать демонстрационную компанию Техзак с наполнением данными для презентаций "
            "и демонстрации возможностей платформы."
        ),
    },
    {
        "title": "Реализовать удаленный доступ к ЯсноПро",
        "description": (
            "Обеспечить публикацию демонстрационной версии ЯсноПро через интернет для "
            "удалённого доступа пользователей и заказчиков."
        ),
    },
    {
        "title": "Релизы платформы",
        "description": (
            "Реализовать полный жизненный цикл релизов платформы: build, package, publish, "
            "apply, rollback, предложения обновлений и контроль версий."
        ),
    },
]

TITLE_ALIASES: dict[str, str] = {
    "Создать демо-компанию Техзак": "Создать демо компанию Техзак",
    "Реализовать удалённый доступ к ЯсноПро": "Реализовать удаленный доступ к ЯсноПро",
}


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


def _entity_field_value(db, entity_id: UUID, field_key: str) -> str | None:
    row = db.execute(
        text(
            """
            SELECT value_json
            FROM runtime_entity_values
            WHERE entity_id = :entity_id AND field_key = :field_key
            LIMIT 1
            """
        ),
        {"entity_id": str(entity_id), "field_key": field_key},
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


def _build_values(
    *,
    title: str,
    description: str,
    title_field_key: str,
    description_field_key: str | None,
    status_field: dict | None,
    status_choice_key: str | None,
) -> dict:
    values: dict = {title_field_key: title}
    if description_field_key:
        values[description_field_key] = description
    if status_field and status_choice_key:
        values[str(status_field["key"])] = status_choice_key
    return values


def _create_record(
    db,
    *,
    title_field_key: str,
    description_field_key: str | None,
    status_field,
    status_choice_key,
    title: str,
    description: str,
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


def _update_description_if_needed(
    db,
    entity_id: UUID,
    *,
    description_field_key: str,
    description: str,
) -> bool:
    current = _entity_field_value(db, entity_id, description_field_key)
    if current == description:
        return False

    entities_service.update_entity(
        db,
        TENANT_ID,
        OBJECT_TYPE_KEY,
        entity_id,
        EntityUpdate(values={description_field_key: description}),
        current_user=None,
    )
    return True


def _resolve_lookup_title(title: str) -> str:
    return TITLE_ALIASES.get(title, title)


def main() -> int:
    require_platform_data_write_approval(script_name=Path(__file__).name)
    db = SessionLocal()
    created_count = 0
    skipped_count = 0
    updated_count = 0
    report: dict = {
        "created": [],
        "skipped": [],
        "updated_descriptions": [],
        "errors": [],
    }

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
        view_metadata = catalog_service.get_published_view_projection_metadata(
            db,
            TENANT_ID,
            OBJECT_TYPE_KEY,
            VIEW_KEY,
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

        ordered_child_ids: list[UUID] = []

        for item in ROADMAP_ITEMS:
            title = item["title"]
            lookup_title = _resolve_lookup_title(title)
            description = item["description"]

            existing_id = _find_child_by_title(
                db,
                plan_anchor.id,
                title=lookup_title,
                title_field_key=title_field_key,
            )

            if existing_id is None:
                child_id = _create_record(
                    db,
                    title_field_key=title_field_key,
                    description_field_key=description_field_key,
                    status_field=status_field,
                    status_choice_key=status_choice_key,
                    title=lookup_title,
                    description=description,
                )
                _link_parent_child(db, plan_anchor.id, child_id)
                created_count += 1
                report["created"].append({"title": lookup_title, "id": str(child_id)})
                _safe_print(f"Created: {lookup_title} ({child_id})")
                ordered_child_ids.append(child_id)
                continue

            skipped_count += 1
            report["skipped"].append({"title": lookup_title, "id": str(existing_id)})
            _safe_print(f"Exists: {lookup_title} ({existing_id})")

            if _update_description_if_needed(
                db,
                existing_id,
                description_field_key=description_field_key,
                description=description,
            ):
                updated_count += 1
                report["updated_descriptions"].append(
                    {"title": lookup_title, "id": str(existing_id)}
                )
                _safe_print(f"  Updated description: {lookup_title}")

            ordered_child_ids.append(existing_id)

        reorder_hierarchy_siblings(
            db,
            TENANT_ID,
            HIERARCHY_RELATION_KEY,
            parent_entity_id=plan_anchor.id,
            ordered_child_ids=ordered_child_ids,
            relation_settings_json=relation_metadata.settings_json,
        )
        rel_repo.commit(db)
        db.commit()

        _safe_print("")
        _safe_print(f"Object type: {OBJECT_TYPE_KEY}")
        _safe_print(f"View: {VIEW_KEY} ({view_metadata.view_key})")
        _safe_print(f"Created: {created_count}")
        _safe_print(f"Skipped existing: {skipped_count}")
        _safe_print(f"Updated descriptions: {updated_count}")

        report_path = BACKEND_ROOT / "_populate_roadmap_report.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
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
