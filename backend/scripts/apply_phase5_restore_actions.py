#!/usr/bin/env python3
"""APPLY Phase 5: restore action definitions/forms/placements from tenant 13 -> tenant 1."""

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

from sqlalchemy import func, text  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.modules.chats.models import Chat, ChatMessage, ChatParticipant  # noqa: E402
from app.modules.document_libraries.models import DocumentLibrary, LibraryDocument  # noqa: E402
from app.modules.navigation.models import NavigationItem  # noqa: E402
from app.modules.pages.models import Page  # noqa: E402
from app.modules.platform.action_engine.action_definitions.models import (  # noqa: E402
    DesignerActionDefinition,
)
from app.modules.platform.action_engine.action_forms.models import (  # noqa: E402
    DesignerActionForm,
    DesignerActionFormField,
)
from app.modules.platform.action_engine.action_placements.models import (  # noqa: E402
    DesignerActionPlacement,
)
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition  # noqa: E402
from app.modules.platform.designer.object_types.models import DesignerObjectType  # noqa: E402
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition  # noqa: E402
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition  # noqa: E402
from app.modules.platform.designer.workspaces.models import DesignerWorkspace  # noqa: E402
from app.modules.tenant_bootstrap.clone_tenant_structure import (  # noqa: E402
    _clone_action_form_fields,
    _clone_action_forms,
    _clone_action_placements,
)
from app.modules.tenant_bootstrap.context import CloneContext  # noqa: E402
from app.modules.users.models import User  # noqa: F401, E402

SOURCE = 13
TARGET = 1

TARGET_ACTIONS: tuple[tuple[str, str], ...] = (
    ("istoriya", "sozdat_zapis"),
    ("zadachnik", "sozdat_cheta"),
    ("napravleniya", "sozdat_zadachu"),
)


def _page_sig(page: Page) -> str:
    return f"{page.title}|{page.sort_order}|{bool(page.is_home)}"


def action_counts(db) -> dict[str, int]:
    return {
        "action_definitions": int(
            db.query(func.count(DesignerActionDefinition.id))
            .filter(DesignerActionDefinition.tenant_id == TARGET)
            .scalar()
            or 0
        ),
        "action_forms": int(
            db.query(func.count(DesignerActionForm.id))
            .filter(DesignerActionForm.tenant_id == TARGET)
            .scalar()
            or 0
        ),
        "action_placements": int(
            db.query(func.count(DesignerActionPlacement.id))
            .filter(DesignerActionPlacement.tenant_id == TARGET)
            .scalar()
            or 0
        ),
    }


def safety_counts(db) -> dict[str, int]:
    return {
        **action_counts(db),
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
        "document_libraries": int(db.query(func.count(DocumentLibrary.id)).scalar() or 0),
        "library_documents": int(db.query(func.count(LibraryDocument.id)).scalar() or 0),
        "chats": int(db.query(func.count(Chat.id)).scalar() or 0),
        "chat_messages": int(db.query(func.count(ChatMessage.id)).scalar() or 0),
        "chat_participants": int(db.query(func.count(ChatParticipant.id)).scalar() or 0),
        "notifications": int(db.execute(text("SELECT COUNT(*) FROM notifications")).scalar() or 0),
        "comments": int(db.execute(text("SELECT COUNT(*) FROM comments")).scalar() or 0),
        "notes": int(db.execute(text("SELECT COUNT(*) FROM notes")).scalar() or 0),
    }


