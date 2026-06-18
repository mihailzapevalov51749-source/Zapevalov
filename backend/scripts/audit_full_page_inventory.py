#!/usr/bin/env python3
"""Read-only full page / entry-point inventory across all tenants."""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.navigation.models import NavigationItem
from app.modules.navigation.runtime_protected_pages import (
    RUNTIME_PROTECTED_SYSTEM_KEYS,
    resolve_system_key_for_runtime_protected_title,
)
from app.modules.pages.models import Page
from app.modules.pages.protected_pages import resolve_protected_page_key
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.designer.workspaces.models import (
    DesignerWorkspace,
    DesignerWorkspaceTab,
)
from app.modules.portals.models import Portal
from app.modules.tenant_environment.constants import TenantType

OUTPUT_DIR = REPO_ROOT / "docs" / "audit"
TEST_MARKERS = re.compile(
    r"(test|tmp|temp|debug|sample|fake|trash|purge|nav cleanup|cleanup nav|dry.?run)",
    re.IGNORECASE,
)

RUNTIME_MODULE_KEYS = frozenset(
    key for key in RUNTIME_PROTECTED_SYSTEM_KEYS if key != "runtime.office_home"
)


def _norm(value) -> str:
    return str(value or "").strip()


def _slug_for_page(page_id: int, nav_urls: list[str]) -> str:
    for url in nav_urls:
        text = _norm(url)
        if not text:
            continue
        slug = text.rstrip("/").split("/")[-1]
        if slug and slug.isdigit() and int(slug) == page_id:
            continue
        if slug:
            return slug
    return f"page-{page_id}"


def _resolve_runtime_key(nav: NavigationItem | None) -> str | None:
    if nav is None:
        return None
    key = _norm(nav.system_key)
    if key.startswith("runtime."):
        return key
    derived = resolve_system_key_for_runtime_protected_title(nav.title)
    return derived if derived else None


def _classify_page(
    *,
    page: Page,
    nav: NavigationItem | None,
    runtime_key: str | None,
    protected_key: str | None,
    workspace_home: bool,
    workspace_tab: bool,
    orphan: bool,
) -> str:
    status = _norm(page.status).lower()
    if orphan and status == "draft":
        return "draft_page"
    if orphan:
        return "orphan_page"
    if runtime_key == "runtime.office_home" or protected_key == "office_home":
        return "special_office_home"
    if runtime_key in RUNTIME_MODULE_KEYS:
        return "runtime_module_entry"
    if workspace_home or workspace_tab:
        return "workspace_page"
    if nav and _norm(nav.type) == "object_type":
        return "object_type_entry"
    if nav and _norm(nav.type) == "document_library":
        return "document_library_entry"
    if status == "draft":
        return "draft_page"
    return "user_page"


def _displays_for(
    *,
    classification: str,
    runtime_key: str | None,
    nav_type: str | None,
) -> str:
    if runtime_key == "runtime.chat":
        return "runtime chat UI"
    if runtime_key == "runtime.calendar":
        return "runtime calendar UI"
    if runtime_key == "runtime.notifications":
        return "notifications overlay/page"
    if classification == "special_office_home":
        return "CMS canvas (office home)"
    if classification == "object_type_entry":
        return "object table/view"
    if classification == "document_library_entry":
        return "document library"
    if classification == "workspace_page":
        return "workspace screen"
    if classification in {"orphan_page", "draft_page"}:
        return "unknown/empty/draft"
    if _norm(nav_type) == "page":
        return "CMS canvas"
    return "unknown/empty/draft"


def _ownership(classification: str, is_test: bool) -> str:
    if is_test:
        return "Legacy/test artifact"
    if classification in {
        "special_office_home",
        "runtime_module_entry",
        "studio_virtual_page",
        "control_plane_virtual_page",
    }:
        return "Platform system"
    if classification == "object_type_entry":
        return "Object model"
    if classification == "document_library_entry":
        return "Document library"
    if classification == "user_page":
        return "User-created content"
    if classification == "workspace_page":
        return "Tenant configuration"
    if classification in {"orphan_page", "draft_page", "legacy_duplicate"}:
        return "Legacy/test artifact"
    return "Unknown"


