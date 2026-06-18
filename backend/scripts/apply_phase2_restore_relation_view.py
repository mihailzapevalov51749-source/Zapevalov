#!/usr/bin/env python3
"""APPLY Phase 2: create podmihail relation + michael.probnaya view from tenant 13 -> 1."""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from uuid import UUID, uuid4

BACKEND_DIR = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(SCRIPTS_DIR))

from structure_write_script_guard import guard_script_structure_write  # noqa: E402

from sqlalchemy import text  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.modules.platform.designer.object_types.models import DesignerObjectType  # noqa: E402
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition  # noqa: E402
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition  # noqa: E402
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition  # noqa: E402
from app.modules.tenant_bootstrap.context import CloneContext  # noqa: E402
from app.modules.tenant_bootstrap.json_remap import remap_json_field  # noqa: E402

SOURCE = 13
TARGET = 1
RELATION_KEY = "podmihail"
VIEW_OT_KEY = "michael"
VIEW_KEY = "probnaya"


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


def active_ot_by_key(db, tenant_id: int) -> dict[str, DesignerObjectType]:
    rows = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .all()
    )
    return {row.key: row for row in rows}


def build_remap_context(db) -> CloneContext:
    ctx = CloneContext(source_tenant_id=SOURCE, target_tenant_id=TARGET)
    src_ot = active_ot_by_key(db, SOURCE)
    tgt_ot = active_ot_by_key(db, TARGET)
    for key, src_row in src_ot.items():
        tgt_row = tgt_ot.get(key)
        if tgt_row:
            ctx.object_type_id_map[src_row.id] = tgt_row.id

    src_fields = (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == SOURCE,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .all()
    )
    tgt_fields = (
        db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == TARGET,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .all()
    )
    src_ot_id_to_key = {row.id: key for key, row in src_ot.items()}
    tgt_field_index: dict[tuple[str, str], UUID] = {}
    for row in tgt_fields:
        ot_key = next((k for k, ot in tgt_ot.items() if ot.id == row.object_type_id), None)
        if ot_key:
            tgt_field_index[(ot_key, row.key)] = row.id
    for row in src_fields:
        ot_key = src_ot_id_to_key.get(row.object_type_id)
        if not ot_key:
            continue
        tgt_id = tgt_field_index.get((ot_key, row.key))
        if tgt_id:
            ctx.field_id_map[row.id] = tgt_id

    src_relations = (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == SOURCE,
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .all()
    )
    tgt_relations = (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == TARGET,
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .all()
    )
    tgt_rel_by_key = {row.key: row.id for row in tgt_relations}
    for row in src_relations:
        tgt_id = tgt_rel_by_key.get(row.key)
        if tgt_id:
            ctx.relation_id_map[row.id] = tgt_id

    src_views = (
        db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.tenant_id == SOURCE,
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .all()
    )
    tgt_views = (
        db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.tenant_id == TARGET,
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .all()
    )
    tgt_view_index: dict[tuple[str, str], UUID] = {}
    for row in tgt_views:
        ot_key = next((k for k, ot in tgt_ot.items() if ot.id == row.object_type_id), None)
        if ot_key:
            tgt_view_index[(ot_key, row.key)] = row.id
    for row in src_views:
        ot_key = src_ot_id_to_key.get(row.object_type_id)
        if not ot_key:
            continue
        tgt_id = tgt_view_index.get((ot_key, row.key))
        if tgt_id:
            ctx.view_id_map[row.id] = tgt_id

    return ctx