def build_remap_context(db) -> CloneContext:
    ctx = CloneContext(source_tenant_id=SOURCE, target_tenant_id=TARGET)

    src_pages = {
        _page_sig(p): p.id
        for p in db.query(Page).filter(Page.portal_id == SOURCE, Page.deleted_at.is_(None)).all()
    }
    tgt_pages = {
        _page_sig(p): p.id
        for p in db.query(Page).filter(Page.portal_id == TARGET, Page.deleted_at.is_(None)).all()
    }
    for sig, src_id in src_pages.items():
        tgt_id = tgt_pages.get(sig)
        if tgt_id:
            ctx.page_id_map[src_id] = tgt_id

    src_ot = {
        row.key: row
        for row in db.query(DesignerObjectType)
        .filter(DesignerObjectType.tenant_id == SOURCE, DesignerObjectType.deleted_at.is_(None))
        .all()
    }
    tgt_ot = {
        row.key: row
        for row in db.query(DesignerObjectType)
        .filter(DesignerObjectType.tenant_id == TARGET, DesignerObjectType.deleted_at.is_(None))
        .all()
    }
    for key, src_row in src_ot.items():
        tgt_row = tgt_ot.get(key)
        if tgt_row:
            ctx.object_type_id_map[src_row.id] = tgt_row.id

    src_ot_id_to_key = {ot.id: key for key, ot in src_ot.items()}
    tgt_field_index: dict[tuple[str, str], UUID] = {}
    for row in db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == TARGET,
        DesignerFieldDefinition.deleted_at.is_(None),
    ).all():
        ot_key = next((k for k, ot in tgt_ot.items() if ot.id == row.object_type_id), None)
        if ot_key:
            tgt_field_index[(ot_key, row.key)] = row.id
    for row in db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == SOURCE,
        DesignerFieldDefinition.deleted_at.is_(None),
    ).all():
        ot_key = src_ot_id_to_key.get(row.object_type_id)
        if ot_key and (ot_key, row.key) in tgt_field_index:
            ctx.field_id_map[row.id] = tgt_field_index[(ot_key, row.key)]

    tgt_view_index: dict[tuple[str, str], UUID] = {}
    for row in db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == TARGET,
        DesignerViewDefinition.deleted_at.is_(None),
    ).all():
        ot_key = next((k for k, ot in tgt_ot.items() if ot.id == row.object_type_id), None)
        if ot_key:
            tgt_view_index[(ot_key, row.key)] = row.id
    for row in db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == SOURCE,
        DesignerViewDefinition.deleted_at.is_(None),
    ).all():
        ot_key = src_ot_id_to_key.get(row.object_type_id)
        if ot_key and (ot_key, row.key) in tgt_view_index:
            ctx.view_id_map[row.id] = tgt_view_index[(ot_key, row.key)]

    for row in db.query(DesignerRelationDefinition).filter(
        DesignerRelationDefinition.tenant_id == SOURCE,
        DesignerRelationDefinition.deleted_at.is_(None),
    ).all():
        tgt = db.query(DesignerRelationDefinition).filter(
            DesignerRelationDefinition.tenant_id == TARGET,
            DesignerRelationDefinition.key == row.key,
            DesignerRelationDefinition.deleted_at.is_(None),
        ).first()
        if tgt:
            ctx.relation_id_map[row.id] = tgt.id

    src_ws = {
        row.slug: row
        for row in db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.tenant_id == SOURCE, DesignerWorkspace.deleted_at.is_(None))
        .all()
    }
    tgt_ws = {
        row.slug: row
        for row in db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.tenant_id == TARGET, DesignerWorkspace.deleted_at.is_(None))
        .all()
    }
    for slug, src_row in src_ws.items():
        tgt_row = tgt_ws.get(slug)
        if tgt_row:
            ctx.workspace_id_map[src_row.id] = tgt_row.id

    return ctx


def _ot_key(db, tenant_id: int, object_type_id: UUID | None) -> str | None:
    if not object_type_id:
        return None
    row = (
        db.query(DesignerObjectType)
        .filter(DesignerObjectType.id == object_type_id)
        .first()
    )
    return row.key if row else None


def _find_source_action(db, ot_key: str, action_key: str) -> DesignerActionDefinition | None:
    ot = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == SOURCE,
            DesignerObjectType.key == ot_key,
            DesignerObjectType.deleted_at.is_(None),
        )
        .first()
    )
    if not ot:
        return None
    return (
        db.query(DesignerActionDefinition)
        .filter(
            DesignerActionDefinition.tenant_id == SOURCE,
            DesignerActionDefinition.object_type_id == ot.id,
            DesignerActionDefinition.key == action_key,
        )
        .first()
    )