def _system_user_decision(classification: str, is_test: bool) -> tuple[str, str]:
    mapping = {
        "special_office_home": (
            "special",
            "runtime.office_home protected home page",
        ),
        "runtime_module_entry": (
            "system",
            "runtime.* navigation entry backed by page row",
        ),
        "user_page": ("user", "tenant content page with navigation/workspace use"),
        "object_type_entry": ("user", "object_type nav entry; not runtime module"),
        "document_library_entry": ("user", "document_library nav; not runtime module"),
        "workspace_page": ("user", "page used inside workspace home/tab"),
        "studio_virtual_page": ("virtual", "frontend-only designer route"),
        "control_plane_virtual_page": ("virtual", "frontend-only control plane route"),
        "orphan_page": ("legacy", "page row without navigation/workspace binding"),
        "draft_page": ("needs_review", "draft without clear publication path"),
        "legacy_duplicate": ("legacy", "duplicate runtime/system binding"),
    }
    if is_test:
        return "legacy", "title/id matches test marker heuristics"
    return mapping.get(classification, ("needs_review", "classification incomplete"))


def _actions_for(classification: str, is_protected: bool, nav: NavigationItem | None) -> dict:
    is_runtime = classification in {"special_office_home", "runtime_module_entry"}
    is_virtual = classification in {"studio_virtual_page", "control_plane_virtual_page"}
    is_object = classification == "object_type_entry"
    is_doc = classification == "document_library_entry"
    is_orphan = classification in {"orphan_page", "draft_page", "legacy_duplicate"}

    return {
        "show_in_pages_registry": "no"
        if is_runtime or is_virtual or is_object or is_doc
        else "yes",
        "show_in_modules_registry": "yes" if is_runtime else "no",
        "show_in_objects_registry": "yes" if is_object else "no",
        "show_in_navigation": "yes"
        if nav and nav.is_visible and not is_virtual
        else "no",
        "allow_rename": "no"
        if is_runtime or is_virtual or is_object
        else "yes",
        "allow_hide": "yes"
        if nav and (is_runtime or classification == "user_page")
        else "no",
        "allow_delete": "no"
        if is_protected or is_runtime or is_virtual or is_object
        else "yes",
        "allow_duplicate": "no" if is_runtime or is_virtual or is_object else "yes",
        "allow_edit_content": "no" if is_runtime and classification == "runtime_module_entry" else "yes",
        "allow_module_settings": "yes" if is_runtime else "no",
    }


def _ui_locations(
    *,
    classification: str,
    nav: NavigationItem | None,
    has_workspace: bool,
    in_page_registry: bool,
    is_virtual_studio: bool,
    is_virtual_cp: bool,
) -> dict[str, str]:
    menu_scope = _norm(nav.menu_scope).lower() if nav else ""
    office_nav = (
        "yes"
        if nav
        and menu_scope == "runtime"
        and nav.is_visible
        and classification
        not in {"studio_virtual_page", "control_plane_virtual_page", "orphan_page"}
        else "no"
    )
    office_route = (
        "yes"
        if nav and nav.page_id and menu_scope == "runtime"
        else "no"
    )
    return {
        "office_left_sidebar": office_nav,
        "office_route": office_route,
        "studio_left_sidebar": "yes" if is_virtual_studio else "no",
        "studio_pages_registry": "yes" if in_page_registry else "no",
        "studio_objects_registry": "yes"
        if classification == "object_type_entry"
        else "no",
        "studio_documents_registry": "no",
        "studio_modules_registry": "no",
        "control_plane_sidebar": "yes" if is_virtual_cp else "no",
        "control_plane_route": "yes" if is_virtual_cp else "no",
        "workspace_tabs": "yes" if has_workspace else "no",
        "navigation_settings": "yes" if nav and menu_scope == "runtime" else "no",
    }


