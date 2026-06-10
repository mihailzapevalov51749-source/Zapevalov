#!/usr/bin/env python3
"""Read-only audit: compare designer structure between two tenants."""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import func, text  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.modules.blocks.models import Block  # noqa: E402
from app.modules.navigation.models import NavigationItem  # noqa: E402
from app.modules.pages.models import Page  # noqa: E402
from app.modules.platform.designer.field_definitions.models import (  # noqa: E402
    DesignerFieldDefinition,
)
from app.modules.platform.designer.object_types.models import DesignerObjectType  # noqa: E402
from app.modules.platform.designer.publish.models import (  # noqa: E402
    DesignerMetadataSnapshot,
    DesignerPublishRecord,
)
from app.modules.platform.designer.relation_definitions.models import (  # noqa: E402
    DesignerRelationDefinition,
)
from app.modules.platform.designer.view_definitions.models import (  # noqa: E402
    DesignerViewDefinition,
)
from app.modules.platform.designer.workspaces.models import (  # noqa: E402
    DesignerWorkspace,
    DesignerWorkspaceTab,
)
from app.modules.sections.models import Section  # noqa: E402

SOURCE_TENANT = 13
TARGET_TENANT = 1


def _dt(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _row_ot(row: DesignerObjectType) -> dict[str, Any]:
    return {
        "id": str(row.id),
        "key": row.key,
        "name": row.name,
        "status": row.status,
        "deleted_at": _dt(row.deleted_at),
        "created_at": _dt(row.created_at),
        "updated_at": _dt(row.updated_at),
    }


def audit_object_types(db, tenant_id: int) -> dict[str, dict]:
    rows = (
        db.query(DesignerObjectType)
        .filter(DesignerObjectType.tenant_id == tenant_id)
        .order_by(DesignerObjectType.key.asc())
        .all()
    )
    by_key: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_key[row.key].append(_row_ot(row))
    return dict(by_key)


def audit_fields_by_object_key(db, tenant_id: int) -> dict[str, list[dict]]:
    ot_rows = (
        db.query(DesignerObjectType.id, DesignerObjectType.key)
        .filter(DesignerObjectType.tenant_id == tenant_id)
        .all()
    )
    ot_id_to_key = {row_id: key for row_id, key in ot_rows}

    fields = (
        db.query(DesignerFieldDefinition)
        .filter(DesignerFieldDefinition.tenant_id == tenant_id)
        .all()
    )
    result: dict[str, list[dict]] = defaultdict(list)
    for field in fields:
        ot_key = ot_id_to_key.get(field.object_type_id, "?")
        result[ot_key].append(
            {
                "key": field.key,
                "name": field.name,
                "field_type": field.field_type,
                "deleted_at": _dt(field.deleted_at),
            }
        )
    for ot_key in result:
        result[ot_key].sort(key=lambda item: item["key"])
    return dict(result)


def audit_views(db, tenant_id: int) -> dict[str, list[dict]]:
    ot_rows = (
        db.query(DesignerObjectType.id, DesignerObjectType.key)
        .filter(DesignerObjectType.tenant_id == tenant_id)
        .all()
    )
    ot_id_to_key = {row_id: key for row_id, key in ot_rows}

    views = (
        db.query(DesignerViewDefinition)
        .filter(DesignerViewDefinition.tenant_id == tenant_id)
        .all()
    )
    result: dict[str, list[dict]] = defaultdict(list)
    for view in views:
        ot_key = ot_id_to_key.get(view.object_type_id, "?")
        result[ot_key].append(
            {
                "key": view.key,
                "name": view.name,
                "view_type": view.view_type,
                "deleted_at": _dt(view.deleted_at),
            }
        )
    return dict(result)


def audit_relations(db, tenant_id: int) -> list[dict]:
    ot_rows = (
        db.query(DesignerObjectType.id, DesignerObjectType.key)
        .filter(DesignerObjectType.tenant_id == tenant_id)
        .all()
    )
    ot_id_to_key = {row_id: key for row_id, key in ot_rows}

    relations = (
        db.query(DesignerRelationDefinition)
        .filter(DesignerRelationDefinition.tenant_id == tenant_id)
        .all()
    )
    result = []
    for rel in relations:
        result.append(
            {
                "key": rel.key,
                "name": rel.name,
                "source_object_type_key": ot_id_to_key.get(rel.source_object_type_id, "?"),
                "target_object_type_key": ot_id_to_key.get(rel.target_object_type_id, "?"),
                "relation_type": rel.relation_type,
                "deleted_at": _dt(rel.deleted_at),
            }
        )
    result.sort(key=lambda item: item["key"])
    return result


def audit_workspaces(db, tenant_id: int) -> dict[str, Any]:
    workspaces = (
        db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.tenant_id == tenant_id)
        .all()
    )
    tabs = (
        db.query(DesignerWorkspaceTab)
        .filter(DesignerWorkspaceTab.tenant_id == tenant_id)
        .all()
    )
    ws_by_slug = {
        ws.slug: {
            "id": ws.id,
            "title": ws.title,
            "slug": ws.slug,
            "deleted_at": _dt(ws.deleted_at),
            "tabs": [],
        }
        for ws in workspaces
    }
    for tab in tabs:
        ws = next((w for w in workspaces if w.id == tab.workspace_id), None)
        slug = ws.slug if ws else f"ws_{tab.workspace_id}"
        if slug not in ws_by_slug and ws:
            ws_by_slug[slug] = {
                "id": ws.id,
                "title": ws.title,
                "slug": ws.slug,
                "deleted_at": _dt(ws.deleted_at),
                "tabs": [],
            }
        if slug in ws_by_slug:
            ws_by_slug[slug]["tabs"].append(
                {
                    "slug": tab.slug,
                    "title": tab.title,
                    "tab_type": tab.tab_type,
                    "deleted_at": _dt(tab.deleted_at),
                }
            )
    return ws_by_slug


