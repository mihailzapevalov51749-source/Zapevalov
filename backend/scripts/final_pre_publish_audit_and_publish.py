#!/usr/bin/env python3
"""Final pre-publish audit and publish for tenant 1."""

from __future__ import annotations

import json
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import func, text  # noqa: E402

from app.modules.blocks.models import Block  # noqa: E402
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
from app.modules.platform.designer.publish.models import (  # noqa: E402
    DesignerMetadataSnapshot,
    DesignerPublishRecord,
)
from app.modules.platform.designer.publish.service import (  # noqa: E402
    get_latest_publish_info,
    publish_tenant_catalog,
    validate_publish,
)
from app.modules.platform.designer.relation_definitions.models import (  # noqa: E402
    DesignerRelationDefinition,
)
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition  # noqa: E402
from app.modules.platform.designer.workspaces.models import (  # noqa: E402
    DesignerWorkspace,
    DesignerWorkspaceTab,
)
from app.modules.portals.models import Portal  # noqa: F401, E402
from app.modules.users.models import User  # noqa: F401, E402

TENANT = 1
SOURCE_TENANT = 13
OFFICE_WORKSPACES = ("razrabotka", "teh-podderzhka", "upravlenie-platformoy", "otdel-kadrov-2")
OFFICE_NAV = ("Главная", "Разработка", "Тех. поддержка", "Управление платформой", "Отдел кадров")
STUDIO_NAV = ("Объекты", "Связи", "Представления", "Пользователи", "Системные настройки")


def safety_counts(db) -> dict[str, int]:
    return {
        "runtime_entities": int(
            db.execute(
                text(
                    "SELECT COUNT(*) FROM runtime_entities "
                    "WHERE tenant_id=:t AND deleted_at IS NULL"
                ),
                {"t": TENANT},
            ).scalar()
            or 0
        ),
        "runtime_entity_values": int(
            db.execute(
                text("SELECT COUNT(*) FROM runtime_entity_values WHERE tenant_id=:t"),
                {"t": TENANT},
            ).scalar()
            or 0
        ),
        "runtime_relation_instances": int(
            db.execute(
                text("SELECT COUNT(*) FROM runtime_relation_instances WHERE tenant_id=:t"),
                {"t": TENANT},
            ).scalar()
            or 0
        ),
        "document_libraries": int(db.query(func.count(DocumentLibrary.id)).scalar() or 0),
        "library_documents": int(db.query(func.count(LibraryDocument.id)).scalar() or 0),
        "chats": int(db.query(func.count(Chat.id)).scalar() or 0),
        "chat_messages": int(db.query(func.count(ChatMessage.id)).scalar() or 0),
        "chat_participants": int(db.query(func.count(ChatParticipant.id)).scalar() or 0),
    }


def _uuid_set(values) -> set[str]:
    return {str(value) for value in values if value is not None}


def active_ot_ids(db) -> set[str]:
    return _uuid_set(
        row[0]
        for row in db.query(DesignerObjectType.id)
        .filter(
            DesignerObjectType.tenant_id == TENANT,
            DesignerObjectType.deleted_at.is_(None),
        )
        .all()
    )


