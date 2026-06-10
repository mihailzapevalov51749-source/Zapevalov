#!/usr/bin/env python3
"""DRY RUN: merge recovery plan tenant 13 -> tenant 1 architecture. Read-only."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import func, or_, text  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.modules.blocks.models import Block  # noqa: E402
from app.modules.chats.models import Chat, ChatMessage, ChatParticipant  # noqa: E402
from app.modules.users.models import User  # noqa: F401, E402
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
from app.modules.platform.designer.field_definitions.models import (  # noqa: E402
    DesignerFieldDefinition,
)
from app.modules.platform.designer.object_types.models import DesignerObjectType  # noqa: E402
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

SOURCE = 13
TARGET = 1
TEST_OT_KEY_PREFIXES = ("cascade_delete_", "delete_mvp_", "nav_cleanup_")


def _is_test_ot_key(key: str) -> bool:
    return any(key.startswith(p) for p in TEST_OT_KEY_PREFIXES)


def _page_sig(page: Page) -> str:
    return f"{page.title}|{page.sort_order}|{bool(page.is_home)}"


def _pick_ot_rows(rows: list[DesignerObjectType]) -> dict[str, Any]:
    active = [r for r in rows if r.deleted_at is None]
    deleted = [r for r in rows if r.deleted_at is not None]
    return {"active": active, "deleted": deleted}


def _ot_key_map(db, tenant_id: int) -> dict[str, list[DesignerObjectType]]:
    rows = (
        db.query(DesignerObjectType)
        .filter(DesignerObjectType.tenant_id == tenant_id)
        .all()
    )
    out: dict[str, list[DesignerObjectType]] = defaultdict(list)
    for row in rows:
        out[row.key].append(row)
    return dict(out)


def _ot_id_to_key(db, tenant_id: int) -> dict[Any, str]:
    rows = (
        db.query(DesignerObjectType.id, DesignerObjectType.key)
        .filter(DesignerObjectType.tenant_id == tenant_id)
        .all()
    )
    return {row_id: key for row_id, key in rows}


def plan_object_types(src: dict, tgt: dict) -> dict[str, list[dict]]:
    actions: dict[str, list[dict]] = {
        "create": [],
        "restore": [],
        "update": [],
        "skip": [],
        "delete": [],
    }
    all_keys = set(src) | set(tgt)
    for key in sorted(all_keys):
        s = _pick_ot_rows(src.get(key, []))
        t = _pick_ot_rows(tgt.get(key, []))
        s_active = s["active"]
        t_active = t["active"]
        t_deleted = t["deleted"]

        if _is_test_ot_key(key):
            if t_active or t_deleted:
                actions["skip"].append(
                    {"key": key, "reason": "test_artifact_preserve_or_ignore"}
                )
            continue

        if s_active and not t_active and t_deleted:
            actions["restore"].append(
                {
                    "key": key,
                    "name": s_active[0].name,
                    "target_deleted_ids": [str(r.id) for r in t_deleted],
                    "source_id": str(s_active[0].id),
                }
            )
        elif s_active and not t_active and not t_deleted:
            actions["create"].append(
                {"key": key, "name": s_active[0].name, "source_id": str(s_active[0].id)}
            )
        elif s_active and t_active:
            src_row = s_active[0]
            tgt_row = t_active[0]
            if src_row.name != tgt_row.name or src_row.status != tgt_row.status:
                actions["update"].append(
                    {
                        "key": key,
                        "fields": ["name", "status"],
                        "target_id": str(tgt_row.id),
                    }
                )
            else:
                actions["skip"].append({"key": key, "reason": "active_match"})
        elif not s_active and t_active:
            actions["skip"].append({"key": key, "reason": "target_only_preserve"})
        elif not s_active and t_deleted:
            actions["skip"].append({"key": key, "reason": "deleted_target_only"})
    return actions


def plan_keyed_children(
    *,
    label: str,
    src_items: list[dict],
    tgt_active: dict[str, dict],
    tgt_deleted: dict[str, dict],
    src_exists: bool,
) -> dict[str, list[dict]]:
    actions: dict[str, list[dict]] = {
        "create": [],
        "restore": [],
        "update": [],
        "skip": [],
    }
    for item in src_items:
        k = item["key"]
        if k in tgt_active:
            mismatches = []
            for field in ("name", "field_type", "view_type", "relation_type"):
                if field in item and field in tgt_active[k]:
                    if item[field] != tgt_active[k][field]:
                        mismatches.append(field)
            if mismatches:
                actions["update"].append({label: k, "fields": mismatches, **item})
            else:
                actions["skip"].append({label: k, **item})
        elif k in tgt_deleted:
            actions["restore"].append({label: k, **item, "target_id": tgt_deleted[k].get("id")})
        elif src_exists:
            actions["create"].append({label: k, **item})
    return actions


def collect_fields(db, tenant_id: int) -> dict[str, dict[str, dict]]:
    ot_map = _ot_id_to_key(db, tenant_id)
    rows = db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == tenant_id
    ).all()
    active: dict[str, dict[str, dict]] = defaultdict(dict)
    deleted: dict[str, dict[str, dict]] = defaultdict(dict)
    for row in rows:
        ot_key = ot_map.get(row.object_type_id, "?")
        payload = {
            "id": str(row.id),
            "key": row.key,
            "name": row.name,
            "field_type": row.field_type,
            "object_type_key": ot_key,
        }
        if row.deleted_at is None:
            active[ot_key][row.key] = payload
        else:
            deleted[ot_key][row.key] = payload
    return {"active": dict(active), "deleted": dict(deleted)}


def collect_views(db, tenant_id: int) -> dict[str, dict[str, dict]]:
    ot_map = _ot_id_to_key(db, tenant_id)
    rows = db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == tenant_id
    ).all()
    active: dict[str, dict[str, dict]] = defaultdict(dict)
    deleted: dict[str, dict[str, dict]] = defaultdict(dict)
    for row in rows:
        ot_key = ot_map.get(row.object_type_id, "?")
        payload = {
            "id": str(row.id),
            "key": row.key,
            "name": row.name,
            "view_type": row.view_type,
            "object_type_key": ot_key,
        }
        if row.deleted_at is None:
            active[ot_key][row.key] = payload
        else:
            deleted[ot_key][row.key] = payload
    return {"active": dict(active), "deleted": dict(deleted)}


def collect_relations(db, tenant_id: int) -> tuple[dict[str, dict], dict[str, dict]]:
    ot_map = _ot_id_to_key(db, tenant_id)
    rows = db.query(DesignerRelationDefinition).filter(
        DesignerRelationDefinition.tenant_id == tenant_id
    ).all()
    active: dict[str, dict] = {}
    deleted: dict[str, dict] = {}
    for row in rows:
        payload = {
            "id": str(row.id),
            "key": row.key,
            "name": row.name,
            "relation_type": row.relation_type,
            "source_object_type_key": ot_map.get(row.source_object_type_id, "?"),
            "target_object_type_key": ot_map.get(row.target_object_type_id, "?"),
        }
        if row.deleted_at is None:
            active[row.key] = payload
        else:
            deleted[row.key] = payload
    return active, deleted


def collect_workspaces(db, tenant_id: int) -> dict[str, dict]:
    workspaces = db.query(DesignerWorkspace).filter(
        DesignerWorkspace.tenant_id == tenant_id
    ).all()
    tabs = db.query(DesignerWorkspaceTab).filter(
        DesignerWorkspaceTab.tenant_id == tenant_id
    ).all()
    tabs_by_ws: dict[int, list] = defaultdict(list)
    for tab in tabs:
        tabs_by_ws[tab.workspace_id].append(tab)
    out = {}
    for ws in workspaces:
        out[ws.slug] = {
            "id": ws.id,
            "title": ws.title,
            "slug": ws.slug,
            "deleted_at": ws.deleted_at.isoformat() if ws.deleted_at else None,
            "tabs": [
                {
                    "slug": t.slug,
                    "title": t.title,
                    "tab_type": t.tab_type,
                    "deleted_at": t.deleted_at.isoformat() if t.deleted_at else None,
                }
                for t in tabs_by_ws.get(ws.id, [])
            ],
        }
    return out


def collect_pages(db, tenant_id: int) -> dict[str, dict]:
    pages = db.query(Page).filter(Page.portal_id == tenant_id).all()
    page_ids = [p.id for p in pages]
    sections = (
        db.query(Section).filter(Section.page_id.in_(page_ids)).all() if page_ids else []
    )
    section_ids = [s.id for s in sections]
    blocks = (
        db.query(Block).filter(Block.section_id.in_(section_ids)).all()
        if section_ids
        else []
    )
    blocks_by_section: dict[int, int] = defaultdict(int)
    for b in blocks:
        blocks_by_section[b.section_id] += 1
    sections_by_page: dict[int, list] = defaultdict(list)
    for s in sections:
        sections_by_page[s.page_id].append(s)

    out = {}
    for page in pages:
        sig = _page_sig(page)
        secs = sections_by_page.get(page.id, [])
        block_count = sum(blocks_by_section.get(s.id, 0) for s in secs)
        out[sig] = {
            "id": page.id,
            "title": page.title,
            "status": page.status,
            "deleted_at": page.deleted_at.isoformat() if page.deleted_at else None,
            "sections_count": len(secs),
            "blocks_count": block_count,
        }
    return out


def collect_navigation(db, tenant_id: int) -> list[dict]:
    items = (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == tenant_id)
        .order_by(NavigationItem.id.asc())
        .all()
    )
    by_id = {item.id: item for item in items}
    result = []
    for item in items:
        if item.parent_id and item.parent_id in by_id:
            parent = by_id[item.parent_id]
            parent_key = f"{parent.menu_scope}|{parent.title}|{parent.type}"
        else:
            parent_key = "None"
        sig = (
            f"{item.menu_scope}|{parent_key}|{item.title}|{item.type}|"
            f"{item.url or ''}"
        )
        result.append(
            {
                "signature": sig,
                "id": item.id,
                "title": item.title,
                "type": item.type,
                "menu_scope": item.menu_scope,
                "url": item.url,
                "page_id": item.page_id,
                "library_id": item.library_id,
                "object_type_id": str(item.object_type_id) if item.object_type_id else None,
                "parent_id": item.parent_id,
                "deleted_at": item.deleted_at.isoformat() if item.deleted_at else None,
            }
        )
    return result


def merge_plan_records(
    src_records: dict[str, dict],
    tgt_records: dict[str, dict],
    identity_key: str = "slug",
) -> dict[str, list]:
    actions = {"create": [], "restore": [], "update": [], "skip": []}
    src_keys = set(src_records)
    tgt_keys = set(tgt_records)
    for key in sorted(src_keys):
        s = src_records[key]
        if key not in tgt_records:
            actions["create"].append({identity_key: key, **s})
            continue
        t = tgt_records[key]
        s_del = s.get("deleted_at")
        t_del = t.get("deleted_at")
        if s_del is None and t_del is not None:
            actions["restore"].append({identity_key: key, "target_id": t.get("id"), **s})
        elif s_del is None and t_del is None:
            if s.get("title") != t.get("title"):
                actions["update"].append(
                    {identity_key: key, "fields": ["title"], "target_id": t.get("id")}
                )
            else:
                actions["skip"].append({identity_key: key, "reason": "active_match"})
    for key in sorted(tgt_keys - src_keys):
        t = tgt_records[key]
        if t.get("deleted_at") is None:
            actions["skip"].append({identity_key: key, "reason": "target_only_preserve"})
    return actions


def plan_workspace_tabs(src_ws: dict, tgt_ws: dict) -> dict[str, list]:
    actions = {"create": [], "restore": [], "update": [], "skip": []}
    for ws_slug, s_ws in src_ws.items():
        if s_ws.get("deleted_at"):
            continue
        t_ws = tgt_ws.get(ws_slug)
        if not t_ws:
            continue
        s_tabs = {t["slug"]: t for t in s_ws.get("tabs", []) if not t.get("deleted_at")}
        t_tabs = {t["slug"]: t for t in t_ws.get("tabs", [])}
        for slug, s_tab in s_tabs.items():
            t_tab = t_tabs.get(slug)
            if not t_tab:
                actions["create"].append({"workspace_slug": ws_slug, "tab_slug": slug, **s_tab})
            elif t_tab.get("deleted_at"):
                actions["restore"].append({"workspace_slug": ws_slug, "tab_slug": slug, **s_tab})
            else:
                actions["skip"].append({"workspace_slug": ws_slug, "tab_slug": slug})
    for ws_slug, s_ws in src_ws.items():
        if s_ws.get("deleted_at"):
            continue
        if ws_slug not in tgt_ws or tgt_ws[ws_slug].get("deleted_at"):
            for tab in s_ws.get("tabs", []):
                if not tab.get("deleted_at"):
                    actions["create"].append(
                        {"workspace_slug": ws_slug, "tab_slug": tab["slug"], **tab, "note": "new_workspace"}
                    )
    return actions


def plan_navigation(src_nav: list[dict], tgt_nav: list[dict]) -> dict[str, list]:
    def norm_sig(sig: str) -> str:
        value = re.sub(r"/portal/\d+", "/portal/{id}", sig)
        return re.sub(r"/designer/tenant/\d+", "/designer/tenant/{id}", value)

    src_by_norm = {}
    for item in src_nav:
        if item["deleted_at"]:
            continue
        n = norm_sig(item["signature"])
        src_by_norm[n] = item
    tgt_by_norm = {}
    tgt_deleted = {}
    for item in tgt_nav:
        n = norm_sig(item["signature"])
        if item["deleted_at"]:
            tgt_deleted[n] = item
        else:
            tgt_by_norm[n] = item

    actions = {"create": [], "restore": [], "update": [], "skip": []}
    for n, s in src_by_norm.items():
        if n in tgt_by_norm:
            actions["skip"].append({"signature": s["signature"], "reason": "active_match"})
        elif n in tgt_deleted:
            actions["restore"].append(
                {"signature": s["signature"], "target_id": tgt_deleted[n]["id"], "title": s["title"]}
            )
        else:
            actions["create"].append({"signature": s["signature"], "title": s["title"], "type": s["type"]})
    return actions


def audit_runtime(db, tenant_id: int) -> dict:
    entities = db.execute(
        text(
            "SELECT COUNT(*) FROM runtime_entities "
            "WHERE tenant_id=:t AND deleted_at IS NULL"
        ),
        {"t": tenant_id},
    ).scalar()
    values = db.execute(
        text("SELECT COUNT(*) FROM runtime_entity_values WHERE tenant_id=:t"),
        {"t": tenant_id},
    ).scalar()
    relations = db.execute(
        text("SELECT COUNT(*) FROM runtime_relation_instances WHERE tenant_id=:t"),
        {"t": tenant_id},
    ).scalar()
    by_type = db.execute(
        text(
            """
            SELECT object_type_key, COUNT(*) cnt
            FROM runtime_entities
            WHERE tenant_id=:t AND deleted_at IS NULL
            GROUP BY object_type_key ORDER BY cnt DESC
            """
        ),
        {"t": tenant_id},
    ).fetchall()
    return {
        "entities_active": int(entities or 0),
        "entity_values": int(values or 0),
        "relation_instances": int(relations or 0),
        "by_object_type_key": [{"key": r[0], "count": int(r[1])} for r in by_type],
    }


def audit_documents(db, tenant_id: int) -> dict:
    nav_libs = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == tenant_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.library_id.isnot(None),
        )
        .all()
    )
    library_ids = {n.library_id for n in nav_libs if n.library_id}
    libraries = (
        db.query(DocumentLibrary).filter(DocumentLibrary.id.in_(library_ids)).all()
        if library_ids
        else []
    )
    doc_count = (
        db.query(func.count(LibraryDocument.id))
        .filter(LibraryDocument.library_id.in_(library_ids))
        .scalar()
        if library_ids
        else 0
    )
    all_libs = db.query(func.count(DocumentLibrary.id)).scalar()
    all_docs = db.query(func.count(LibraryDocument.id)).scalar()
    return {
        "libraries_total_global": int(all_libs or 0),
        "documents_total_global": int(all_docs or 0),
        "libraries_linked_via_nav": len(libraries),
        "documents_in_linked_libraries": int(doc_count or 0),
        "navigation_items_with_library": [
            {
                "id": n.id,
                "title": n.title,
                "library_id": n.library_id,
                "page_id": n.page_id,
            }
            for n in nav_libs
        ],
    }


def audit_chats(db, tenant_id: int) -> dict:
    ws_ids = {
        row[0]
        for row in db.query(DesignerWorkspace.id)
        .filter(DesignerWorkspace.tenant_id == tenant_id)
        .all()
    }
    chats = db.query(Chat).all()
    linked = [c for c in chats if c.workspace_id in ws_ids]
    chat_ids = [c.id for c in chats]
    msg_count = (
        db.query(func.count(ChatMessage.id))
        .filter(ChatMessage.chat_id.in_(chat_ids))
        .scalar()
        if chat_ids
        else 0
    )
    part_count = (
        db.query(func.count(ChatParticipant.id))
        .filter(ChatParticipant.chat_id.in_(chat_ids))
        .scalar()
        if chat_ids
        else 0
    )
    broken_ws = [c for c in chats if c.workspace_id and c.workspace_id not in ws_ids]
    return {
        "chats_total": len(chats),
        "chats_linked_to_tenant_workspaces": len(linked),
        "messages_total": int(msg_count or 0),
        "participants_total": int(part_count or 0),
        "chats_with_broken_workspace_ref": [
            {"chat_id": c.id, "title": c.title, "workspace_id": c.workspace_id}
            for c in broken_ws
        ],
    }


def detect_conflicts(db, tenant_id: int) -> dict:
    ot_active = (
        db.query(DesignerObjectType.key, func.count())
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .group_by(DesignerObjectType.key)
        .having(func.count() > 1)
        .all()
    )
    active_page_ids = {
        p.id
        for p in db.query(Page)
        .filter(Page.portal_id == tenant_id, Page.deleted_at.is_(None))
        .all()
    }
    active_ot_ids = {
        row[0]
        for row in db.query(DesignerObjectType.id)
        .filter(
            DesignerObjectType.tenant_id == tenant_id,
            DesignerObjectType.deleted_at.is_(None),
        )
        .all()
    }
    active_ws_ids = {
        row[0]
        for row in db.query(DesignerWorkspace.id)
        .filter(
            DesignerWorkspace.tenant_id == tenant_id,
            DesignerWorkspace.deleted_at.is_(None),
        )
        .all()
    }
    nav_items = db.query(NavigationItem).filter(NavigationItem.portal_id == tenant_id).all()
    id_set = {n.id for n in nav_items}
    nav_broken = []
    for n in nav_items:
        issues = []
        if n.deleted_at:
            continue
        if n.page_id and n.page_id not in active_page_ids:
            issues.append("broken_page_id")
        if n.object_type_id and n.object_type_id not in active_ot_ids:
            issues.append("broken_object_type_id")
        if n.parent_id and n.parent_id not in id_set:
            issues.append("orphan_parent")
        if issues:
            nav_broken.append({"id": n.id, "title": n.title, "issues": issues, "url": n.url})

    ws_tabs = (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.tenant_id == tenant_id,
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .all()
    )
    broken_tabs = [
        {
            "tab_id": t.id,
            "workspace_id": t.workspace_id,
            "title": t.title,
            "issue": "workspace_missing_or_deleted",
        }
        for t in ws_tabs
        if t.workspace_id not in active_ws_ids
    ]

    libraries_nav = audit_documents(db, tenant_id)
    lib_ids_nav = {x["library_id"] for x in libraries_nav["navigation_items_with_library"]}
    libs_without_nav = []
    if lib_ids_nav:
        existing = {row[0] for row in db.query(DocumentLibrary.id).filter(
            DocumentLibrary.id.in_(lib_ids_nav)
        ).all()}
        for lid in lib_ids_nav:
            if lid not in existing:
                libs_without_nav.append(lid)

    return {
        "object_types_duplicate_key_active": [{"key": k, "count": c} for k, c in ot_active],
        "navigation_broken": nav_broken,
        "workspace_tabs_broken": broken_tabs,
        "document_libraries_missing_for_nav": libs_without_nav,
        "pages_duplicate_title_active": _duplicate_page_titles(db, tenant_id),
    }


def _duplicate_page_titles(db, tenant_id: int) -> list[dict]:
    rows = (
        db.query(Page.title, func.count())
        .filter(Page.portal_id == tenant_id, Page.deleted_at.is_(None))
        .group_by(Page.title)
        .having(func.count() > 1)
        .all()
    )
    return [{"title": t, "count": c} for t, c in rows]


def find_url_references(db, tenant_id: int) -> list[dict]:
    patterns = [
        (f"/portal/{SOURCE}", f"/portal/{tenant_id}"),
        (f"/designer/tenant/{SOURCE}", f"/designer/tenant/{tenant_id}"),
    ]
    findings = []

    def scan_text(label: str, entity_id: Any, field: str, value: str | None):
        if not value:
            return
        for src_pat, _ in patterns:
            if src_pat in value:
                findings.append(
                    {
                        "table": label,
                        "entity_id": str(entity_id),
                        "field": field,
                        "snippet": value[:200],
                        "pattern": src_pat,
                    }
                )

    for row in db.query(NavigationItem).filter(NavigationItem.portal_id == tenant_id).all():
        scan_text("navigation_items", row.id, "url", row.url)

    for row in db.query(DesignerWorkspaceTab).filter(
        DesignerWorkspaceTab.tenant_id == tenant_id
    ).all():
        scan_text("designer_workspace_tabs", row.id, "url", row.url)
        scan_text("designer_workspace_tabs", row.id, "target_id", row.target_id)

    for row in db.query(Block).all():
        if row.settings:
            s = json.dumps(row.settings, ensure_ascii=False)
            for src_pat, _ in patterns:
                if src_pat in s:
                    findings.append(
                        {
                            "table": "blocks",
                            "entity_id": str(row.id),
                            "field": "settings",
                            "snippet": s[:200],
                            "pattern": src_pat,
                        }
                    )
        if row.content:
            s = json.dumps(row.content, ensure_ascii=False)
            for src_pat, _ in patterns:
                if src_pat in s:
                    findings.append(
                        {
                            "table": "blocks",
                            "entity_id": str(row.id),
                            "field": "content",
                            "snippet": s[:200],
                            "pattern": src_pat,
                        }
                    )
    return findings


def plan_fields(src_fields, tgt_fields, src_ot_keys: set[str]) -> dict[str, list]:
    actions = {"create": [], "restore": [], "update": [], "skip": []}
    for ot_key in sorted(src_ot_keys):
        if _is_test_ot_key(ot_key):
            continue
        s_ot = src_fields["active"].get(ot_key, {})
        t_active = tgt_fields["active"].get(ot_key, {})
        t_deleted = tgt_fields["deleted"].get(ot_key, {})
        for fk, s_field in s_ot.items():
            if fk in t_active:
                if t_active[fk]["field_type"] != s_field["field_type"]:
                    actions["update"].append(
                        {"object_type_key": ot_key, "field_key": fk, "field": "field_type"}
                    )
                else:
                    actions["skip"].append({"object_type_key": ot_key, "field_key": fk})
            elif fk in t_deleted:
                actions["restore"].append(
                    {"object_type_key": ot_key, "field_key": fk, "target_id": t_deleted[fk]["id"]}
                )
            else:
                actions["create"].append({"object_type_key": ot_key, "field_key": fk, **s_field})
    return actions


def plan_views(src_views, tgt_views, src_ot_keys: set[str]) -> dict[str, list]:
    actions = {"create": [], "restore": [], "update": [], "skip": []}
    for ot_key in sorted(src_ot_keys):
        if _is_test_ot_key(ot_key):
            continue
        s_ot = {}
        for vk, v in src_views["active"].get(ot_key, {}).items():
            s_ot[vk] = v
        t_active = tgt_views["active"].get(ot_key, {})
        t_deleted = tgt_views["deleted"].get(ot_key, {})
        for vk, s_view in s_ot.items():
            if vk in t_active:
                actions["skip"].append({"object_type_key": ot_key, "view_key": vk})
            elif vk in t_deleted:
                actions["restore"].append(
                    {"object_type_key": ot_key, "view_key": vk, "target_id": t_deleted[vk]["id"]}
                )
            else:
                actions["create"].append({"object_type_key": ot_key, "view_key": vk, **s_view})
    return actions


def plan_relations(src_active, src_deleted_unused, tgt_active, tgt_deleted) -> dict[str, list]:
    actions = {"create": [], "restore": [], "update": [], "skip": []}
    for key, s in src_active.items():
        if key in tgt_active:
            actions["skip"].append({"key": key})
        elif key in tgt_deleted:
            actions["restore"].append({"key": key, "target_id": tgt_deleted[key]["id"]})
        else:
            actions["create"].append(s)
    return actions


def count_actions(plan: dict[str, list]) -> int:
    return sum(len(v) for v in plan.values())


def summarize_counts(plans: dict[str, dict[str, list]]) -> dict[str, int]:
    totals = defaultdict(int)
    for entity_plan in plans.values():
        for action, items in entity_plan.items():
            totals[action] += len(items)
    return dict(totals)


def build_recovery_steps(summary: dict, conflicts: dict) -> list[dict]:
    return [
        {
            "step": 1,
            "phase": "pre-check",
            "action": "Verify backup exists",
            "detail": "portal_constructor_v2_backup_before_tenant_recovery_*.dump",
        },
        {
            "step": 2,
            "phase": "object_types",
            "action": "Restore soft-deleted OT from trash / undelete",
            "count": summary.get("object_types", {}).get("restore", 0),
        },
        {
            "step": 3,
            "phase": "object_types",
            "action": "Create missing OT copied from tenant 13 (new UUIDs)",
            "count": summary.get("object_types", {}).get("create", 0),
        },
        {
            "step": 4,
            "phase": "fields",
            "action": "Restore 68 soft-deleted fields first; then create missing from T13",
            "count": summary.get("fields", {}).get("restore", 0)
            + summary.get("fields", {}).get("create", 0),
        },
        {
            "step": 5,
            "phase": "relations",
            "action": "Restore/create relations (remap object_type UUIDs)",
            "count": summary.get("relations", {}).get("restore", 0)
            + summary.get("relations", {}).get("create", 0),
        },
        {
            "step": 6,
            "phase": "views",
            "action": "Restore/create views",
            "count": summary.get("views", {}).get("restore", 0)
            + summary.get("views", {}).get("create", 0),
        },
        {
            "step": 7,
            "phase": "workspaces",
            "action": "Restore razrabotka; create 3 missing workspaces from T13",
            "count": summary.get("workspaces", {}).get("restore", 0)
            + summary.get("workspaces", {}).get("create", 0),
        },
        {
            "step": 8,
            "phase": "workspace_tabs",
            "action": "Restore/create tabs per workspace",
            "count": summary.get("workspace_tabs", {}).get("restore", 0)
            + summary.get("workspace_tabs", {}).get("create", 0),
        },
        {
            "step": 9,
            "phase": "pages",
            "action": "Restore pages from trash; create missing from T13 (preserve T1-only pages)",
            "count": summary.get("pages", {}).get("restore", 0)
            + summary.get("pages", {}).get("create", 0),
        },
        {
            "step": 10,
            "phase": "navigation",
            "action": "Restore/create nav; fix broken refs",
            "count": summary.get("navigation", {}).get("restore", 0)
            + summary.get("navigation", {}).get("create", 0),
            "conflicts_to_fix": len(conflicts.get("navigation_broken", [])),
        },
        {
            "step": 11,
            "phase": "actions",
            "action": "Optional: sync action definitions from T13 after OT stable",
            "count": summary.get("actions", {}).get("create", 0),
            "note": "deferred",
        },
        {
            "step": 12,
            "phase": "url_rewrite",
            "action": "Rewrite /portal/13 and /designer/tenant/13 in copied JSON only",
            "count": len(summary.get("url_references_in_target", [])),
        },
        {
            "step": 13,
            "phase": "publish",
            "action": "Publish catalog for tenant 1 ONLY after separate approval",
            "note": "NOT in initial apply",
        },
        {
            "step": 14,
            "phase": "verify",
            "action": "Re-run dry run + smoke Office/Studio on /portal/1",
        },
    ]


def plan_actions(db, src_ot_keys: set[str]) -> dict[str, list]:
    src = db.query(DesignerActionDefinition).filter(
        DesignerActionDefinition.tenant_id == SOURCE,
    ).all()
    tgt = db.query(DesignerActionDefinition).filter(
        DesignerActionDefinition.tenant_id == TARGET,
    ).all()
    src_ot = _ot_id_to_key(db, SOURCE)
    tgt_ot = _ot_id_to_key(db, TARGET)
    tgt_keys = {(tgt_ot.get(a.object_type_id), a.key) for a in tgt}
    actions = {"create": [], "restore": [], "update": [], "skip": []}
    for row in src:
        ot_key = src_ot.get(row.object_type_id)
        if ot_key not in src_ot_keys or _is_test_ot_key(ot_key or ""):
            continue
        pair = (ot_key, row.key)
        if pair in tgt_keys:
            actions["skip"].append({"object_type_key": ot_key, "action_key": row.key})
        else:
            actions["create"].append({"object_type_key": ot_key, "action_key": row.key, "name": row.name})
    return actions


def main() -> None:
    db = SessionLocal()
    try:
        src_ot = _ot_key_map(db, SOURCE)
        tgt_ot = _ot_key_map(db, TARGET)
        src_ot_keys = {
            k
            for k, rows in src_ot.items()
            if _pick_ot_rows(rows)["active"] and not _is_test_ot_key(k)
        }

        ot_plan = plan_object_types(src_ot, tgt_ot)
        src_fields = collect_fields(db, SOURCE)
        tgt_fields = collect_fields(db, TARGET)
        fields_plan = plan_fields(src_fields, tgt_fields, src_ot_keys)
        src_views = collect_views(db, SOURCE)
        tgt_views = collect_views(db, TARGET)
        views_plan = plan_views(src_views, tgt_views, src_ot_keys)
        src_rel_a, _ = collect_relations(db, SOURCE)
        tgt_rel_a, tgt_rel_d = collect_relations(db, TARGET)
        relations_plan = plan_relations(src_rel_a, {}, tgt_rel_a, tgt_rel_d)
        src_ws = collect_workspaces(db, SOURCE)
        tgt_ws = collect_workspaces(db, TARGET)
        ws_plan = merge_plan_records(src_ws, tgt_ws, "slug")
        tabs_plan = plan_workspace_tabs(src_ws, tgt_ws)
        src_pages = collect_pages(db, SOURCE)
        tgt_pages = collect_pages(db, TARGET)
        pages_plan = merge_plan_records(src_pages, tgt_pages, "signature")
        src_nav = collect_navigation(db, SOURCE)
        tgt_nav = collect_navigation(db, TARGET)
        nav_plan = plan_navigation(src_nav, tgt_nav)
        actions_plan = plan_actions(db, src_ot_keys)

        plans = {
            "object_types": ot_plan,
            "fields": fields_plan,
            "relations": relations_plan,
            "views": views_plan,
            "workspaces": ws_plan,
            "workspace_tabs": tabs_plan,
            "pages": pages_plan,
            "navigation": nav_plan,
            "actions": actions_plan,
        }
        summary_counts = summarize_counts(plans)
        per_entity = {
            k: {action: len(items) for action, items in v.items()}
            for k, v in plans.items()
        }

        runtime = audit_runtime(db, TARGET)
        documents = audit_documents(db, TARGET)
        chats = audit_chats(db, TARGET)
        conflicts = detect_conflicts(db, TARGET)
        url_refs = find_url_references(db, TARGET)

        report = {
            "mode": "DRY_RUN",
            "generated_at": datetime.now().isoformat(),
            "source_tenant": SOURCE,
            "target_tenant": TARGET,
            "summary": {
                "totals": summary_counts,
                "per_entity": per_entity,
            },
            "plans": plans,
            "runtime_audit": runtime,
            "documents_audit": documents,
            "chats_audit": chats,
            "conflicts": conflicts,
            "url_references_in_target": url_refs,
            "recovery_steps": build_recovery_steps(per_entity, conflicts),
            "constraints": {
                "no_apply": True,
                "no_modify_source": True,
                "preserve_runtime": True,
                "preserve_documents_chats_notifications": True,
            },
        }

        out = BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

        print(json.dumps({"summary": report["summary"], "runtime_audit": runtime}, ensure_ascii=False, indent=2))
        print(f"\nFull DRY RUN report: {out}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