def audit_pages(db, tenant_id: int) -> dict[str, Any]:
    pages = (
        db.query(Page)
        .filter(Page.portal_id == tenant_id)
        .order_by(Page.sort_order.asc(), Page.id.asc())
        .all()
    )
    page_ids = [p.id for p in pages]
    sections = (
        db.query(Section)
        .filter(Section.page_id.in_(page_ids) if page_ids else False)
        .all()
    )
    section_ids = [s.id for s in sections]
    blocks = (
        db.query(Block)
        .filter(Block.section_id.in_(section_ids) if section_ids else False)
        .all()
    )
    sections_by_page: dict[int, list] = defaultdict(list)
    for section in sections:
        sections_by_page[section.page_id].append(section)
    blocks_by_section: dict[int, list] = defaultdict(list)
    for block in blocks:
        blocks_by_section[block.section_id].append(block)

    result = {}
    for page in pages:
        sig = f"{page.title}|{page.sort_order}|{page.is_home}"
        page_sections = sections_by_page.get(page.id, [])
        block_count = sum(len(blocks_by_section.get(s.id, [])) for s in page_sections)
        result[sig] = {
            "id": page.id,
            "title": page.title,
            "status": page.status,
            "sort_order": page.sort_order,
            "is_home": page.is_home,
            "deleted_at": _dt(page.deleted_at),
            "sections_count": len(page_sections),
            "blocks_count": block_count,
        }
    return result


def audit_navigation(db, tenant_id: int) -> list[dict]:
    items = (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == tenant_id)
        .order_by(NavigationItem.sort_order.asc(), NavigationItem.id.asc())
        .all()
    )
    active_page_ids = {
        p.id
        for p in db.query(Page.id)
        .filter(Page.portal_id == tenant_id, Page.deleted_at.is_(None))
        .all()
    }
    active_ot_ids = {
        row_id
        for row_id, in db.query(DesignerObjectType.id)
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .all()
    }
    id_to_item = {item.id: item for item in items}

    result = []
    for item in items:
        issues = []
        if item.parent_id and item.parent_id not in id_to_item:
            issues.append("orphan_parent")
        elif item.parent_id:
            parent = id_to_item[item.parent_id]
            if parent.deleted_at is not None and item.deleted_at is None:
                issues.append("parent_deleted")

        if item.page_id and item.page_id not in active_page_ids:
            issues.append("broken_page_ref")
        if item.object_type_id and item.object_type_id not in active_ot_ids:
            issues.append("broken_object_type_ref")

        path = f"{item.menu_scope}|{item.parent_id}|{item.title}|{item.type}|{item.url or ''}"
        result.append(
            {
                "signature": path,
                "id": item.id,
                "title": item.title,
                "type": item.type,
                "menu_scope": item.menu_scope,
                "url": item.url,
                "page_id": item.page_id,
                "object_type_id": str(item.object_type_id) if item.object_type_id else None,
                "parent_id": item.parent_id,
                "deleted_at": _dt(item.deleted_at),
                "issues": issues,
            }
        )
    return result