def dry_check(db) -> dict:
    src_ot = active_ot_by_key(db, SOURCE)
    tgt_ot = active_ot_by_key(db, TARGET)
    src_michael = src_ot.get(VIEW_OT_KEY)
    tgt_michael = tgt_ot.get(VIEW_OT_KEY)

    src_rel = (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == SOURCE,
            DesignerRelationDefinition.key == RELATION_KEY,
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .first()
    )
    tgt_rel_active = (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == TARGET,
            DesignerRelationDefinition.key == RELATION_KEY,
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .first()
    )
    tgt_rel_deleted = (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == TARGET,
            DesignerRelationDefinition.key == RELATION_KEY,
            DesignerRelationDefinition.deleted_at.isnot(None),
        )
        .all()
    )

    src_view = None
    tgt_view_active = None
    if src_michael:
        src_view = (
            db.query(DesignerViewDefinition)
            .filter(
                DesignerViewDefinition.tenant_id == SOURCE,
                DesignerViewDefinition.object_type_id == src_michael.id,
                DesignerViewDefinition.key == VIEW_KEY,
                DesignerViewDefinition.deleted_at.is_(None),
            )
            .first()
        )
    if tgt_michael:
        tgt_view_active = (
            db.query(DesignerViewDefinition)
            .filter(
                DesignerViewDefinition.tenant_id == TARGET,
                DesignerViewDefinition.object_type_id == tgt_michael.id,
                DesignerViewDefinition.key == VIEW_KEY,
                DesignerViewDefinition.deleted_at.is_(None),
            )
            .first()
        )

    src_ot_by_id = {ot.id: key for key, ot in active_ot_by_key(db, SOURCE).items()}
    src_rel_ot_keys: dict[str, str | None] = {}
    if src_rel:
        src_rel_ot_keys = {
            "source": src_ot_by_id.get(src_rel.source_object_type_id),
            "target": src_ot_by_id.get(src_rel.target_object_type_id),
        }

    return {
        "relation": {
            "source_exists": src_rel is not None,
            "target_active_exists": tgt_rel_active is not None,
            "target_deleted_count": len(tgt_rel_deleted),
            "source": {
                "id": str(src_rel.id) if src_rel else None,
                "key": src_rel.key if src_rel else None,
                "name": src_rel.name if src_rel else None,
                "source_object_type_key": src_rel_ot_keys.get("source"),
                "target_object_type_key": src_rel_ot_keys.get("target"),
                "relation_type": src_rel.relation_type if src_rel else None,
            },
            "michael_tenant_13": str(src_michael.id) if src_michael else None,
            "michael_tenant_1": str(tgt_michael.id) if tgt_michael else None,
        },
        "view": {
            "source_exists": src_view is not None,
            "target_active_exists": tgt_view_active is not None,
            "source": {
                "id": str(src_view.id) if src_view else None,
                "key": src_view.key if src_view else None,
                "name": src_view.name if src_view else None,
                "view_type": src_view.view_type if src_view else None,
                "object_type_key": VIEW_OT_KEY,
            },
            "michael_tenant_1": str(tgt_michael.id) if tgt_michael else None,
        },
    }


def print_dry_check(check: dict) -> None:
    print("=== DRY CHECK: Relation ===")
    rel = check["relation"]
    print(f"source podmihail exists (T13): {rel['source_exists']}")
    print(f"target podmihail active (T1): {rel['target_active_exists']}")
    print(f"michael T13: {rel['michael_tenant_13']}")
    print(f"michael T1: {rel['michael_tenant_1']}")
    if rel["source_exists"]:
        s = rel["source"]
        print(f"source relation id: {s['id']}")
        print(f"source key: {s['key']}")
        print(f"source title: {s['name']}")
        print(f"source left object: {s['source_object_type_key']}")
        print(f"source right object: {s['target_object_type_key']}")

    print("\n=== DRY CHECK: View ===")
    view = check["view"]
    print(f"source probnaya exists (T13): {view['source_exists']}")
    print(f"target probnaya active (T1): {view['target_active_exists']}")
    print(f"michael T1: {view['michael_tenant_1']}")
    if view["source_exists"]:
        s = view["source"]
        print(f"source view id: {s['id']}")
        print(f"view key: {s['key']}")
        print(f"view type: {s['view_type']}")
        print(f"object type key: {s['object_type_key']}")