def active_field_ids(db) -> set[str]:
    return _uuid_set(
        row[0]
        for row in db.query(DesignerFieldDefinition.id)
        .filter(
            DesignerFieldDefinition.tenant_id == TENANT,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .all()
    )


def active_view_ids(db) -> set[str]:
    return _uuid_set(
        row[0]
        for row in db.query(DesignerViewDefinition.id)
        .filter(
            DesignerViewDefinition.tenant_id == TENANT,
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .all()
    )


def _uuid(value) -> str | None:
    return str(value) if value is not None else None


def active_page_ids(db) -> set[int]:
    return {
        p.id
        for p in db.query(Page)
        .filter(Page.portal_id == TENANT, Page.deleted_at.is_(None))
        .all()
    }


def active_ws_ids(db) -> set[int]:
    return {
        row[0]
        for row in db.query(DesignerWorkspace.id)
        .filter(
            DesignerWorkspace.tenant_id == TENANT,
            DesignerWorkspace.deleted_at.is_(None),
        )
        .all()
    }


def audit_object_types(db) -> dict:
    rows = db.query(DesignerObjectType).filter(DesignerObjectType.tenant_id == TENANT).all()
    active = [r for r in rows if r.deleted_at is None]
    deleted = [r for r in rows if r.deleted_at is not None]
    by_key: dict[str, list] = defaultdict(list)
    for row in active:
        by_key[row.key].append(str(row.id))
    duplicates = {k: v for k, v in by_key.items() if len(v) > 1}
    return {
        "total": len(rows),
        "active": len(active),
        "deleted": len(deleted),
        "duplicate_active_keys": duplicates,
        "broken_references": [],
    }


def audit_fields(db) -> dict:
    ot_ids = active_ot_ids(db)
    all_ot_ids = _uuid_set(
        row[0]
        for row in db.query(DesignerObjectType.id).filter(DesignerObjectType.tenant_id == TENANT).all()
    )
    ot_key_by_id = {
        row.id: row.key
        for row in db.query(DesignerObjectType).filter(DesignerObjectType.tenant_id == TENANT).all()
    }
    fields = db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == TENANT,
        DesignerFieldDefinition.deleted_at.is_(None),
    ).all()
    per_ot: dict[str, int] = defaultdict(int)
    broken_ot: list[dict] = []
    dup_keys: list[dict] = []
    seen: dict[str, set[str]] = defaultdict(set)
    for field in fields:
        field_ot_id = _uuid(field.object_type_id)
        per_ot[ot_key_by_id.get(field.object_type_id, field_ot_id or "")] += 1
        if field_ot_id not in all_ot_ids:
            broken_ot.append({"field_id": str(field.id), "object_type_id": field_ot_id})
        elif field_ot_id not in ot_ids:
            broken_ot.append(
                {
                    "field_id": str(field.id),
                    "object_type_id": str(field.object_type_id),
                    "issue": "object_type_deleted",
                }
            )
        if field_ot_id and field.key in seen[field_ot_id]:
            dup_keys.append(
                {
                    "object_type": ot_key_by_id.get(field.object_type_id),
                    "field_key": field.key,
                }
            )
        if field_ot_id:
            seen[field_ot_id].add(field.key)
    return {
        "total_active": len(fields),
        "per_object_type": dict(sorted(per_ot.items())),
        "duplicate_field_keys": dup_keys,
        "broken_object_type_id": broken_ot,
    }


def audit_relations(db) -> dict:
    ot_ids = active_ot_ids(db)
    relations = db.query(DesignerRelationDefinition).filter(
        DesignerRelationDefinition.tenant_id == TENANT,
        DesignerRelationDefinition.deleted_at.is_(None),
    ).all()
    broken = []
    for rel in relations:
        issues = []
        if _uuid(rel.source_object_type_id) not in ot_ids:
            issues.append("broken_source_object_type_id")
        if _uuid(rel.target_object_type_id) not in ot_ids:
            issues.append("broken_target_object_type_id")
        if issues:
            broken.append({"key": rel.key, "id": str(rel.id), "issues": issues})
    return {"total": len(relations), "broken": broken}


def _scan_json_refs(value: Any, field_keys: set[str], relation_ids: set[str]) -> list[str]:
    issues: list[str] = []
    if isinstance(value, dict):
        for k, v in value.items():
            if k in ("field_id", "field_definition_id", "fieldDefinitionId") and v:
                if str(v) not in field_keys and len(str(v)) > 20:
                    issues.append(f"unknown_field_uuid:{v}")
            if k in ("relation_id", "relationId") and v:
                if str(v) not in relation_ids:
                    issues.append(f"unknown_relation_uuid:{v}")
            issues.extend(_scan_json_refs(v, field_keys, relation_ids))
    elif isinstance(value, list):
        for item in value:
            issues.extend(_scan_json_refs(item, field_keys, relation_ids))
    return issues


def audit_views(db) -> dict:
    ot_ids = active_ot_ids(db)
    field_ids = active_field_ids(db)
    relation_ids = {
        str(row[0])
        for row in db.query(DesignerRelationDefinition.id)
        .filter(
            DesignerRelationDefinition.tenant_id == TENANT,
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .all()
    }
    views = db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == TENANT,
        DesignerViewDefinition.deleted_at.is_(None),
    ).all()
    broken = []
    for view in views:
        issues = []
        view_ot_id = _uuid(view.object_type_id)
        if view_ot_id not in ot_ids:
            ot_row = (
                db.query(DesignerObjectType)
                .filter(DesignerObjectType.id == view.object_type_id)
                .first()
            )
            if ot_row and ot_row.deleted_at is not None:
                issues.append("orphan_view_on_deleted_object_type")
            else:
                issues.append("broken_object_type_id")
        for blob_name in ("settings_json", "layout_json", "filters_json", "visibility_json"):
            blob = getattr(view, blob_name) or {}
            issues.extend(_scan_json_refs(blob, field_ids, relation_ids))
        if issues:
            broken.append({"key": view.key, "id": str(view.id), "issues": sorted(set(issues))})
    return {"total": len(views), "broken": broken}


def audit_workspaces(db) -> dict:
    page_ids = active_page_ids(db)
    ot_ids = active_ot_ids(db)
    view_ids = active_view_ids(db)
    ws_ids = active_ws_ids(db)
    workspaces = (
        db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.tenant_id == TENANT, DesignerWorkspace.deleted_at.is_(None))
        .all()
    )
    tabs = (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.tenant_id == TENANT,
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .all()
    )
    broken_ws = []
    for ws in workspaces:
        if ws.home_page_id and ws.home_page_id not in page_ids:
            broken_ws.append({"workspace": ws.slug, "issue": "broken_home_page_id", "id": ws.home_page_id})
    broken_tabs = []
    for tab in tabs:
        issues = []
        if tab.workspace_id not in ws_ids:
            issues.append("broken_workspace_id")
        if tab.object_type_id and _uuid(tab.object_type_id) not in ot_ids:
            issues.append("broken_object_type_id")
        if tab.object_view_id and _uuid(tab.object_view_id) not in view_ids:
            issues.append("broken_view_id")
        if tab.target_type == "page" and tab.target_id:
            try:
                pid = int(tab.target_id)
                if pid not in page_ids:
                    issues.append("broken_page_target_id")
            except ValueError:
                pass
        if issues:
            broken_tabs.append({"tab_id": tab.id, "slug": tab.slug, "issues": issues})
    return {
        "workspace_count": len(workspaces),
        "tabs_count": len(tabs),
        "broken_workspaces": broken_ws,
        "broken_tabs": broken_tabs,
        "office_workspaces": {
            slug: bool(db.query(DesignerWorkspace).filter(
                DesignerWorkspace.tenant_id == TENANT,
                DesignerWorkspace.slug == slug,
                DesignerWorkspace.deleted_at.is_(None),
            ).first())
            for slug in OFFICE_WORKSPACES
        },
    }