def _find_target_action(db, ot_key: str, action_key: str) -> DesignerActionDefinition | None:
    ot = (
        db.query(DesignerObjectType)
        .filter(
            DesignerObjectType.tenant_id == TARGET,
            DesignerObjectType.key == ot_key,
            DesignerObjectType.deleted_at.is_(None),
        )
        .first()
    )
    if not ot:
        return None
    return (
        db.query(DesignerActionDefinition)
        .filter(
            DesignerActionDefinition.tenant_id == TARGET,
            DesignerActionDefinition.object_type_id == ot.id,
            DesignerActionDefinition.key == action_key,
        )
        .first()
    )


def build_plan(db) -> dict:
    ctx = build_remap_context(db)
    plan_items = []

    for ot_key, action_key in TARGET_ACTIONS:
        src = _find_source_action(db, ot_key, action_key)
        tgt = _find_target_action(db, ot_key, action_key)
        item: dict = {
            "object_type_key": ot_key,
            "action_key": action_key,
            "composite_key": f"{ot_key}:{action_key}",
        }

        if not src:
            item["action"] = "SKIP"
            item["reason"] = "missing_in_source"
            plan_items.append(item)
            continue

        item["source"] = {
            "id": str(src.id),
            "key": src.key,
            "title": src.name,
            "object_type": ot_key,
            "tenant": SOURCE,
            "action_type_key": src.action_type_key,
            "is_active": src.is_active,
            "target_object_type": _ot_key(db, SOURCE, src.target_object_type_id),
            "auto_link_relation_id": str(src.auto_link_relation_id)
            if src.auto_link_relation_id
            else None,
        }

        src_form = (
            db.query(DesignerActionForm)
            .filter(DesignerActionForm.action_definition_id == src.id)
            .first()
        )
        src_placements = (
            db.query(DesignerActionPlacement)
            .filter(DesignerActionPlacement.action_definition_id == src.id)
            .all()
        )
        form_fields = []
        if src_form:
            for ff in (
                db.query(DesignerActionFormField)
                .filter(DesignerActionFormField.action_form_id == src_form.id)
                .all()
            ):
                fd = (
                    db.query(DesignerFieldDefinition)
                    .filter(DesignerFieldDefinition.id == ff.field_definition_id)
                    .first()
                )
                field_ot = _ot_key(db, SOURCE, fd.object_type_id) if fd else None
                mapped = ff.field_definition_id in ctx.field_id_map if fd else False
                form_fields.append(
                    {
                        "field_key": fd.key if fd else None,
                        "object_type": field_ot,
                        "mapped_in_t1": mapped,
                    }
                )

        item["target_status"] = {
            "exists": tgt is not None,
            "active": tgt.is_active if tgt else None,
            "has_form": bool(
                db.query(DesignerActionForm)
                .filter(DesignerActionForm.action_definition_id == tgt.id)
                .first()
            )
            if tgt
            else False,
            "placement_count": (
                db.query(DesignerActionPlacement)
                .filter(DesignerActionPlacement.action_definition_id == tgt.id)
                .count()
                if tgt
                else 0
            ),
        }
        item["dependencies"] = {
            "object_type_mapped": src.object_type_id in ctx.object_type_id_map,
            "target_object_type_mapped": (
                src.target_object_type_id is None
                or src.target_object_type_id in ctx.object_type_id_map
            ),
            "auto_link_relation_mapped": (
                src.auto_link_relation_id is None
                or src.auto_link_relation_id in ctx.relation_id_map
            ),
            "form_fields": form_fields,
            "placements": [p.placement_key for p in src_placements],
        }

        missing_fields = [f for f in form_fields if not f["mapped_in_t1"]]
        deps_ok = (
            item["dependencies"]["object_type_mapped"]
            and item["dependencies"]["target_object_type_mapped"]
            and item["dependencies"]["auto_link_relation_mapped"]
            and not missing_fields
        )
        item["dependencies_ok"] = deps_ok

        if tgt and tgt.is_active:
            item["action"] = "SKIP"
            item["reason"] = "already_exists"
        elif tgt and not tgt.is_active:
            item["action"] = "UPDATE"
            item["reason"] = "reactivate_existing"
        elif deps_ok:
            item["action"] = "CREATE"
        else:
            item["action"] = "BLOCKED"
            item["reason"] = "missing_dependencies"
            item["missing_fields"] = missing_fields

        plan_items.append(item)

    return {
        "plan": plan_items,
        "to_create": [p for p in plan_items if p["action"] == "CREATE"],
        "to_update": [p for p in plan_items if p["action"] == "UPDATE"],
        "to_skip": [p for p in plan_items if p["action"] == "SKIP"],
        "blocked": [p for p in plan_items if p["action"] == "BLOCKED"],
    }


