#!/usr/bin/env python3
"""Verify default bootstrap clones from Platform Template tenant 2."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

import app.init_db  # noqa: F401

from app.db.session import SessionLocal
from app.modules.document_libraries.models import LibraryDocument
from app.modules.navigation.models import NavigationItem
from app.modules.pages.models import Page
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.publish.models import DesignerMetadataSnapshot
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition
from app.modules.platform.designer.workspaces.models import DesignerWorkspace, DesignerWorkspaceTab
from app.modules.platform.runtime.entities.models import RuntimeEntity
from app.modules.portals.models import Portal
from app.modules.portals.schemas import PortalCreate
from app.modules.portals.service import create_portal
from app.modules.tenant_bootstrap.constants import PLATFORM_TEMPLATE_TENANT_ID

TEMPLATE_TENANT = PLATFORM_TEMPLATE_TENANT_ID
TENANT1 = 1
TENANT13 = 13


def structure_counts(db, tenant_id: int) -> dict[str, int]:
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
        "catalog_version": db.execute(
            text(
                "SELECT MAX(catalog_version) FROM designer_publish_records "
                "WHERE tenant_id = :tid AND catalog_version IS NOT NULL"
            ),
            {"tid": tenant_id},
        ).scalar()
        or 0,
        "runtime_entities": db.query(RuntimeEntity).filter(RuntimeEntity.tenant_id == tenant_id).count(),
        "documents": docs if tenant_id == TENANT1 else 0,
        "chats": db.execute(text("SELECT COUNT(*) FROM chats")).scalar() if tenant_id == TENANT1 else 0,
    }


def portal_snapshot(db, tenant_id: int) -> dict:
    row = db.query(Portal).filter(Portal.id == tenant_id).one_or_none()
    if row is None:
        return {"missing": True}
    return {
        "id": row.id,
        "name": row.name,
        "description": row.description,
        "is_active": row.is_active,
        "structure": structure_counts(db, tenant_id),
    }


def main() -> int:
    report: dict = {"success": False}
    db = SessionLocal()
    try:
        report["tenant1_before"] = portal_snapshot(db, TENANT1)
        report["tenant13_before"] = portal_snapshot(db, TENANT13)
        report["template_before"] = structure_counts(db, TEMPLATE_TENANT)

        payload = PortalCreate(name="Bootstrap Test From Template", description="bootstrap verification")
        assert payload.bootstrap_from_tenant_id == TEMPLATE_TENANT

        portal, clone_result = create_portal(db, payload)
        db.commit()

        report["test_tenant"] = {
            "id": portal.id,
            "name": portal.name,
            "structure_cloned_from": clone_result.source_tenant_id if clone_result else None,
            "catalog_version": clone_result.catalog_version if clone_result else None,
            "counts": structure_counts(db, portal.id),
        }
        report["structure_match_template"] = (
            report["test_tenant"]["counts"]["object_types"]
            == report["template_before"]["object_types"]
            and report["test_tenant"]["counts"]["pages"] == report["template_before"]["pages"]
            and report["test_tenant"]["counts"]["navigation_items"]
            == report["template_before"]["navigation_items"]
            and report["test_tenant"]["counts"]["workspaces"] == report["template_before"]["workspaces"]
        )
        report["cloned_from_template"] = (
            report["test_tenant"]["structure_cloned_from"] == TEMPLATE_TENANT
        )
        report["tenant1_after"] = portal_snapshot(db, TENANT1)
        report["tenant13_after"] = portal_snapshot(db, TENANT13)
        report["tenant1_unchanged"] = (
            report["tenant1_before"]["structure"] == report["tenant1_after"]["structure"]
        )
        report["tenant13_unchanged"] = (
            report["tenant13_before"]["structure"] == report["tenant13_after"]["structure"]
        )
        report["success"] = (
            report["cloned_from_template"]
            and report["structure_match_template"]
            and report["tenant1_unchanged"]
            and report["tenant13_unchanged"]
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