def audit_navigation(db) -> dict:
    page_ids = active_page_ids(db)
    ot_ids = active_ot_ids(db)
    ws_ids = active_ws_ids(db)
    items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == TENANT,
            NavigationItem.deleted_at.is_(None),
        )
        .all()
    )
    id_set = {n.id for n in items}
    broken = []
    for nav in items:
        issues = []
        if nav.page_id and nav.page_id not in page_ids:
            issues.append("broken_page_id")
        if nav.object_type_id and _uuid(nav.object_type_id) not in ot_ids:
            issues.append("broken_object_type_id")
        if nav.parent_id and nav.parent_id not in id_set:
            issues.append("broken_parent_id")
        if issues:
            broken.append({"id": nav.id, "title": nav.title, "issues": issues})
    titles = {n.title for n in items}
    return {
        "count": len(items),
        "broken": broken,
        "office_nav": {t: t in titles for t in OFFICE_NAV},
        "studio_nav_in_db": {t: t in titles for t in STUDIO_NAV},
    }


def audit_actions(db) -> dict:
    ot_ids = active_ot_ids(db)
    field_ids = active_field_ids(db)
    view_ids = active_view_ids(db)
    actions = db.query(DesignerActionDefinition).filter(
        DesignerActionDefinition.tenant_id == TENANT
    ).all()
    forms = db.query(DesignerActionForm).filter(DesignerActionForm.tenant_id == TENANT).all()
    placements = db.query(DesignerActionPlacement).filter(
        DesignerActionPlacement.tenant_id == TENANT
    ).all()
    form_fields = db.query(DesignerActionFormField).filter(
        DesignerActionFormField.tenant_id == TENANT
    ).all()
    broken = []
    for act in actions:
        issues = []
        if _uuid(act.object_type_id) not in ot_ids:
            issues.append("broken_object_type_id")
        if act.target_object_type_id and _uuid(act.target_object_type_id) not in ot_ids:
            issues.append("broken_target_object_type_id")
        if issues:
            broken.append({"key": act.key, "id": str(act.id), "issues": issues})
    for ff in form_fields:
        if _uuid(ff.field_definition_id) not in field_ids:
            broken.append(
                {
                    "form_field_id": str(ff.id),
                    "issue": "broken_field_id",
                    "field_definition_id": str(ff.field_definition_id),
                }
            )
    for placement in placements:
        blob_issues = _scan_json_refs(placement.config_json or {}, field_ids, set())
        if _uuid(placement.object_type_id) not in ot_ids:
            blob_issues.append("broken_object_type_id")
        if blob_issues:
            broken.append(
                {
                    "placement_id": str(placement.id),
                    "placement_key": placement.placement_key,
                    "issues": blob_issues,
                }
            )
    return {
        "actions": len(actions),
        "forms": len(forms),
        "placements": len(placements),
        "form_fields": len(form_fields),
        "broken": broken,
    }