def _risk(classification: str, runtime_key: str | None, orphan: bool, is_dup: bool) -> str:
    if is_dup:
        return "high — duplicate system binding"
    if orphan and classification == "draft_page":
        return "low — orphan draft"
    if orphan:
        return "medium — unused page row"
    if classification == "runtime_module_entry" and not _norm(runtime_key):
        return "high — runtime entry without system_key"
    if classification == "runtime_module_entry":
        return "medium — page-backed runtime module"
    if classification == "special_office_home":
        return "medium — protected home"
    return "low"


def load_portals(db: Session) -> list[Portal]:
    return db.query(Portal).order_by(Portal.id.asc()).all()


def build_workspace_maps(db: Session) -> tuple[dict, dict, dict]:
    home_pages: dict[int, list[dict]] = defaultdict(list)
    tab_pages: dict[int, list[dict]] = defaultdict(list)
    workspaces_by_tenant: dict[int, list[dict]] = defaultdict(list)

    for ws in db.query(DesignerWorkspace).filter(DesignerWorkspace.deleted_at.is_(None)).all():
        tid = int(ws.tenant_id)
        workspaces_by_tenant[tid].append(
            {
                "workspace_id": ws.id,
                "title": ws.title,
                "slug": ws.slug,
                "home_page_id": ws.home_page_id,
            }
        )
        if ws.home_page_id:
            home_pages[int(ws.home_page_id)].append(
                {"workspace_id": ws.id, "title": ws.title, "slug": ws.slug}
            )

    for tab in db.query(DesignerWorkspaceTab).filter(DesignerWorkspaceTab.deleted_at.is_(None)).all():
        if _norm(tab.tab_type) != "page":
            continue
        target = _norm(tab.target_id)
        if not target.isdigit():
            continue
        page_id = int(target)
        tab_pages[page_id].append(
            {
                "tab_id": tab.id,
                "workspace_id": tab.workspace_id,
                "title": tab.title,
                "slug": tab.slug,
            }
        )

    return home_pages, tab_pages, workspaces_by_tenant


