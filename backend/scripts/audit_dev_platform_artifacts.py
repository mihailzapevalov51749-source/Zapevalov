#!/usr/bin/env python3
"""Read-only audit of DEV tenant platform artifacts (no mutations)."""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import or_, text

from app.db.session import SessionLocal
from app.modules.navigation.enrichment import enrich_navigation_tree
from app.modules.navigation.models import NavigationItem
from app.modules.navigation.page_status_filter import filter_navigation_for_user_menu
from app.modules.navigation.service import build_tree
from app.modules.navigation.repository import get_items_by_portal
from app.modules.navigation.runtime_protected_pages import (
    RUNTIME_PROTECTED_SYSTEM_KEYS,
    resolve_system_key_for_runtime_protected_title,
)
from app.modules.pages.models import Page
from app.modules.platform.designer.workspaces.models import (
    DesignerWorkspace,
    DesignerWorkspaceTab,
)
from app.modules.platform_event_journal.seed_classification import resolve_dev_tenant_portal_id
from app.modules.portals.models import Portal

TEST_MARKERS = re.compile(
    r"(test|tmp|temp|debug|sample|fake|trash|purge|nav cleanup|cleanup nav)",
    re.IGNORECASE,
)


def _portal_label(portal: Portal | None) -> str:
    if portal is None:
        return "?"
    return f"{portal.name!r} ({portal.tenant_type})"


def audit_navigation(db, portal_id: int) -> dict:
    all_items = (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == portal_id, NavigationItem.deleted_at.is_(None))
        .order_by(NavigationItem.menu_scope, NavigationItem.sort_order, NavigationItem.id)
        .all()
    )
    runtime_items = [i for i in all_items if (i.menu_scope or "runtime").lower() == "runtime"]
    designer_items = [i for i in all_items if (i.menu_scope or "").lower() == "designer"]

    pages = {
        int(p.id): p
        for p in db.query(Page).filter(Page.portal_id == portal_id, Page.deleted_at.is_(None)).all()
    }

    def row(nav: NavigationItem) -> dict:
        page = pages.get(int(nav.page_id)) if nav.page_id else None
        return {
            "id": nav.id,
            "title": nav.title,
            "system_key": nav.system_key,
            "menu_scope": nav.menu_scope,
            "type": nav.type,
            "page_id": nav.page_id,
            "page_status": page.status if page else None,
            "parent_id": nav.parent_id,
            "is_visible_db": nav.is_visible,
            "is_protected": nav.is_protected,
            "sort_order": nav.sort_order,
        }

    by_title = defaultdict(list)
    by_system_key = defaultdict(list)
    for nav in runtime_items:
        by_title[str(nav.title or "").strip()].append(row(nav))
        key = nav.system_key or resolve_system_key_for_runtime_protected_title(nav.title) or "(none)"
        by_system_key[key].append(row(nav))

    raw_tree = build_tree(runtime_items)
    filtered = filter_navigation_for_user_menu(db, runtime_items, for_edit_mode=False)
    filtered_tree = build_tree(filtered)
    api_tree = enrich_navigation_tree(db, filtered_tree)

    def flatten_visible(nodes, acc=None):
        acc = acc or []
        for node in nodes:
            payload = node.model_dump() if hasattr(node, "model_dump") else node
            if payload.get("is_visible"):
                acc.append(
                    {
                        "id": payload.get("id"),
                        "title": payload.get("title"),
                        "system_key": payload.get("system_key"),
                        "page_id": payload.get("page_id"),
                        "page_status": payload.get("page_status"),
                    }
                )
            for child in payload.get("children") or []:
                flatten_visible([child], acc)
        return acc

    api_visible = flatten_visible(api_tree)

    home_like = [
        r
        for r in (row(n) for n in runtime_items)
        if str(r["title"] or "").strip().lower() in {"главная", "главная страница", "главная офиса"}
    ]

    return {
        "counts": {
            "runtime_total": len(runtime_items),
            "designer_total": len(designer_items),
            "runtime_visible_db": sum(1 for n in runtime_items if n.is_visible),
            "api_visible_after_filter_enrich": len(api_visible),
        },
        "home_like_all_runtime": home_like,
        "api_visible_runtime": api_visible,
        "duplicate_titles": {t: rows for t, rows in by_title.items() if len(rows) > 1},
        "duplicate_system_keys": {k: rows for k, rows in by_system_key.items() if len(rows) > 1 and k != "(none)"},
        "test_marked_nav": [row(n) for n in runtime_items if TEST_MARKERS.search(str(n.title or ""))],
    }


