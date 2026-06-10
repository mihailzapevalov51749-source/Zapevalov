#!/usr/bin/env python3
"""One-off: create tenant 2 from tenant 13 structure clone. Read-only on tenants 1 and 13."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

# ORM bootstrap
import app.init_db  # noqa: F401

from app.db.session import SessionLocal
from app.modules.blocks.models import Block
from app.modules.document_libraries.models import DocumentLibrary, LibraryDocument
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.sections.models import Section
from app.modules.platform.action_engine.action_placements.models import DesignerActionPlacement
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.publish.models import DesignerMetadataSnapshot
from app.modules.platform.designer.publish.service import publish_tenant_catalog
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab
from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.portals.models import Portal
from app.modules.tenant_bootstrap.clone_tenant_structure import clone_tenant_structure


SOURCE_TENANT = 13
TARGET_TENANT = 2
TENANT1 = 1

URL_PATTERNS = [f"/portal/{SOURCE_TENANT}", f"/designer/tenant/{SOURCE_TENANT}"]


def portal_info(db, tenant_id: int) -> dict[str, Any] | None:
    row = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if row is None:
        return None
    return {
        "id": row.id,
        "name": row.name,
        "description": row.description,
        "is_active": row.is_active,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def tenant1_metrics(db) -> dict[str, Any]:
    lib_ids = [
        row[0]
        for row in db.query(NavigationItem.library_id)
        .filter(NavigationItem.portal_id == TENANT1, NavigationItem.library_id.isnot(None))
        .all()
        if row[0] is not None
    ]
    docs = (
        db.query(LibraryDocument).filter(LibraryDocument.library_id.in_(lib_ids)).count()
        if lib_ids
        else 0
    )
    return {
        "object_types": db.query(DesignerObjectType)
        .filter(DesignerObjectType.tenant_id == TENANT1, DesignerObjectType.deleted_at.is_(None))
        .count(),
        "runtime_entities": db.query(RuntimeEntity).filter(RuntimeEntity.tenant_id == TENANT1).count(),
        "documents": docs,
        "chats": db.execute(text("SELECT COUNT(*) FROM chats")).scalar(),
        "catalog_version": db.execute(
            text(
                "SELECT MAX(catalog_version) FROM designer_publish_records "
                "WHERE tenant_id = :tid AND catalog_version IS NOT NULL"
            ),
            {"tid": TENANT1},
        ).scalar(),
    }


def structure_counts(db, tenant_id: int) -> dict[str, int]:
    return {
        "object_types": db.query(DesignerObjectType)
        .filter(DesignerObjectType.tenant_id == tenant_id, DesignerObjectType.deleted_at.is_(None))
        .count(),
        "field_definitions": db.query(DesignerFieldDefinition)
        .filter(
            DesignerFieldDefinition.tenant_id == tenant_id,
            DesignerFieldDefinition.deleted_at.is_(None),
        )
        .count(),
        "relation_definitions": db.query(DesignerRelationDefinition)
        .filter(
            DesignerRelationDefinition.tenant_id == tenant_id,
            DesignerRelationDefinition.deleted_at.is_(None),
        )
        .count(),
        "view_definitions": db.query(DesignerViewDefinition)
        .filter(
            DesignerViewDefinition.tenant_id == tenant_id,
            DesignerViewDefinition.deleted_at.is_(None),
        )
        .count(),
        "workspaces": db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.tenant_id == tenant_id, DesignerWorkspace.deleted_at.is_(None))
        .count(),
        "workspace_tabs": db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.tenant_id == tenant_id,
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .count(),
        "navigation_items": db.query(NavigationItem)
        .filter(NavigationItem.portal_id == tenant_id, NavigationItem.deleted_at.is_(None))
        .count(),
        "pages": db.query(Page)
        .filter(Page.portal_id == tenant_id, Page.deleted_at.is_(None))
        .count(),
        "metadata_snapshots": db.query(DesignerMetadataSnapshot)
        .filter(DesignerMetadataSnapshot.tenant_id == tenant_id)
        .count(),
        "runtime_entities": db.query(RuntimeEntity).filter(RuntimeEntity.tenant_id == tenant_id).count(),
    }


def audit_urls(db, tenant_id: int) -> dict[str, Any]:
    findings: list[dict[str, str]] = []

    def scan(table: str, entity_id: Any, field: str, value: str | None) -> None:
        if not value:
            return
        for pattern in URL_PATTERNS:
            if pattern in value:
                findings.append(
                    {"table": table, "entity_id": str(entity_id), "field": field, "pattern": pattern}
                )

    for row in db.query(NavigationItem).filter(NavigationItem.portal_id == tenant_id).all():
        scan("navigation_items", row.id, "url", row.url)
    for row in db.query(DesignerWorkspaceTab).filter(DesignerWorkspaceTab.tenant_id == tenant_id).all():
        scan("designer_workspace_tabs", row.id, "url", row.url)
        scan("designer_workspace_tabs", row.id, "target_id", row.target_id)
    for row in db.query(DesignerViewDefinition).filter(DesignerViewDefinition.tenant_id == tenant_id).all():
        for fname in ("settings_json", "layout_json", "filters_json", "visibility_json"):
            scan("designer_view_definitions", row.id, fname, json.dumps(getattr(row, fname) or {}))
    for row in db.query(DesignerActionPlacement).filter(
        DesignerActionPlacement.tenant_id == tenant_id
    ).all():
        scan("designer_action_placements", row.id, "config_json", json.dumps(row.config_json or {}))
    for row in db.query(Page).filter(Page.portal_id == tenant_id).all():
        scan("pages", row.id, "title", row.title)
        scan("pages", row.id, "description", row.description)
    page_ids = [
        row[0]
        for row in db.query(Page.id)
        .filter(Page.portal_id == tenant_id, Page.deleted_at.is_(None))
        .all()
    ]
    if page_ids:
        section_ids = [
            row[0]
            for row in db.query(Section.id).filter(Section.page_id.in_(page_ids)).all()
        ]
        if section_ids:
            for row in db.query(Block).filter(Block.section_id.in_(section_ids)).all():
                if row.settings:
                    scan("blocks", row.id, "settings", json.dumps(row.settings, ensure_ascii=False))
                if row.content:
                    scan("blocks", row.id, "content", json.dumps(row.content, ensure_ascii=False))

    by_pattern: dict[str, int] = {}
    for item in findings:
        by_pattern[item["pattern"]] = by_pattern.get(item["pattern"], 0) + 1
    return {"count": len(findings), "by_pattern": by_pattern, "findings": findings[:20]}


def main() -> int:
    report: dict[str, Any] = {"success": False}
    db = SessionLocal()
    try:
        report["dry_check"] = {
            "tenant_1": portal_info(db, TENANT1),
            "tenant_2": portal_info(db, TARGET_TENANT),
            "tenant_13": portal_info(db, SOURCE_TENANT),
        }
        if report["dry_check"]["tenant_2"] is not None:
            report["error"] = "tenant 2 already exists"
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return 1
        if report["dry_check"]["tenant_13"] is None:
            report["error"] = "tenant 13 not found"
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return 1
        if report["dry_check"]["tenant_1"] is None:
            report["error"] = "tenant 1 not found"
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return 1

        report["tenant1_baseline"] = tenant1_metrics(db)
        report["source_structure_before"] = structure_counts(db, SOURCE_TENANT)

        portal = Portal(
            id=TARGET_TENANT,
            name="Platform Template",
            description="Эталонный шаблон платформы для создания новых компаний",
            is_active=True,
        )
        db.add(portal)
        db.flush()
        db.execute(
            text("SELECT setval(pg_get_serial_sequence('portals', 'id'), GREATEST((SELECT MAX(id) FROM portals), 13))")
        )
        db.commit()
        report["created_tenant"] = portal_info(db, TARGET_TENANT)

        clone_result = clone_tenant_structure(
            db, SOURCE_TENANT, TARGET_TENANT, auto_publish=False
        )
        report["clone_result"] = {
            "source_tenant_id": clone_result.source_tenant_id,
            "target_tenant_id": clone_result.target_tenant_id,
            "pages_cloned": clone_result.pages_cloned,
            "navigation_items_cloned": clone_result.navigation_items_cloned,
            "object_types_cloned": clone_result.object_types_cloned,
            "workspaces_cloned": clone_result.workspaces_cloned,
        }

        publish_result = publish_tenant_catalog(db, TARGET_TENANT, current_user=None)
        report["publish_result"] = {
            "catalog_version": publish_result.catalog_version,
            "status": "success",
            "snapshot_id": str(publish_result.snapshot_id),
            "published_at": publish_result.published_at.isoformat(),
        }

        report["structure_tenant_2"] = structure_counts(db, TARGET_TENANT)
        report["structure_tenant_13"] = structure_counts(db, SOURCE_TENANT)
        report["structure_match"] = (
            report["structure_tenant_2"]["object_types"] == report["structure_tenant_13"]["object_types"]
            and report["structure_tenant_2"]["field_definitions"]
            == report["structure_tenant_13"]["field_definitions"]
            and report["structure_tenant_2"]["relation_definitions"]
            == report["structure_tenant_13"]["relation_definitions"]
            and report["structure_tenant_2"]["view_definitions"]
            == report["structure_tenant_13"]["view_definitions"]
            and report["structure_tenant_2"]["workspaces"] == report["structure_tenant_13"]["workspaces"]
            and report["structure_tenant_2"]["workspace_tabs"]
            == report["structure_tenant_13"]["workspace_tabs"]
            and report["structure_tenant_2"]["navigation_items"]
            == report["structure_tenant_13"]["navigation_items"]
            and report["structure_tenant_2"]["pages"] == report["structure_tenant_13"]["pages"]
        )
        report["url_audit"] = audit_urls(db, TARGET_TENANT)
        report["tenant1_after"] = tenant1_metrics(db)
        report["tenant1_unchanged"] = report["tenant1_baseline"] == report["tenant1_after"]
        report["tenant_13_unchanged"] = portal_info(db, SOURCE_TENANT) == report["dry_check"]["tenant_13"]
        report["success"] = (
            report["structure_match"]
            and report["url_audit"]["count"] == 0
            and report["tenant1_unchanged"]
            and report["tenant_13_unchanged"]
        )
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0 if report["success"] else 2
    except Exception as exc:
        db.rollback()
        report["error"] = str(exc)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