def audit(db: Session) -> dict:
    portals = load_portals(db)
    home_pages, tab_pages, workspaces_by_tenant = build_workspace_maps(db)

    object_types_by_id = {
        str(row.id): row
        for row in db.query(DesignerObjectType).filter(DesignerObjectType.deleted_at.is_(None)).all()
    }

    tenants_table = []
    pages_registry = []
    nav_without_page = []
    problems = []

    runtime_key_groups: dict[tuple[int, str], list[dict]] = defaultdict(list)
    orphan_pages = []
    nav_missing_system_key = []
    pages_unused = []

    for portal in portals:
        pid = int(portal.id)
        tenant_type = _norm(portal.tenant_type)
        tenants_table.append(
            {
                "tenant_id": pid,
                "portal_id": pid,
                "tenant_name": portal.name,
                "tenant_type": tenant_type,
                "is_dev": tenant_type == TenantType.DEV.value,
                "is_template": tenant_type == TenantType.TEMPLATE.value,
                "is_client": tenant_type == TenantType.CLIENT.value,
            }
        )

        pages = (
            db.query(Page)
            .filter(Page.portal_id == pid, Page.deleted_at.is_(None))
            .order_by(Page.id.asc())
            .all()
        )
        nav_items = (
            db.query(NavigationItem)
            .filter(NavigationItem.portal_id == pid, NavigationItem.deleted_at.is_(None))
            .all()
        )
        nav_by_page: dict[int, list[NavigationItem]] = defaultdict(list)
        nav_urls_by_page: dict[int, list[str]] = defaultdict(list)
        for nav in nav_items:
            if nav.page_id:
                nav_by_page[int(nav.page_id)].append(nav)
                if nav.url:
                    nav_urls_by_page[int(nav.page_id)].append(_norm(nav.url))

        used_page_ids: set[int] = set()

        for page in pages:
            page_id = int(page.id)
            linked_navs = nav_by_page.get(page_id, [])
            primary_nav = (
                min(linked_navs, key=lambda n: (n.sort_order or 0, n.id))
                if linked_navs
                else None
            )
            runtime_key = _resolve_runtime_key(primary_nav)
            protected_key = resolve_protected_page_key(db, tenant_id=pid, page=page)
            ws_home = page_id in home_pages
            ws_tab = page_id in tab_pages
            has_nav = bool(linked_navs)
            orphan = not has_nav and not ws_home and not ws_tab
            is_test = bool(TEST_MARKERS.search(page.title or ""))

            classification = _classify_page(
                page=page,
                nav=primary_nav,
                runtime_key=runtime_key,
                protected_key=protected_key,
                workspace_home=ws_home,
                workspace_tab=ws_tab,
                orphan=orphan,
            )

            if runtime_key:
                runtime_key_groups[(pid, runtime_key)].append(
                    {"page_id": page_id, "nav_id": primary_nav.id if primary_nav else None}
                )

            if orphan:
                orphan_pages.append(
                    {
                        "tenant_id": pid,
                        "page_id": page_id,
                        "title": page.title,
                        "status": page.status,
                    }
                )

            if has_nav or ws_home or ws_tab:
                used_page_ids.add(page_id)
            else:
                pages_unused.append(
                    {"tenant_id": pid, "page_id": page_id, "title": page.title, "status": page.status}
                )

            ot_key = None
            if primary_nav and primary_nav.object_type_id:
                ot = object_types_by_id.get(str(primary_nav.object_type_id))
                ot_key = ot.key if ot else None

            is_protected = protected_key is not None
            decision, decision_reason = _system_user_decision(classification, is_test)
            displays = _displays_for(
                classification=classification,
                runtime_key=runtime_key,
                nav_type=primary_nav.type if primary_nav else None,
            )
            actions = _actions_for(classification, is_protected, primary_nav)
            ui = _ui_locations(
                classification=classification,
                nav=primary_nav,
                has_workspace=ws_home or ws_tab,
                in_page_registry=True,
                is_virtual_studio=False,
                is_virtual_cp=False,
            )

            location_parts = []
            if ui["office_left_sidebar"] == "yes":
                location_parts.append("Office sidebar")
            if ui["studio_pages_registry"] == "yes":
                location_parts.append("Studio Pages registry")
            if ui["workspace_tabs"] == "yes":
                location_parts.append("Workspace tabs")

            recommended_place = "Studio Pages"
            if classification in {"special_office_home", "runtime_module_entry"}:
                recommended_place = "Studio Modules (not Pages)"
            elif classification == "object_type_entry":
                recommended_place = "Objects registry / Office nav"
            elif classification == "document_library_entry":
                recommended_place = "Documents / Office nav"
            elif classification in {"orphan_page", "draft_page", "legacy_duplicate"}:
                recommended_place = "Archive/review only"

            row = {
                "tenant_id": pid,
                "portal_id": pid,
                "tenant_name": portal.name,
                "tenant_type": tenant_type,
                "page_id": page_id,
                "title": page.title,
                "slug": _slug_for_page(page_id, nav_urls_by_page.get(page_id, [])),
                "status": page.status,
                "parent_id": None,
                "sort_order": page.sort_order,
                "created_at": page.created_at.isoformat() if page.created_at else None,
                "updated_at": page.updated_at.isoformat() if page.updated_at else None,
                "has_navigation_item": has_nav,
                "navigation_item_id": primary_nav.id if primary_nav else None,
                "navigation_item_ids": [n.id for n in linked_navs],
                "navigation_title": primary_nav.title if primary_nav else None,
                "navigation_type": primary_nav.type if primary_nav else None,
                "navigation_system_key": primary_nav.system_key if primary_nav else None,
                "navigation_object_type_key": ot_key,
                "navigation_is_system": primary_nav.is_system if primary_nav else None,
                "navigation_is_protected": primary_nav.is_protected if primary_nav else None,
                "navigation_is_visible": primary_nav.is_visible if primary_nav else None,
                "navigation_parent_id": primary_nav.parent_id if primary_nav else None,
                "runtime_key_derived": runtime_key,
                "protected_key": protected_key,
                "classification": classification,
                "displays": displays,
                "ownership": _ownership(classification, is_test),
                "system_user_decision": decision,
                "decision_reason": decision_reason,
                "page_backed": True,
                "virtual": False,
                "ui_locations": ui,
                "actions_recommended": actions,
                "location_summary": ", ".join(location_parts) or "nowhere",
                "recommended_place": recommended_place,
                "risk": _risk(classification, runtime_key, orphan, False),
                "workspace_home": home_pages.get(page_id, []),
                "workspace_tabs": tab_pages.get(page_id, []),
            }
            pages_registry.append(row)

            if (
                primary_nav
                and runtime_key in RUNTIME_PROTECTED_SYSTEM_KEYS
                and not _norm(primary_nav.system_key)
            ):
                nav_missing_system_key.append(
                    {
                        "tenant_id": pid,
                        "nav_id": primary_nav.id,
                        "page_id": page_id,
                        "title": primary_nav.title,
                        "runtime_key_derived": runtime_key,
                    }
                )

        for nav in nav_items:
            if nav.page_id:
                continue
            nav_type = _norm(nav.type)
            ot_key = None
            library_id = nav.library_id
            if nav.object_type_id:
                ot = object_types_by_id.get(str(nav.object_type_id))
                ot_key = ot.key if ot else None

            if nav_type == "object_type":
                classification = "object_type_entry"
            elif nav_type == "document_library":
                classification = "document_library_entry"
            else:
                classification = "unknown"

            nav_without_page.append(
                {
                    "tenant_id": pid,
                    "portal_id": pid,
                    "tenant_name": portal.name,
                    "tenant_type": tenant_type,
                    "nav_id": nav.id,
                    "title": nav.title,
                    "nav_type": nav_type,
                    "system_key": nav.system_key,
                    "object_type_key": ot_key,
                    "library_id": library_id,
                    "is_system": nav.is_system,
                    "is_protected": nav.is_protected,
                    "is_visible": nav.is_visible,
                    "menu_scope": nav.menu_scope,
                    "classification": classification,
                    "displays": _displays_for(
                        classification=classification,
                        runtime_key=None,
                        nav_type=nav_type,
                    ),
                    "ownership": _ownership(classification, False),
                    "system_user_decision": "user",
                    "location_summary": "Office sidebar" if nav.is_visible else "hidden nav",
                    "recommended_place": "Objects registry"
                    if classification == "object_type_entry"
                    else "Documents",
                }
            )

    # Duplicate analysis
    duplicates = []
    for (pid, runtime_key), items in runtime_key_groups.items():
        if len(items) <= 1:
            continue
        duplicates.append(
            {
                "tenant_id": pid,
                "runtime_key": runtime_key,
                "count": len(items),
                "bindings": items,
            }
        )
        for item in items:
            problems.append(
                {
                    "problem": "legacy_duplicate",
                    "tenant_id": pid,
                    "entity": f"page_id={item['page_id']} nav_id={item['nav_id']}",
                    "reason": f"multiple bindings for {runtime_key}",
                    "severity": "high",
                    "recommendation": "reconcile to single canonical nav/page",
                }
            )

    for row in nav_missing_system_key:
        problems.append(
            {
                "problem": "missing_system_key",
                "tenant_id": row["tenant_id"],
                "entity": f"nav_id={row['nav_id']} page_id={row['page_id']}",
                "reason": f"derived {row['runtime_key_derived']} from title only",
                "severity": "medium",
                "recommendation": "backfill system_key + is_system",
            }
        )

    for row in orphan_pages:
        problems.append(
            {
                "problem": "orphan_page",
                "tenant_id": row["tenant_id"],
                "entity": f"page_id={row['page_id']} title={row['title']!r}",
                "reason": "no navigation/workspace binding",
                "severity": "low" if row["status"] == "draft" else "medium",
                "recommendation": "review for purge or publish",
            }
        )

    for nav in (
        db.query(NavigationItem)
        .filter(NavigationItem.deleted_at.is_(None), NavigationItem.page_id.is_(None))
        .all()
    ):
        if _norm(nav.type) not in {"object_type", "document_library", "section", "folder"}:
            problems.append(
                {
                    "problem": "nav_without_page",
                    "tenant_id": nav.portal_id,
                    "entity": f"nav_id={nav.id} type={nav.type}",
                    "reason": "navigation item without page_id",
                    "severity": "needs_review",
                    "recommendation": "validate nav type",
                }
            )

    virtual_routes = _virtual_routes_catalog()

    summary = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "tenant_count": len(tenants_table),
        "page_rows": len(pages_registry),
        "nav_without_page_rows": len(nav_without_page),
        "virtual_routes": len(virtual_routes),
        "problems_count": len(problems),
        "duplicates_count": len(duplicates),
        "orphan_pages_count": len(orphan_pages),
        "by_classification": dict(Counter(row["classification"] for row in pages_registry)),
        "by_tenant_type": dict(Counter(row["tenant_type"] for row in pages_registry)),
    }

    return {
        "summary": summary,
        "table_1_tenants": tenants_table,
        "table_2_full_page_registry": pages_registry,
        "table_3_runtime_system_entries": [
            row
            for row in pages_registry
            if row["classification"] in {"special_office_home", "runtime_module_entry"}
        ],
        "table_4_user_pages": [
            row
            for row in pages_registry
            if row["classification"] in {"user_page", "workspace_page", "draft_page"}
        ],
        "table_5_object_document_entries": nav_without_page,
        "table_6_virtual_routes": virtual_routes,
        "table_7_problems": problems,
        "duplicate_and_orphan_analysis": {
            "duplicates_by_runtime_key": duplicates,
            "orphan_pages": orphan_pages,
            "nav_missing_system_key": nav_missing_system_key,
            "pages_unused": pages_unused,
            "hidden_pages": [
                row
                for row in pages_registry
                if _norm(row["status"]).lower() == "hidden"
            ],
            "draft_pages": [
                row
                for row in pages_registry
                if _norm(row["status"]).lower() == "draft"
            ],
        },
    }