def apply_phase2(db) -> dict:
    guard_script_structure_write(db, TARGET, "apply_phase2_restore_relation_view")
    check = dry_check(db)
    runtime_before = runtime_counts(db)

    src_rel = (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == SOURCE,
            DesignerRelationDefinition.key == RELATION_KEY,
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .first()
    )
    src_view = None
    src_michael = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == SOURCE,
            DesignerObjectType.key == VIEW_OT_KEY,
            DesignerObjectType.deleted_at.is_(None),
        )
        .first()
    )
    tgt_michael = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == TARGET,
            DesignerObjectType.key == VIEW_OT_KEY,
            DesignerObjectType.deleted_at.is_(None),
        )
        .first()
    )
    if src_michael:
        src_view = (
            db.query(DesignerViewDefinition)
            .filter(
                DesignerViewDefinition.tenant_id == SOURCE,
                DesignerViewDefinition.object_type_id == src_michael.id,
                DesignerViewDefinition.key == VIEW_KEY,
                DesignerViewDefinition.deleted_at.is_(None),
            )
            .first()
        )

    existing_rel = (
        db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == TARGET,
            DesignerRelationDefinition.key == RELATION_KEY,
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .first()
    )
    existing_view = None
    if tgt_michael:
        existing_view = (
            db.query(DesignerViewDefinition)
            .filter(
                DesignerViewDefinition.tenant_id == TARGET,
                DesignerViewDefinition.object_type_id == tgt_michael.id,
                DesignerViewDefinition.key == VIEW_KEY,
                DesignerViewDefinition.deleted_at.is_(None),
            )
            .first()
        )

    if not src_rel:
        raise RuntimeError("Source relation podmihail not found in tenant 13")
    if not src_view:
        raise RuntimeError("Source view michael.probnaya not found in tenant 13")
    if not tgt_michael:
        raise RuntimeError("Target object type michael not found in tenant 1")
    if existing_rel:
        raise RuntimeError("Target relation podmihail already exists")
    if existing_view:
        raise RuntimeError("Target view michael.probnaya already exists")

    ctx = build_remap_context(db)
    if src_rel.source_object_type_id not in ctx.object_type_id_map:
        raise RuntimeError("Cannot remap source object_type_id for podmihail")
    if src_rel.target_object_type_id not in ctx.object_type_id_map:
        raise RuntimeError("Cannot remap target object_type_id for podmihail")
    if src_view.object_type_id not in ctx.object_type_id_map:
        raise RuntimeError("Cannot remap object_type_id for probnaya view")

    created_rel_id = None
    created_view_id = None

    try:
        new_rel_id = uuid4()
        rel_clone = DesignerRelationDefinition(
            id=new_rel_id,
            tenant_id=TARGET,
            key=src_rel.key,
            name=src_rel.name,
            description=src_rel.description,
            source_object_type_id=ctx.object_type_id_map[src_rel.source_object_type_id],
            target_object_type_id=ctx.object_type_id_map[src_rel.target_object_type_id],
            relation_type=src_rel.relation_type,
            reverse_name=src_rel.reverse_name,
            sort_order=src_rel.sort_order,
            is_required=src_rel.is_required,
            is_system=src_rel.is_system,
            is_active=src_rel.is_active,
            bidirectional=src_rel.bidirectional,
            cascade_delete=src_rel.cascade_delete,
            settings_json=remap_json_field(src_rel.settings_json, ctx),
            validation_json=remap_json_field(src_rel.validation_json, ctx),
            draft_revision=src_rel.draft_revision,
            created_by=None,
            updated_by=None,
        )
        db.add(rel_clone)
        ctx.relation_id_map[src_rel.id] = new_rel_id
        created_rel_id = new_rel_id
        db.flush()

        new_view_id = uuid4()
        view_clone = DesignerViewDefinition(
            id=new_view_id,
            tenant_id=TARGET,
            object_type_id=ctx.object_type_id_map[src_view.object_type_id],
            key=src_view.key,
            name=src_view.name,
            description=src_view.description,
            view_type=src_view.view_type,
            is_default=src_view.is_default,
            is_system=src_view.is_system,
            is_active=src_view.is_active,
            sort_order=src_view.sort_order,
            settings_json=remap_json_field(src_view.settings_json, ctx),
            layout_json=remap_json_field(src_view.layout_json, ctx),
            filters_json=remap_json_field(src_view.filters_json, ctx),
            visibility_json=remap_json_field(src_view.visibility_json, ctx),
            draft_revision=src_view.draft_revision,
            created_by=None,
            updated_by=None,
        )
        db.add(view_clone)
        created_view_id = new_view_id
        db.flush()

        runtime_in_tx = runtime_counts(db)
        if runtime_in_tx != runtime_before:
            db.rollback()
            raise RuntimeError(f"Runtime changed inside transaction: {runtime_in_tx}")

        db.commit()
    except Exception:
        db.rollback()
        raise

    return {
        "status": "success",
        "dry_check": check,
        "runtime_before": runtime_before,
        "runtime_after": runtime_counts(db),
        "created": {
            "relation": {
                "id": str(created_rel_id),
                "key": RELATION_KEY,
                "tenant_id": TARGET,
            },
            "view": {
                "id": str(created_view_id),
                "key": VIEW_KEY,
                "object_type_key": VIEW_OT_KEY,
                "view_type": src_view.view_type,
                "tenant_id": TARGET,
            },
        },
    }