def audit_urls(db) -> dict:
    patterns = [f"/portal/{SOURCE_TENANT}", f"/designer/tenant/{SOURCE_TENANT}"]
    findings: list[dict] = []

    def scan(label: str, entity_id: Any, field: str, value: str | None):
        if not value:
            return
        for pat in patterns:
            if pat in value:
                findings.append(
                    {"table": label, "entity_id": str(entity_id), "field": field, "pattern": pat}
                )

    for row in db.query(NavigationItem).filter(NavigationItem.portal_id == TENANT).all():
        scan("navigation_items", row.id, "url", row.url)
    for row in db.query(DesignerWorkspaceTab).filter(DesignerWorkspaceTab.tenant_id == TENANT).all():
        scan("designer_workspace_tabs", row.id, "url", row.url)
        scan("designer_workspace_tabs", row.id, "target_id", row.target_id)
    for row in db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == TENANT
    ).all():
        for fname in ("settings_json", "layout_json", "filters_json", "visibility_json"):
            scan("designer_view_definitions", row.id, fname, json.dumps(getattr(row, fname) or {}))
    for row in db.query(DesignerActionPlacement).filter(
        DesignerActionPlacement.tenant_id == TENANT
    ).all():
        scan("designer_action_placements", row.id, "config_json", json.dumps(row.config_json or {}))
    for row in db.query(Page).filter(Page.portal_id == TENANT).all():
        scan("pages", row.id, "title", row.title)
        scan("pages", row.id, "description", row.description)
    for row in db.query(Block).all():
        if row.settings:
            scan("blocks", row.id, "settings", json.dumps(row.settings, ensure_ascii=False))
        if row.content:
            scan("blocks", row.id, "content", json.dumps(row.content, ensure_ascii=False))
    return {"count": len(findings), "findings": findings}