def audit_publish(db, tenant_id: int) -> dict[str, Any]:
    latest_snapshot = (
        db.query(DesignerMetadataSnapshot)
        .filter(DesignerMetadataSnapshot.tenant_id == tenant_id)
        .order_by(DesignerMetadataSnapshot.catalog_version.desc())
        .first()
    )
    latest_publish = (
        db.query(DesignerPublishRecord)
        .filter(DesignerPublishRecord.tenant_id == tenant_id)
        .order_by(DesignerPublishRecord.published_at.desc())
        .first()
    )
    snapshot_count = (
        db.query(func.count(DesignerMetadataSnapshot.id))
        .filter(DesignerMetadataSnapshot.tenant_id == tenant_id)
        .scalar()
    )
    publish_count = (
        db.query(func.count(DesignerPublishRecord.id))
        .filter(DesignerPublishRecord.tenant_id == tenant_id)
        .scalar()
    )
    object_types_in_snapshot = None
    if latest_snapshot and isinstance(latest_snapshot.payload, dict):
        object_types_in_snapshot = len(latest_snapshot.payload.get("object_types", []) or [])

    return {
        "snapshot_count": int(snapshot_count or 0),
        "publish_record_count": int(publish_count or 0),
        "latest_catalog_version": latest_snapshot.catalog_version if latest_snapshot else None,
        "latest_snapshot_at": _dt(latest_snapshot.published_at) if latest_snapshot else None,
        "object_types_in_latest_snapshot": object_types_in_snapshot,
        "latest_publish_status": latest_publish.status if latest_publish else None,
        "latest_publish_at": _dt(latest_publish.published_at) if latest_publish else None,
        "has_working_catalog": bool(
            latest_snapshot
            and latest_publish
            and str(latest_publish.status).lower() in {"success", "published", "completed"}
        ),
    }


def audit_runtime(db, tenant_id: int) -> dict[str, Any]:
    entity_count = db.execute(
        text(
            "SELECT COUNT(*) FROM runtime_entities "
            "WHERE tenant_id = :tid AND deleted_at IS NULL"
        ),
        {"tid": tenant_id},
    ).scalar()
    entity_values_count = db.execute(
        text(
            "SELECT COUNT(*) FROM runtime_entity_values WHERE tenant_id = :tid"
        ),
        {"tid": tenant_id},
    ).scalar()
    relation_instances_count = db.execute(
        text(
            "SELECT COUNT(*) FROM runtime_relation_instances WHERE tenant_id = :tid"
        ),
        {"tid": tenant_id},
    ).scalar()
    by_object_type = db.execute(
        text(
            """
            SELECT object_type_key, COUNT(*) AS cnt
            FROM runtime_entities
            WHERE tenant_id = :tid AND deleted_at IS NULL
            GROUP BY object_type_key
            ORDER BY cnt DESC
            """
        ),
        {"tid": tenant_id},
    ).fetchall()

    return {
        "entities_active": int(entity_count or 0),
        "entity_values": int(entity_values_count or 0),
        "relation_instances": int(relation_instances_count or 0),
        "entities_by_object_type_key": [
            {"object_type_key": row[0], "count": int(row[1])} for row in by_object_type
        ],
    }


def audit_trash(db, tenant_id: int) -> dict[str, list]:
    from app.modules.platform.designer.trash.service import list_trash_items

    listed = list_trash_items(db, tenant_id=tenant_id)
    grouped: dict[str, list] = defaultdict(list)
    for item in listed.items:
        grouped[item.kind].append(
            {
                "id": item.id,
                "title": item.title,
                "placement_label": item.placement_label,
                "deleted_at": _dt(item.deleted_at),
            }
        )
    return dict(grouped)


def compare_keys(a: dict, b: dict) -> dict[str, list[str]]:
    keys_a = set(a.keys())
    keys_b = set(b.keys())
    return {
        "only_a": sorted(keys_a - keys_b),
        "only_b": sorted(keys_b - keys_a),
        "both": sorted(keys_a & keys_b),
    }


def compare_active_keys(items: dict[str, list[dict]]) -> dict[str, list[str]]:
    def active_keys(d: dict[str, list[dict]]) -> set[str]:
        result = set()
        for key, rows in d.items():
            if any(r.get("deleted_at") is None for r in rows):
                result.add(key)
        return result

    a = active_keys(items)
    # reuse for symmetric compare - caller passes both
    return {"active": sorted(a)}


