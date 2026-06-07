#!/usr/bin/env python3
"""Reorder Action Engine V1 plan tree via podpunkt relation created_at (display order)."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.modules.portals.models import Portal  # noqa: F401
from app.modules.users.models import User  # noqa: F401
from app.modules.platform.runtime.entities.models import RuntimeEntity  # noqa: F401
from app.modules.platform.runtime.relation_instances.models import RuntimeRelationInstance  # noqa: F401
from app.db.session import SessionLocal
from app.modules.platform.runtime.entities import repository as ent_repo
from app.modules.platform.runtime.relation_instances import repository as rel_repo

TENANT_ID = 1
RELATION_KEY = "podpunkt"
ROOT_TITLE = "Action Engine V1"

# Target roadmap order (titles must match nazvanie in DB).
TARGET_TREE: list[tuple[str, list[str]]] = [
    (
        'Создать раздел "Действия"',
        [
            "Типы действий",
            "Настройки действия",
            "CRUD Action Definition",
            "Публикация действий",
        ],
    ),
    (
        "Реализовать Action Form",
        [
            "Модель Action Form",
            "Проекция полей",
            "Порядок полей",
            "Обязательные поля",
            "Значения по умолчанию",
            "Подсказки",
            "Drag&Drop настройки",
        ],
    ),
    (
        'Системное действие "Создать запись"',
        [
            "Создание Action Definition",
            "Связь с Action Form",
            "Проверка прав",
            "Создание записи",
            "Создание связей",
        ],
    ),
    (
        "Размещение действий",
        [
            "Table Toolbar",
            "Table Row Menu",
            "Plan Toolbar",
            "Plan Node Menu",
            "Card Header",
            "Card Footer",
        ],
    ),
    (
        "Action Engine Runtime",
        [
            "Action Context",
            "Action Resolver",
            "Runtime Events",
            "Operation Registry",
            "Action Executor",
        ],
    ),
    (
        "Permissions",
        [
            "Capability проверки",
            "Ограничения",
            "Runtime validation",
            "Роли действий",
        ],
    ),
    (
        "Audit",
        [
            "Аналитика",
            "Логи действий",
            "История выполнения",
            "Ошибки",
        ],
    ),
    (
        "Интеграция с BPMN",
        [
            "User Task Actions",
            "Approve",
            "Reject",
            "Complete Task",
            "Start Process",
        ],
    ),
]


def load_title_map(db) -> dict[str, UUID]:
    from app.modules.platform.runtime.entities.models import RuntimeEntity

    rows = (
        db.query(RuntimeEntity)
        .filter(
            RuntimeEntity.tenant_id == TENANT_ID,
            RuntimeEntity.object_type_key == "napravleniya",
            RuntimeEntity.deleted_at.is_(None),
        )
        .all()
    )

    title_map: dict[str, UUID] = {}
    for entity in rows:
        values = ent_repo.get_entity_values(db, TENANT_ID, entity.id)
        nazvanie = next((v.value_json for v in values if v.field_key == "nazvanie"), None)
        title = str(nazvanie or "").strip()
        if title:
            title_map[title] = entity.id
    return title_map


def find_active_edge(db, parent_id: UUID, child_id: UUID):
    return (
        db.query(RuntimeRelationInstance)
        .filter(
            RuntimeRelationInstance.tenant_id == TENANT_ID,
            RuntimeRelationInstance.relation_key == RELATION_KEY,
            RuntimeRelationInstance.deleted_at.is_(None),
            RuntimeRelationInstance.source_entity_id == parent_id,
            RuntimeRelationInstance.target_entity_id == child_id,
        )
        .one_or_none()
    )


def reorder_siblings(db, parent_id: UUID, child_ids: list[UUID]) -> list[dict]:
    """First id in child_ids = first in plan tree (newest created_at)."""
    changes: list[dict] = []
    base_time = datetime.now(timezone.utc)

    for index, child_id in enumerate(child_ids):
        instance = find_active_edge(db, parent_id, child_id)
        if not instance:
            raise RuntimeError(
                f"Missing podpunkt edge parent={parent_id} child={child_id}",
            )

        rank = len(child_ids) - index
        new_created_at = base_time + timedelta(seconds=rank)
        old_created_at = instance.created_at
        instance.created_at = new_created_at
        instance.updated_at = base_time
        changes.append(
            {
                "relation_instance_id": str(instance.id),
                "parent_id": str(parent_id),
                "child_id": str(child_id),
                "old_created_at": old_created_at.isoformat() if old_created_at else None,
                "new_created_at": new_created_at.isoformat(),
                "display_index": index + 1,
            },
        )

    return changes


def collect_subtree_entity_ids(relations, root_id: str) -> set[str]:
    ids = set()

    def walk(parent_id: str) -> None:
        ids.add(parent_id)
        for rel in relations:
            if str(rel.source_entity_id) == parent_id:
                child = str(rel.target_entity_id)
                if child not in ids:
                    walk(child)

    walk(root_id)
    return ids


def main() -> int:
    db = SessionLocal()
    all_changes: list[dict] = []

    try:
        title_map = load_title_map(db)
        if ROOT_TITLE not in title_map:
            print(f"ERROR: root '{ROOT_TITLE}' not found", file=sys.stderr)
            return 1

        root_id = title_map[ROOT_TITLE]
        relations = rel_repo.list_by_relation_key(db, TENANT_ID, RELATION_KEY)
        before_ids = collect_subtree_entity_ids(relations, str(root_id))

        for direction_title, step_titles in TARGET_TREE:
            if direction_title not in title_map:
                raise RuntimeError(f"Direction not found: {direction_title!r}")

            direction_id = title_map[direction_title]
            step_ids = []
            for step_title in step_titles:
                if step_title not in title_map:
                    raise RuntimeError(f"Step not found: {step_title!r}")
                step_ids.append(title_map[step_title])

            all_changes.extend(reorder_siblings(db, direction_id, step_ids))

        direction_ids = [title_map[direction_title] for direction_title, _ in TARGET_TREE]
        all_changes.extend(reorder_siblings(db, root_id, direction_ids))

        db.commit()

        relations_after = rel_repo.list_by_relation_key(db, TENANT_ID, RELATION_KEY)
        after_ids = collect_subtree_entity_ids(relations_after, str(root_id))

        print("=== Reorder complete ===")
        print(f"Root: {ROOT_TITLE} ({root_id})")
        print(f"Entities before: {len(before_ids)}")
        print(f"Entities after:  {len(after_ids)}")
        print(f"Relation timestamps updated: {len(all_changes)}")

        if before_ids != after_ids:
            missing = before_ids - after_ids
            extra = after_ids - before_ids
            print(f"WARNING missing entities: {missing}", file=sys.stderr)
            print(f"WARNING extra entities: {extra}", file=sys.stderr)
            return 1

        print("\n=== Target tree ===")
        for direction_title, step_titles in TARGET_TREE:
            print(direction_title)
            for step_title in step_titles:
                print(f"  - {step_title}")

        print("\n=== Sample changes (first 10) ===")
        for change in all_changes[:10]:
            print(change)

        return 0
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