def print_dry_check(plan: dict) -> None:
    print("=== ACTION DEFINITIONS (DRY CHECK) ===")
    for item in plan["plan"]:
        print(
            f"{item['action']} | {item['composite_key']} | "
            f"exists={item.get('target_status', {}).get('exists')} | "
            f"deps_ok={item.get('dependencies_ok')}"
        )
        if "source" in item:
            src = item["source"]
            print(
                f"  source id={src['id']} title={src['title']} "
                f"type={src['action_type_key']} target_ot={src['target_object_type']}"
            )
        if item.get("dependencies"):
            deps = item["dependencies"]
            print(
                f"  placements={deps['placements']} form_fields="
                f"{[f['field_key'] for f in deps['form_fields']]}"
            )
    print(f"\ncreate={len(plan['to_create'])} skip={len(plan['to_skip'])} blocked={len(plan['blocked'])}")


def clone_action_definition(
    db,
    ctx: CloneContext,
    row: DesignerActionDefinition,
) -> DesignerActionDefinition:
    new_id = uuid4()
    target_object_type_id = (
        ctx.object_type_id_map.get(row.target_object_type_id)
        if row.target_object_type_id
        else None
    )
    auto_link_relation_id = (
        ctx.relation_id_map.get(row.auto_link_relation_id)
        if row.auto_link_relation_id
        else None
    )
    clone = DesignerActionDefinition(
        id=new_id,
        tenant_id=ctx.target_tenant_id,
        object_type_id=ctx.object_type_id_map[row.object_type_id],
        target_object_type_id=target_object_type_id,
        auto_link_enabled=row.auto_link_enabled,
        auto_link_relation_id=auto_link_relation_id,
        key=row.key,
        name=row.name,
        description=row.description,
        action_type_key=row.action_type_key,
        is_active=row.is_active,
        is_system=row.is_system,
    )
    db.add(clone)
    ctx.action_id_map[row.id] = new_id
    return clone