def audit_pages(db, portal_id: int) -> dict:
    pages = db.query(Page).filter(Page.portal_id == portal_id).all()
    active = [p for p in pages if p.deleted_at is None]
    nav_by_page = defaultdict(list)
    for nav in (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == portal_id, NavigationItem.deleted_at.is_(None))
        .all()
    ):
        if nav.page_id:
            nav_by_page[int(nav.page_id)].append(nav.id)

    by_title = defaultdict(list)
    orphans = []
    test_pages = []
    for page in active:
        entry = {
            "id": page.id,
            "title": page.title,
            "status": page.status,
            "nav_ids": nav_by_page.get(int(page.id), []),
        }
        by_title[str(page.title or "").strip()].append(entry)
        if not nav_by_page.get(int(page.id)):
            orphans.append(entry)
        if TEST_MARKERS.search(str(page.title or "")):
            test_pages.append(entry)

    duplicate_titles = {t: rows for t, rows in by_title.items() if len(rows) > 1}

    nav_without_page = [
        {
            "nav_id": n.id,
            "title": n.title,
            "type": n.type,
            "menu_scope": n.menu_scope,
        }
        for n in db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == portal_id,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.page_id.is_(None),
            NavigationItem.type.in_(["page", "system_page"]),
        )
        .all()
    ]

    return {
        "counts": {"active": len(active), "deleted": len(pages) - len(active)},
        "duplicate_titles": duplicate_titles,
        "orphan_pages_no_nav": orphans[:30],
        "orphan_pages_no_nav_count": len(orphans),
        "nav_page_type_without_page_id": nav_without_page,
        "test_marked_pages": test_pages,
    }


def audit_workspaces(db, portal_id: int) -> dict:
    workspaces = (
        db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.tenant_id == portal_id, DesignerWorkspace.deleted_at.is_(None))
        .all()
    )
    tabs = (
        db.query(DesignerWorkspaceTab)
        .filter(DesignerWorkspaceTab.tenant_id == portal_id, DesignerWorkspaceTab.deleted_at.is_(None))
        .all()
    )
    page_ids = {int(p.id) for p in db.query(Page.id).filter(Page.portal_id == portal_id).all()}
    broken_tabs = [
        {
            "tab_id": str(t.id),
            "workspace_id": str(t.workspace_id),
            "target_type": t.target_type,
            "target_id": t.target_id,
            "title": t.title,
        }
        for t in tabs
        if str(t.target_type or "").lower() == "page"
        and t.target_id
        and int(t.target_id) not in page_ids
    ]
    ws_rows = [
        {
            "id": str(w.id),
            "title": w.title,
            "slug": w.slug,
            "home_page_id": w.home_page_id,
            "home_missing": w.home_page_id is not None and int(w.home_page_id) not in page_ids,
        }
        for w in workspaces
    ]
    return {
        "counts": {"workspaces": len(workspaces), "tabs": len(tabs)},
        "workspaces": ws_rows,
        "broken_tabs": broken_tabs,
        "test_marked_workspaces": [w for w in ws_rows if TEST_MARKERS.search(w["title"] or "")],
    }


def audit_test_artifacts_sql(db, portal_id: int) -> dict:
    patterns = ["%test%", "%tmp%", "%temp%", "%debug%", "%trash%", "%purge%", "%Nav %", "%cleanup%"]
    tables = [
        ("pages", "portal_id", "title"),
        ("navigation_items", "portal_id", "title"),
    ]
    hits = {}
    for table, tenant_col, title_col in tables:
        clauses = " OR ".join([f"{title_col} ILIKE :p{i}" for i in range(len(patterns))])
        params = {f"p{i}": p for i, p in enumerate(patterns)}
        params["portal_id"] = portal_id
        sql = text(
            f"SELECT id, {title_col} AS title FROM {table} "
            f"WHERE {tenant_col} = :portal_id AND deleted_at IS NULL AND ({clauses}) "
            f"ORDER BY id LIMIT 50"
        )
        try:
            rows = db.execute(sql, params).mappings().all()
            hits[table] = [dict(r) for r in rows]
        except Exception as exc:
            hits[table] = {"error": str(exc)}
    return hits


def main() -> int:
    db = SessionLocal()
    try:
        portal_id = resolve_dev_tenant_portal_id(db)
        portal = db.query(Portal).filter(Portal.id == portal_id).first()
        report = {
            "dev_portal": {
                "portal_id": portal_id,
                "label": _portal_label(portal),
            },
            "navigation": audit_navigation(db, portal_id),
            "pages": audit_pages(db, portal_id),
            "workspaces": audit_workspaces(db, portal_id),
            "test_artifacts": audit_test_artifacts_sql(db, portal_id),
        }
        print(json.dumps(report, ensure_ascii=False, indent=2, default=str))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