def run_dry_run_summary() -> dict:
    subprocess.run(
        [sys.executable, str(BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.py")],
        check=True,
    )
    path = BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload.get("summary", payload)


def main() -> int:
    db = SessionLocal()
    report: dict = {"phase": "apply_phase2", "started_at": datetime.now().isoformat()}
    try:
        check = dry_check(db)
        report["dry_check"] = check
        print_dry_check(check)

        dry_run_before = run_dry_run_summary()
        report["dry_run_before"] = dry_run_before.get("summary", {})

        print("\n=== APPLY ===")
        result = apply_phase2(db)
        report.update(result)

        dry_run_after = run_dry_run_summary()
        report["dry_run_after"] = dry_run_after.get("summary", {})

        print("\n=== POST CHECK: Relation ===")
        print(f"created: yes")
        print(f"id: {result['created']['relation']['id']}")
        print(f"key: {result['created']['relation']['key']}")
        print(f"tenant_id: {result['created']['relation']['tenant_id']}")

        print("\n=== POST CHECK: View ===")
        print(f"created: yes")
        print(f"id: {result['created']['view']['id']}")
        print(f"key: {result['created']['view']['key']}")
        print(f"type: {result['created']['view']['view_type']}")
        print(f"tenant_id: {result['created']['view']['tenant_id']}")

        print("\n=== RUNTIME SAFETY ===")
        for k, v in result["runtime_before"].items():
            print(f"{k}: before={v} after={result['runtime_after'][k]}")

        print("\n=== DRY RUN DELTA ===")
        b = report["dry_run_before"].get("per_entity", {})
        a = report["dry_run_after"].get("per_entity", {})
        print(f"Relations create: {b.get('relations', {}).get('create')} -> {a.get('relations', {}).get('create')}")
        print(f"Views create: {b.get('views', {}).get('create')} -> {a.get('views', {}).get('create')}")

        out = BACKEND_DIR / "scripts" / "apply_phase2_restore_relation_view_report.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nReport: {out}")
        return 0
    except Exception as exc:
        report["status"] = "failed"
        report["error"] = str(exc)
        out = BACKEND_DIR / "scripts" / "apply_phase2_restore_relation_view_report.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"FAILED: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