def apply_phase5(db, plan: dict) -> dict:
    guard_script_structure_write(db, TARGET, "apply_phase5_restore_actions")
    before = safety_counts(db)
    ctx = build_remap_context(db)

    created_actions: list[dict] = []
    created_forms: list[dict] = []
    created_placements: list[dict] = []
    updated: list[dict] = []
    skipped: list[dict] = []

    try:
        for item in plan["to_create"]:
            src = _find_source_action(db, item["object_type_key"], item["action_key"])
            if not src:
                continue
            clone = clone_action_definition(db, ctx, src)
            db.flush()
            created_actions.append(
                {
                    "id": str(clone.id),
                    "composite_key": item["composite_key"],
                    "key": clone.key,
                    "title": clone.name,
                    "object_type_key": item["object_type_key"],
                    "target_object_type_id": str(clone.target_object_type_id)
                    if clone.target_object_type_id
                    else None,
                }
            )

        for item in plan["to_update"]:
            tgt = _find_target_action(db, item["object_type_key"], item["action_key"])
            if not tgt:
                continue
            tgt.is_active = True
            updated.append({"id": str(tgt.id), "composite_key": item["composite_key"]})

        if ctx.action_id_map:
            _clone_action_placements(db, ctx)
            _clone_action_forms(db, ctx)
            _clone_action_form_fields(db, ctx)
            db.flush()

            for src_id, tgt_id in ctx.action_id_map.items():
                for row in (
                    db.query(DesignerActionPlacement)
                    .filter(
                        DesignerActionPlacement.tenant_id == TARGET,
                        DesignerActionPlacement.action_definition_id == tgt_id,
                    )
                    .all()
                ):
                    created_placements.append(
                        {
                            "id": str(row.id),
                            "action_definition_id": str(tgt_id),
                            "placement_key": row.placement_key,
                        }
                    )
                form = (
                    db.query(DesignerActionForm)
                    .filter(
                        DesignerActionForm.tenant_id == TARGET,
                        DesignerActionForm.action_definition_id == tgt_id,
                    )
                    .first()
                )
                if form:
                    created_forms.append(
                        {
                            "id": str(form.id),
                            "action_definition_id": str(tgt_id),
                            "title": form.title,
                            "field_count": db.query(DesignerActionFormField)
                            .filter(DesignerActionFormField.action_form_id == form.id)
                            .count(),
                        }
                    )

        for item in plan["to_skip"]:
            skipped.append({"composite_key": item["composite_key"], "reason": item.get("reason")})

        db.flush()
        after_in_tx = safety_counts(db)
        for key in (
            "runtime_entities",
            "runtime_entity_values",
            "runtime_relation_instances",
            "document_libraries",
            "library_documents",
            "chats",
            "chat_messages",
            "chat_participants",
            "notifications",
            "comments",
            "notes",
        ):
            if after_in_tx[key] != before[key]:
                db.rollback()
                raise RuntimeError(f"Safety count changed for {key}")

        db.commit()
    except Exception:
        db.rollback()
        raise

    after = safety_counts(db)
    return {
        "before": before,
        "after": after,
        "created_actions": created_actions,
        "created_forms": created_forms,
        "created_placements": created_placements,
        "updated": updated,
        "skipped": skipped,
    }