def _virtual_routes_catalog() -> list[dict]:
    studio_base = "/designer/tenant/{tenant_id}"
    studio_items = [
        ("system-designer-objects", "Объекты", f"{studio_base}/object-types", "DesignerShell.jsx"),
        ("system-designer-pages", "Страницы", f"{studio_base}/pages", "DesignerShell.jsx"),
        ("system-designer-trash", "Корзина", f"{studio_base}/trash", "DesignerShell.jsx"),
        ("system-designer-processes", "Бизнес-процессы", f"{studio_base}/processes", "DesignerShell.jsx"),
        ("system-designer-workspaces", "Рабочие пространства", f"{studio_base}/workspaces", "DesignerShell.jsx"),
        ("system-designer-event-journal", "Журнал событий", f"{studio_base}/event-journal", "DesignerShell.jsx"),
        ("system-designer-platform-releases", "Релизы платформы", f"{studio_base}/platform-releases", "DesignerShell.jsx"),
        ("system-designer-tenant-administration", "Администрирование", "/admin/tenant/{tenant_id}", "DesignerShell.jsx"),
        ("system-designer-control-plane", "Управление платформой", "/control-plane", "DesignerShell.jsx"),
    ]
    cp_items = [
        ("cp-overview", "Главная", "/control-plane", "controlPlaneNavigation.js"),
        ("cp-group-companies", "Компании", "/control-plane/companies/clients", "controlPlaneNavigation.js"),
        ("cp-templates-versions", "Версии шаблонов", "/control-plane/templates/versions", "controlPlaneNavigation.js"),
        ("cp-templates-updates", "Обновления", "/control-plane/templates/updates", "controlPlaneNavigation.js"),
        ("cp-releases", "Релизы", "/control-plane/releases", "controlPlaneNavigation.js"),
        ("cp-group-platform-profile", "Профиль платформы", "/control-plane/platform-profile/general", "controlPlaneNavigation.js"),
        ("cp-platform-licenses", "Лицензии", "/control-plane/platform/licenses", "controlPlaneNavigation.js"),
        ("cp-platform-policies", "Политики", "/control-plane/platform/policies", "controlPlaneNavigation.js"),
        ("cp-platform-monitoring", "Мониторинг", "/control-plane/platform/monitoring", "controlPlaneNavigation.js"),
        ("cp-platform-backup", "Резервное копирование", "/control-plane/platform/backup", "controlPlaneNavigation.js"),
        ("cp-group-users-roles", "Пользователи и роли", "/control-plane/users-roles", "controlPlaneNavigation.js"),
        ("cp-audit-log", "Журнал аудита", "/control-plane/audit-log", "controlPlaneNavigation.js"),
    ]
    rows = []
    for item_id, title, route, source in studio_items:
        rows.append(
            {
                "area": "Studio",
                "route": route,
                "title": title,
                "source_file": source,
                "purpose": "designer admin screen",
                "system_user": "virtual",
                "page_backed": False,
            }
        )
    for item_id, title, route, source in cp_items:
        rows.append(
            {
                "area": "Control Plane",
                "route": route,
                "title": title,
                "source_file": source,
                "purpose": "control plane admin screen",
                "system_user": "virtual",
                "page_backed": False,
            }
        )
    return rows


