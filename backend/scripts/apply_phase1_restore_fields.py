#!/usr/bin/env python3
"""APPLY Phase 1: restore soft-deleted designer_field_definitions in tenant 1."""

from __future__ import annotations

import json
import sys
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(SCRIPTS_DIR))

from structure_write_script_guard import guard_script_structure_write  # noqa: E402

from sqlalchemy import func, text  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.modules.platform.designer.field_definitions.models import (  # noqa: E402
    DesignerFieldDefinition,
)
from app.modules.platform.designer.object_types.models import DesignerObjectType  # noqa: E402

SOURCE = 13
TARGET = 1


def ot_key_map(db, tenant_id: int) -> dict:
    rows = (
        db.query(DesignerObjectType.id, DesignerObjectType.key)
        .filter(DesignerObjectType.tenant_id == tenant_id)
        .all()
    )
    return {row_id: key for row_id, key in rows}


def field_counts_by_ot(db, tenant_id: int, *, active_only: bool) -> dict[str, int]:
    ot_map = ot_key_map(db, tenant_id)
    q = db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == tenant_id
    )
    if active_only:
        q = q.filter(DesignerFieldDefinition.deleted_at.is_(None))
    counts: dict[str, int] = defaultdict(int)
    for row in q.all():
        ot_key = ot_map.get(row.object_type_id, "?")
        counts[ot_key] += 1
    return dict(counts)


def runtime_counts(db) -> dict[str, int]:
    return {
        "runtime_entities": int(
            db.execute(
                text(
                    "SELECT COUNT(*) FROM runtime_entities "
                    "WHERE tenant_id=:t AND deleted_at IS NULL"
                ),
                {"t": TARGET},
            ).scalar()
            or 0
        ),
        "runtime_entity_values": int(
            db.execute(
                text("SELECT COUNT(*) FROM runtime_entity_values WHERE tenant_id=:t"),
                {"t": TARGET},
            ).scalar()
            or 0
        ),
        "runtime_relation_instances": int(
            db.execute(
                text("SELECT COUNT(*) FROM runtime_relation_instances WHERE tenant_id=:t"),
                {"t": TARGET},
            ).scalar()
            or 0
        ),
    }


def build_restore_plan(db) -> tuple[list[dict], dict[str, list[str]]]:
    src_ot = ot_key_map(db, SOURCE)
    tgt_ot = ot_key_map(db, TARGET)
    tgt_ot_key_to_id = {key: oid for oid, key in tgt_ot.items()}

    src_fields: dict[tuple[str, str], dict] = {}
    for row in (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == SOURCE,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .all()
    ):
        ot_key = src_ot.get(row.object_type_id)
        if not ot_key:
            continue
        src_fields[(ot_key, row.key)] = {
            "field_key": row.key,
            "object_type_key": ot_key,
            "field_type": row.field_type,
        }

    to_restore: list[dict] = []
    grouped: dict[str, list[str]] = defaultdict(list)

    for row in (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == TARGET,
            DesignerFieldDefinition.deleted_at.isnot(None),
        )
        .all()
    ):
        ot_key = tgt_ot.get(row.object_type_id)
        if not ot_key:
            continue
        pair = (ot_key, row.key)
        if pair not in src_fields:
            continue
        to_restore.append(
            {
                "id": str(row.id),
                "object_type_key": ot_key,
                "field_key": row.key,
                "field_type": row.field_type,
                "source_field_type": src_fields[pair]["field_type"],
            }
        )
        grouped[ot_key].append(row.key)

    for ot_key in grouped:
        grouped[ot_key].sort()
    return to_restore, dict(grouped)


def check_duplicate_active_keys(db) -> list[dict]:
    ot_map = ot_key_map(db, TARGET)
    rows = (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == TARGET,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .all()
    )
    seen: dict[tuple[str, str], int] = defaultdict(int)
    for row in rows:
        ot_key = ot_map.get(row.object_type_id, "?")
        seen[(ot_key, row.key)] += 1
    return [
        {"object_type_key": ot, "field_key": fk, "count": cnt}
        for (ot, fk), cnt in sorted(seen.items())
        if cnt > 1
    ]


def print_restore_list(grouped: dict[str, list[str]]) -> None:
    total_fields = sum(len(v) for v in grouped.values())
    print(f"Всего объектов: {len(grouped)}")
    print(f"Всего полей: {total_fields}")
    print()
    for ot_key in sorted(grouped):
        print(ot_key)
        for fk in grouped[ot_key]:
            print(f"  - {fk}")
        print()