def run_dry_run() -> dict:
    subprocess.run(
        [sys.executable, str(BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.py")],
        check=True,
    )
    payload = json.loads(
        (BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.json").read_text(encoding="utf-8")
    )
    return payload.get("summary", {}).get("per_entity", {})


def publish_readiness_check(db, dry_summary: dict) -> dict:
    active_ot_ids = {
        row[0]
        for row in db.query(DesignerObjectType.id)
        .filter(
            DesignerObjectType.tenant_id == TARGET,
            DesignerObjectType.deleted_at.is_(None),
        )
        .all()
    }
    active_ws_ids = {
        row[0]
        for row in db.query(DesignerWorkspace.id)
        .filter(
            DesignerWorkspace.tenant_id == TARGET,
            DesignerWorkspace.deleted_at.is_(None),
        )
        .all()
    }
    active_page_ids = {
        p.id
        for p in db.query(Page)
        .filter(Page.portal_id == TARGET, Page.deleted_at.is_(None))
        .all()
    }
    active_field_ids = {
        row[0]
        for row in db.query(DesignerFieldDefinition.id)
        .filter(
            DesignerFieldDefinition.tenant_id == TARGET,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .all()
    }

    broken_nav = []
    for nav in db.query(NavigationItem).filter(
        NavigationItem.portal_id == TARGET,
        NavigationItem.deleted_at.is_(None),
    ).all():
        issues = []
        if nav.page_id and nav.page_id not in active_page_ids:
            issues.append("broken_page_id")
        if nav.object_type_id and nav.object_type_id not in active_ot_ids:
            issues.append("broken_object_type_id")
        if issues:
            broken_nav.append({"id": nav.id, "title": nav.title, "issues": issues})

    broken_actions = []
    for act in db.query(DesignerActionDefinition).filter(
        DesignerActionDefinition.tenant_id == TARGET
    ).all():
        issues = []
        if act.object_type_id not in active_ot_ids:
            issues.append("broken_object_type_id")
        if act.target_object_type_id and act.target_object_type_id not in active_ot_ids:
            issues.append("broken_target_object_type_id")
        if issues:
            broken_actions.append(
                {
                    "id": str(act.id),
                    "key": act.key,
                    "issues": issues,
                }
            )

    broken_form_fields = []
    for ff in db.query(DesignerActionFormField).filter(
        DesignerActionFormField.tenant_id == TARGET
    ).all():
        if ff.field_definition_id not in active_field_ids:
            broken_form_fields.append(
                {
                    "id": str(ff.id),
                    "field_definition_id": str(ff.field_definition_id),
                }
            )

    url_refs = []
    for nav in db.query(NavigationItem).filter(NavigationItem.portal_id == TARGET).all():
        if nav.url and (f"/portal/{SOURCE}" in nav.url or f"/designer/tenant/{SOURCE}" in nav.url):
            url_refs.append({"table": "navigation_items", "id": nav.id, "url": nav.url})

    recovery_remainder = {
        entity: dry_summary.get(entity, {}).get("create", 0)
        for entity in (
            "fields",
            "relations",
            "views",
            "workspaces",
            "workspace_tabs",
            "navigation",
            "actions",
        )
    }
    recovery_complete = all(v == 0 for v in recovery_remainder.values())

    issues_found = any(
        [
            broken_nav,
            broken_actions,
            broken_form_fields,
            url_refs,
            not recovery_complete,
        ]
    )

    return {
        "ready": not issues_found,
        "broken_navigation": broken_nav,
        "broken_actions": broken_actions,
        "broken_form_fields": broken_form_fields,
        "broken_workspace_references": [],
        "tenant_13_url_references": url_refs,
        "recovery_remainder": recovery_remainder,
        "recovery_complete": recovery_complete,
    }


def json_safe(value):
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, tuple):
        return [json_safe(v) for v in value]
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    return value


def main() -> int:
    db = SessionLocal()
    report: dict = {"phase": "apply_phase5", "started_at": datetime.now().isoformat()}
    try:
        plan = build_plan(db)
        report["dry_check"] = plan
        print_dry_check(plan)

        if plan["blocked"]:
            raise RuntimeError(f"Blocked actions: {[p['composite_key'] for p in plan['blocked']]}")

        dry_before = run_dry_run()
        report["dry_run_before"] = dry_before

        print("\n=== APPLY ===")
        result = apply_phase5(db, plan)
        report["apply_result"] = result
        report["status"] = "success"

        dry_after = run_dry_run()
        report["dry_run_after"] = dry_after
        report["publish_readiness"] = publish_readiness_check(db, dry_after)

        print("\n=== POST CHECK ===")
        print(
            f"actions: {result['before']['action_definitions']} -> "
            f"{result['after']['action_definitions']}"
        )
        print(
            f"forms: {result['before']['action_forms']} -> {result['after']['action_forms']}"
        )
        print(
            f"placements: {result['before']['action_placements']} -> "
            f"{result['after']['action_placements']}"
        )

        print("\n=== SAFETY ===")
        for key in result["before"]:
            if key.startswith("action_"):
                continue
            print(f"{key}: {result['before'][key]} -> {result['after'][key]}")

        print("\n=== DRY RUN ===")
        for entity in (
            "fields",
            "relations",
            "views",
            "workspaces",
            "workspace_tabs",
            "navigation",
            "actions",
        ):
            print(
                f"{entity}: {dry_before.get(entity, {}).get('create')} -> "
                f"{dry_after.get(entity, {}).get('create')}"
            )

        print("\n=== PUBLISH READINESS ===")
        print("ready:", report["publish_readiness"]["ready"])
        print("recovery_complete:", report["publish_readiness"]["recovery_complete"])

        out = BACKEND_DIR / "scripts" / "apply_phase5_restore_actions_report.json"
        out.write_text(
            json.dumps(json_safe(report), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\nReport: {out}")
        return 0
    except Exception as exc:
        report["status"] = "failed"
        report["error"] = str(exc)
        out = BACKEND_DIR / "scripts" / "apply_phase5_restore_actions_report.json"
        out.write_text(
            json.dumps(json_safe(report), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"FAILED: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