def write_csv(path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            flat = {}
            for key in fieldnames:
                value = row.get(key)
                if isinstance(value, (dict, list)):
                    flat[key] = json.dumps(value, ensure_ascii=False)
                else:
                    flat[key] = value
            writer.writerow(flat)


def main() -> None:
    db = SessionLocal()
    try:
        payload = audit(db)
    finally:
        db.close()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUTPUT_DIR / "full_page_inventory_audit.json"
    json_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )

    write_csv(
        OUTPUT_DIR / "table_1_tenants.csv",
        payload["table_1_tenants"],
        [
            "tenant_id",
            "portal_id",
            "tenant_name",
            "tenant_type",
            "is_dev",
            "is_template",
            "is_client",
        ],
    )
    write_csv(
        OUTPUT_DIR / "table_2_full_page_registry.csv",
        payload["table_2_full_page_registry"],
        [
            "tenant_id",
            "portal_id",
            "tenant_name",
            "tenant_type",
            "page_id",
            "title",
            "slug",
            "status",
            "navigation_item_id",
            "navigation_type",
            "navigation_system_key",
            "navigation_object_type_key",
            "runtime_key_derived",
            "classification",
            "displays",
            "location_summary",
            "recommended_place",
            "system_user_decision",
            "risk",
        ],
    )
    write_csv(
        OUTPUT_DIR / "table_3_runtime_system_entries.csv",
        payload["table_3_runtime_system_entries"],
        [
            "tenant_id",
            "page_id",
            "title",
            "navigation_item_id",
            "navigation_system_key",
            "runtime_key_derived",
            "displays",
            "location_summary",
            "recommended_place",
            "risk",
        ],
    )
    write_csv(
        OUTPUT_DIR / "table_5_object_document_entries.csv",
        payload["table_5_object_document_entries"],
        [
            "tenant_id",
            "nav_id",
            "title",
            "nav_type",
            "system_key",
            "object_type_key",
            "library_id",
            "classification",
            "location_summary",
            "recommended_place",
        ],
    )
    write_csv(
        OUTPUT_DIR / "table_6_virtual_routes.csv",
        payload["table_6_virtual_routes"],
        ["area", "route", "title", "source_file", "purpose", "system_user", "page_backed"],
    )
    write_csv(
        OUTPUT_DIR / "table_7_problems.csv",
        payload["table_7_problems"],
        ["problem", "tenant_id", "entity", "reason", "severity", "recommendation"],
    )

    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))
    print(f"JSON: {json_path}")
    print(f"CSV dir: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