def run_dry_run() -> dict:
    subprocess.run(
        [sys.executable, str(BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.py")],
        check=True,
    )
    payload = json.loads(
        (BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.json").read_text(encoding="utf-8")
    )
    return payload.get("summary", {}).get("per_entity", {})


def collect_issues(audit: dict) -> list[str]:
    issues: list[str] = []
    if audit["object_types"]["duplicate_active_keys"]:
        issues.append("duplicate_object_type_keys")
    if audit["fields"]["duplicate_field_keys"] or audit["fields"]["broken_object_type_id"]:
        issues.append("fields_issues")
    if audit["relations"]["broken"]:
        issues.append("broken_relations")
    critical_view_issues = [
        item
        for item in audit["views"]["broken"]
        if any(issue != "orphan_view_on_deleted_object_type" for issue in item.get("issues", []))
    ]
    if critical_view_issues:
        issues.append("broken_views")
    critical_tab_issues = [
        item
        for item in audit["workspaces"]["broken_tabs"]
        if any(issue != "orphan_view_on_deleted_object_type" for issue in item.get("issues", []))
    ]
    if audit["workspaces"]["broken_workspaces"] or critical_tab_issues:
        issues.append("broken_workspaces")
    if audit["navigation"]["broken"]:
        issues.append("broken_navigation")
    if audit["actions"]["broken"]:
        issues.append("broken_actions")
    if audit["urls"]["count"] > 0:
        issues.append("tenant_13_urls")
    dry = audit.get("dry_run", {})
    for entity in ("fields", "relations", "views", "workspaces", "workspace_tabs", "navigation", "actions"):
        if dry.get(entity, {}).get("create", 0) > 0:
            issues.append(f"recovery_remainder_{entity}")
    publish_validation = audit.get("publish_validation", {})
    if not publish_validation.get("valid", False):
        issues.append("publish_validation_failed")
    return issues


def json_safe(value):
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    return value


def main() -> int:
    db = SessionLocal()
    report: dict[str, Any] = {
        "tenant_id": TENANT,
        "started_at": datetime.now().isoformat(),
    }
    before_safety = safety_counts(db)
    report["safety_before"] = before_safety

    try:
        audit = {
            "object_types": audit_object_types(db),
            "fields": audit_fields(db),
            "relations": audit_relations(db),
            "views": audit_views(db),
            "workspaces": audit_workspaces(db),
            "navigation": audit_navigation(db),
            "actions": audit_actions(db),
            "urls": audit_urls(db),
            "runtime": before_safety,
            "documents": {
                "document_libraries": before_safety["document_libraries"],
                "library_documents": before_safety["library_documents"],
            },
            "chats": {
                "chats": before_safety["chats"],
                "chat_messages": before_safety["chat_messages"],
                "chat_participants": before_safety["chat_participants"],
            },
        }
        dry_run = run_dry_run()
        audit["dry_run"] = dry_run
        validation = validate_publish(db, TENANT)
        audit["publish_validation"] = {
            "valid": validation.valid,
            "errors": [e.model_dump() for e in validation.errors],
            "warnings": [w.model_dump() for w in validation.warnings],
            "summary": validation.summary.model_dump(),
        }
        report["pre_publish_audit"] = audit

        issues = collect_issues(audit)
        ready = len(issues) == 0
        report["publish_readiness"] = "READY" if ready else "NOT READY"
        report["readiness_issues"] = issues

        print("=== PRE-PUBLISH AUDIT ===")
        print(f"object_types: total={audit['object_types']['total']} active={audit['object_types']['active']}")
        print(f"fields: {audit['fields']['total_active']}")
        print(f"relations: {audit['relations']['total']}")
        print(f"views: {audit['views']['total']}")
        print(f"workspaces: {audit['workspaces']['workspace_count']} tabs={audit['workspaces']['tabs_count']}")
        print(f"navigation: {audit['navigation']['count']}")
        print(f"actions: {audit['actions']['actions']} forms={audit['actions']['forms']} placements={audit['actions']['placements']}")
        print(f"tenant_13_urls: {audit['urls']['count']}")
        print(f"publish_validation.valid: {validation.valid}")
        print(f"PUBLISH READINESS: {report['publish_readiness']}")
        if issues:
            print("issues:", issues)

        if not ready:
            report["publish_result"] = "SKIPPED"
            report["status"] = "audit_only"
            out = BACKEND_DIR / "scripts" / "final_pre_publish_audit_report.json"
            out.write_text(json.dumps(json_safe(report), ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"\nPublish skipped. Report: {out}")
            return 1

        print("\n=== PUBLISH TENANT 1 ===")
        result = publish_tenant_catalog(db, TENANT, current_user=None)
        report["publish_result"] = "SUCCESS"
        report["catalog"] = {
            "catalog_version": result.catalog_version,
            "schema_version": result.schema_version,
            "snapshot_id": str(result.snapshot_id),
            "publish_record_id": str(result.publish_record_id),
            "published_at": result.published_at.isoformat(),
            "payload_hash": result.payload_hash,
            "summary": result.summary.model_dump(),
        }

        after_safety = safety_counts(db)
        report["safety_after"] = after_safety
        latest = get_latest_publish_info(db, TENANT)
        report["latest_publish"] = {
            "catalog_version": latest.catalog_version,
            "schema_version": latest.schema_version,
            "snapshot_id": str(latest.snapshot_id) if latest.snapshot_id else None,
            "publish_record_id": str(latest.publish_record_id) if latest.publish_record_id else None,
            "status": latest.status,
            "published_at": latest.published_at.isoformat() if latest.published_at else None,
        }

        catalog_payload = (
            db.query(DesignerMetadataSnapshot)
            .filter(
                DesignerMetadataSnapshot.tenant_id == TENANT,
                DesignerMetadataSnapshot.catalog_version == result.catalog_version,
            )
            .first()
        )
        published_ot_keys = []
        if catalog_payload and catalog_payload.payload:
            published_ot_keys = [
                ot.get("key")
                for ot in (catalog_payload.payload.get("object_types") or [])
                if isinstance(ot, dict) and ot.get("key")
            ]
        report["post_publish"] = {
            "published_object_types_count": len(published_ot_keys),
            "published_object_type_keys_sample": sorted(published_ot_keys)[:20],
            "office_workspaces": audit["workspaces"]["office_workspaces"],
            "office_navigation": audit["navigation"]["office_nav"],
            "runtime_unchanged": before_safety["runtime_entities"] == after_safety["runtime_entities"]
            and before_safety["runtime_entity_values"] == after_safety["runtime_entity_values"]
            and before_safety["runtime_relation_instances"] == after_safety["runtime_relation_instances"],
            "documents_unchanged": before_safety["document_libraries"] == after_safety["document_libraries"]
            and before_safety["library_documents"] == after_safety["library_documents"],
            "chats_unchanged": before_safety["chats"] == after_safety["chats"]
            and before_safety["chat_messages"] == after_safety["chat_messages"]
            and before_safety["chat_participants"] == after_safety["chat_participants"],
        }
        report["status"] = "success"

        print(f"catalog_version={result.catalog_version} snapshot={result.snapshot_id}")
        print("runtime unchanged:", report["post_publish"]["runtime_unchanged"])

        out = BACKEND_DIR / "scripts" / "final_pre_publish_audit_report.json"
        out.write_text(json.dumps(json_safe(report), ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nReport: {out}")
        return 0
    except Exception as exc:
        report["status"] = "failed"
        report["publish_result"] = "FAILED"
        report["error"] = str(exc)
        out = BACKEND_DIR / "scripts" / "final_pre_publish_audit_report.json"
        out.write_text(json.dumps(json_safe(report), ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"FAILED: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