def main() -> None:
    db = SessionLocal()
    try:
        t1 = TARGET_TENANT
        t13 = SOURCE_TENANT

        ot1 = audit_object_types(db, t1)
        ot13 = audit_object_types(db, t13)
        ot_cmp = compare_keys(ot1, ot13)

        fields1 = audit_fields_by_object_key(db, t1)
        fields13 = audit_fields_by_object_key(db, t13)

        field_diffs = []
        for key in ot_cmp["both"]:
            f1 = {f["key"]: f for f in fields1.get(key, []) if f["deleted_at"] is None}
            f13 = {f["key"]: f for f in fields13.get(key, []) if f["deleted_at"] is None}
            missing_in_1 = sorted(set(f13.keys()) - set(f1.keys()))
            only_in_1 = sorted(set(f1.keys()) - set(f13.keys()))
            type_mismatch = [
                k
                for k in sorted(set(f1.keys()) & set(f13.keys()))
                if f1[k]["field_type"] != f13[k]["field_type"]
            ]
            if missing_in_1 or only_in_1 or type_mismatch:
                field_diffs.append(
                    {
                        "object_type_key": key,
                        "fields_count_t1": len(f1),
                        "fields_count_t13": len(f13),
                        "missing_in_t1": missing_in_1,
                        "only_in_t1": only_in_1,
                        "type_mismatch": type_mismatch,
                    }
                )

        views1 = audit_views(db, t1)
        views13 = audit_views(db, t13)
        view_diffs = []
        for key in ot_cmp["both"]:
            v1 = {v["key"] for v in views1.get(key, []) if v["deleted_at"] is None}
            v13 = {v["key"] for v in views13.get(key, []) if v["deleted_at"] is None}
            missing = sorted(v13 - v1)
            if missing:
                view_diffs.append({"object_type_key": key, "views_missing_in_t1": missing})

        rel1 = audit_relations(db, t1)
        rel13 = audit_relations(db, t13)
        rel_keys_1 = {r["key"] for r in rel1 if r["deleted_at"] is None}
        rel_keys_13 = {r["key"] for r in rel13 if r["deleted_at"] is None}

        ws1 = audit_workspaces(db, t1)
        ws13 = audit_workspaces(db, t13)
        ws_cmp = compare_keys(ws1, ws13)

        pages1 = audit_pages(db, t1)
        pages13 = audit_pages(db, t13)
        pages_cmp = compare_keys(pages1, pages13)

        nav1 = audit_navigation(db, t1)
        nav13 = audit_navigation(db, t13)
        nav_sig_1 = {n["signature"] for n in nav1 if n["deleted_at"] is None}
        nav_sig_13 = {n["signature"] for n in nav13 if n["deleted_at"] is None}

        report = {
            "audited_at": datetime.now().isoformat(),
            "tenants": {"damaged": t1, "source": t13},
            "summary": {
                "object_types": {
                    "t1_total": sum(len(v) for v in ot1.values()),
                    "t13_total": sum(len(v) for v in ot13.values()),
                    "only_t1_keys": ot_cmp["only_a"],
                    "only_t13_keys": ot_cmp["only_b"],
                    "shared_keys": ot_cmp["both"],
                },
                "relations": {
                    "only_t1": sorted(rel_keys_1 - rel_keys_13),
                    "only_t13": sorted(rel_keys_13 - rel_keys_1),
                    "shared": sorted(rel_keys_1 & rel_keys_13),
                },
                "workspaces": {
                    "only_t1_slugs": ws_cmp["only_a"],
                    "only_t13_slugs": ws_cmp["only_b"],
                    "shared_slugs": ws_cmp["both"],
                },
                "pages": {
                    "only_t1_signatures": pages_cmp["only_a"],
                    "only_t13_signatures": pages_cmp["only_b"],
                    "shared_signatures": pages_cmp["both"],
                },
                "navigation_active": {
                    "only_t1": sorted(nav_sig_1 - nav_sig_13),
                    "only_t13": sorted(nav_sig_13 - nav_sig_1),
                    "shared": sorted(nav_sig_1 & nav_sig_13),
                },
            },
            "object_types": {
                "tenant_1": ot1,
                "tenant_13": ot13,
            },
            "field_diffs_shared_object_types": field_diffs,
            "view_diffs_shared_object_types": view_diffs,
            "relations": {"tenant_1": rel1, "tenant_13": rel13},
            "workspaces": {"tenant_1": ws1, "tenant_13": ws13},
            "pages": {"tenant_1": pages1, "tenant_13": pages13},
            "navigation_issues": {
                "tenant_1": [n for n in nav1 if n["issues"] or n["deleted_at"]],
                "tenant_13": [n for n in nav13 if n["issues"] or n["deleted_at"]],
            },
            "navigation_missing_in_t1": sorted(nav_sig_13 - nav_sig_1),
            "publish": {
                "tenant_1": audit_publish(db, t1),
                "tenant_13": audit_publish(db, t13),
            },
            "runtime": {
                "tenant_1": audit_runtime(db, t1),
                "tenant_13": audit_runtime(db, t13),
            },
            "trash": {
                "tenant_1": audit_trash(db, t1),
                "tenant_13": audit_trash(db, t13),
            },
        }

        out_path = BACKEND_DIR / "scripts" / "audit_tenant_1_vs_13_report.json"
        out_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
        print(f"\nFull report: {out_path}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