def main() -> int:
    db = SessionLocal()
    report: dict = {
        "phase": "apply_phase1_restore_fields",
        "started_at": datetime.now().isoformat(),
        "source_tenant": SOURCE,
        "target_tenant": TARGET,
    }

    try:
        before_active = field_counts_by_ot(db, TARGET, active_only=True)
        before_deleted = (
            db.query(func.count(DesignerFieldDefinition.id))
            .filter(
                DesignerFieldDefinition.tenant_id == TARGET,
                DesignerFieldDefinition.deleted_at.isnot(None),
            )
            .scalar()
        )
        runtime_before = runtime_counts(db)
        plan, grouped = build_restore_plan(db)

        report["before"] = {
            "active_fields_total": sum(before_active.values()),
            "active_fields_by_ot": before_active,
            "deleted_fields_total": int(before_deleted or 0),
            "runtime": runtime_before,
        }
        report["restore_plan"] = plan
        report["restore_grouped"] = grouped

        print("=== СПИСОК ВОССТАНОВЛЕНИЯ (перед APPLY) ===")
        print_restore_list(grouped)

        if not plan:
            print("Нечего восстанавливать.")
            return 0

        guard_script_structure_write(db, TARGET, "apply_phase1_restore_fields")

        ids = [uuid.UUID(item["id"]) for item in plan]
        try:
            updated = (
                db.query(DesignerFieldDefinition)
                .filter(
                    DesignerFieldDefinition.tenant_id == TARGET,
                    DesignerFieldDefinition.id.in_(ids),
                    DesignerFieldDefinition.deleted_at.isnot(None),
                )
                .update(
                    {DesignerFieldDefinition.deleted_at: None, DesignerFieldDefinition.deleted_by: None},
                    synchronize_session=False,
                )
            )
            db.flush()

            duplicates = check_duplicate_active_keys(db)
            if duplicates:
                db.rollback()
                report["status"] = "error"
                report["error"] = "duplicate_active_field_keys_after_restore"
                report["duplicates"] = duplicates
                print("ROLLBACK: обнаружены дубли key внутри object type")
                print(json.dumps(duplicates, ensure_ascii=False, indent=2))
                return 1

            runtime_after_tx = runtime_counts(db)
            if runtime_after_tx != runtime_before:
                db.rollback()
                report["status"] = "error"
                report["error"] = "runtime_counts_changed_inside_transaction"
                report["runtime_after_in_tx"] = runtime_after_tx
                print("ROLLBACK: runtime counts changed")
                return 1

            db.commit()
            report["updated_rows"] = int(updated)
            report["status"] = "success"
        except Exception as exc:
            db.rollback()
            report["status"] = "error"
            report["error"] = str(exc)
            raise

        db2 = SessionLocal()
        try:
            after_active = field_counts_by_ot(db2, TARGET, active_only=True)
            after_deleted = (
                db2.query(func.count(DesignerFieldDefinition.id))
                .filter(
                    DesignerFieldDefinition.tenant_id == TARGET,
                    DesignerFieldDefinition.deleted_at.isnot(None),
                )
                .scalar()
            )
            runtime_after = runtime_counts(db2)
            duplicates_after = check_duplicate_active_keys(db2)

            report["after"] = {
                "active_fields_total": sum(after_active.values()),
                "active_fields_by_ot": after_active,
                "deleted_fields_total": int(after_deleted or 0),
                "runtime": runtime_after,
                "duplicate_active_keys": duplicates_after,
            }

            print("\n=== СТАТИСТИКА ПОСЛЕ APPLY ===")
            print(f"Активных полей до: {report['before']['active_fields_total']}")
            print(f"Активных полей после: {report['after']['active_fields_total']}")
            print(f"Удалённых полей до: {report['before']['deleted_fields_total']}")
            print(f"Удалённых полей после: {report['after']['deleted_fields_total']}")
            print(f"Восстановлено: {report['updated_rows']}")

            all_keys = sorted(
                set(before_active) | set(after_active) | set(grouped)
            )
            print("\nObject Type | Было | Стало")
            for ot_key in all_keys:
                b = before_active.get(ot_key, 0)
                a = after_active.get(ot_key, 0)
                if b or a or ot_key in grouped:
                    print(f"{ot_key} | {b} | {a}")

            print("\n=== RUNTIME КОНТРОЛЬ ===")
            for k in runtime_before:
                print(f"{k}: до={runtime_before[k]} после={runtime_after[k]}")

            print("\n=== ПРОВЕРКА ДУБЛЕЙ key ===")
            if duplicates_after:
                print("ОШИБКА: найдены дубли")
                print(json.dumps(duplicates_after, ensure_ascii=False, indent=2))
            else:
                print("Дублей нет")

        finally:
            db2.close()

        out = BACKEND_DIR / "scripts" / "apply_phase1_restore_fields_report.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nReport: {out}")
        return 0 if report["status"] == "success" else 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
