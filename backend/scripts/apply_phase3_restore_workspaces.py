#!/usr/bin/env python3
"""APPLY Phase 3: restore workspaces + tabs from tenant 13 -> tenant 1."""

from __future__ import annotations

import json
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from uuid import UUID

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import func, text  # noqa: E402

from app.db.session import SessionLocal  # noqa: E402
from app.modules.chats.models import Chat, ChatMessage, ChatParticipant  # noqa: E402
from app.modules.document_libraries.models import DocumentLibrary, LibraryDocument  # noqa: E402
from app.modules.pages.models import Page  # noqa: E402
from app.modules.platform.designer.object_types.models import DesignerObjectType  # noqa: E402
from app.modules.platform.designer.field_definitions.models import DesignerFieldDefinition  # noqa: E402
from app.modules.platform.designer.relation_definitions.models import DesignerRelationDefinition  # noqa: E402
from app.modules.platform.designer.view_definitions.models import DesignerViewDefinition  # noqa: E402
from app.modules.platform.designer.workspaces.models import (  # noqa: E402
    DesignerWorkspace,
    DesignerWorkspaceTab,
)
from app.modules.tenant_bootstrap.context import CloneContext  # noqa: E402
from app.modules.tenant_bootstrap.url_rewrite import rewrite_tenant_urls  # noqa: E402
from app.modules.users.models import User  # noqa: F401, E402

SOURCE = 13
TARGET = 1
TARGET_SLUGS = ("razrabotka", "teh-podderzhka", "upravlenie-platformoy", "otdel-kadrov-2")


def _page_sig(page: Page) -> str:
    return f"{page.title}|{page.sort_order}|{bool(page.is_home)}"


def safety_counts(db) -> dict[str, int]:
    ws_t1_ids = [
        row[0]
        for row in db.query(DesignerWorkspace.id)
        .filter(DesignerWorkspace.tenant_id == TARGET)
        .all()
    ]
    chat_ids = [row[0] for row in db.query(Chat.id).all()]
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
        "document_libraries": int(db.query(func.count(DocumentLibrary.id)).scalar() or 0),
        "library_documents": int(db.query(func.count(LibraryDocument.id)).scalar() or 0),
        "chats": int(db.query(func.count(Chat.id)).scalar() or 0),
        "chat_messages": int(db.query(func.count(ChatMessage.id)).scalar() or 0),
        "chat_participants": int(db.query(func.count(ChatParticipant.id)).scalar() or 0),
        "notifications": int(db.execute(text("SELECT COUNT(*) FROM notifications")).scalar() or 0),
        "comments": int(db.execute(text("SELECT COUNT(*) FROM comments")).scalar() or 0),
        "notes": int(db.execute(text("SELECT COUNT(*) FROM notes")).scalar() or 0),
        "workspaces_t1_active": int(
            db.query(func.count(DesignerWorkspace.id))
            .filter(
                DesignerWorkspace.tenant_id == TARGET,
                DesignerWorkspace.deleted_at.is_(None),
            )
            .scalar()
            or 0
        ),
        "workspace_tabs_t1_active": int(
            db.query(func.count(DesignerWorkspaceTab.id))
            .filter(
                DesignerWorkspaceTab.tenant_id == TARGET,
                DesignerWorkspaceTab.deleted_at.is_(None),
            )
            .scalar()
            or 0
        ),
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

    src_fields = db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == SOURCE,
        DesignerFieldDefinition.deleted_at.is_(None),
    ).all()
    tgt_field_index: dict[tuple[str, str], UUID] = {}
    for row in db.query(DesignerFieldDefinition).filter(
        DesignerFieldDefinition.tenant_id == TARGET,
        DesignerFieldDefinition.deleted_at.is_(None),
    ).all():
        ot_key = next((k for k, ot in tgt_ot.items() if ot.id == row.object_type_id), None)
        if ot_key:
            tgt_field_index[(ot_key, row.key)] = row.id
    src_ot_id_to_key = {ot.id: key for key, ot in src_ot.items()}
    for row in src_fields:
        ot_key = src_ot_id_to_key.get(row.object_type_id)
        if ot_key and (ot_key, row.key) in tgt_field_index:
            ctx.field_id_map[row.id] = tgt_field_index[(ot_key, row.key)]

    src_views = db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == SOURCE,
        DesignerViewDefinition.deleted_at.is_(None),
    ).all()
    tgt_view_index: dict[tuple[str, str], UUID] = {}
    for row in db.query(DesignerViewDefinition).filter(
        DesignerViewDefinition.tenant_id == TARGET,
        DesignerViewDefinition.deleted_at.is_(None),
    ).all():
        ot_key = next((k for k, ot in tgt_ot.items() if ot.id == row.object_type_id), None)
        if ot_key:
            tgt_view_index[(ot_key, row.key)] = row.id
    for row in src_views:
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

    return ctx


def workspace_rows(db, tenant_id: int) -> list[DesignerWorkspace]:
    return (
        db.query(DesignerWorkspace)
        .filter(DesignerWorkspace.tenant_id == tenant_id)
        .order_by(DesignerWorkspace.slug.asc())
        .all()
    )


def active_tabs(db, workspace_id: int) -> list[DesignerWorkspaceTab]:
    return (
        db.query(DesignerWorkspaceTab)
        .filter(
            DesignerWorkspaceTab.workspace_id == workspace_id,
            DesignerWorkspaceTab.deleted_at.is_(None),
        )
        .order_by(DesignerWorkspaceTab.sort_order.asc(), DesignerWorkspaceTab.slug.asc())
        .all()
    )


def ot_key(db, object_type_id: UUID | None) -> str | None:
    if not object_type_id:
        return None
    row = db.query(DesignerObjectType.key).filter(DesignerObjectType.id == object_type_id).first()
    return row[0] if row else None


def view_key(db, view_id: UUID | None) -> str | None:
    if not view_id:
        return None
    row = db.query(DesignerViewDefinition.key).filter(DesignerViewDefinition.id == view_id).first()
    return row[0] if row else None


def page_title(db, page_id: int | None) -> str | None:
    if not page_id:
        return None
    row = db.query(Page.title).filter(Page.id == page_id).first()
    return row[0] if row else None


def dry_check(db) -> dict:
    src_ws = {w.slug: w for w in workspace_rows(db, SOURCE) if w.deleted_at is None}
    tgt_all = {w.slug: w for w in workspace_rows(db, TARGET)}
    tgt_active = {s: w for s, w in tgt_all.items() if w.deleted_at is None}

    workspace_table = []
    for slug in TARGET_SLUGS:
        s = src_ws.get(slug)
        t = tgt_active.get(slug)
        if not s:
            continue
        src_tabs = len(active_tabs(db, s.id))
        tgt_tabs = len(active_tabs(db, t.id)) if t else 0
        if t:
            action = "update" if slug == "razrabotka" and t.title != s.title else "skip"
        else:
            deleted = tgt_all.get(slug)
            action = "restore" if deleted and deleted.deleted_at else "create"
        workspace_table.append(
            {
                "workspace": s.title,
                "slug": slug,
                "active_t13": True,
                "active_t1": t is not None,
                "tabs_count_t13": src_tabs,
                "tabs_count_t1": tgt_tabs,
                "exists_in_t1": slug in tgt_all,
                "action": action,
            }
        )

    tab_plans = []
    for slug in TARGET_SLUGS:
        s = src_ws.get(slug)
        if not s:
            continue
        t = tgt_active.get(slug)
        existing_tab_slugs = {tab.slug for tab in active_tabs(db, t.id)} if t else set()
        for tab in active_tabs(db, s.id):
            action = "skip" if tab.slug in existing_tab_slugs else "create"
            tab_plans.append(
                {
                    "workspace_slug": slug,
                    "workspace_title": s.title,
                    "tab_title": tab.title,
                    "tab_slug": tab.slug,
                    "tab_type": tab.tab_type,
                    "object_type_key": ot_key(db, tab.object_type_id),
                    "view_key": view_key(db, tab.object_view_id),
                    "page": page_title(db, int(tab.target_id)) if tab.target_id and str(tab.target_id).isdigit() else tab.target_id,
                    "action": action,
                }
            )

    ws_slug_by_id = {w.id: w.slug for w in workspace_rows(db, TARGET)}
    chat_audit = []
    for ws_id, slug in ws_slug_by_id.items():
        count = db.query(func.count(Chat.id)).filter(Chat.workspace_id == ws_id).scalar()
        if count:
            chat_audit.append(
                {"workspace_id": ws_id, "workspace_slug": slug, "chat_count": int(count)}
            )

    return {
        "workspaces": workspace_table,
        "tabs": tab_plans,
        "chat_safety": chat_audit,
    }


def print_dry_check(check: dict) -> None:
    print("=== WORKSPACES ===")
    print("Workspace | Slug | Active T13 | Active T1 | Tabs T13 | Tabs T1 | Exists T1 | Action")
    for row in check["workspaces"]:
        print(
            f"{row['workspace']} | {row['slug']} | {row['active_t13']} | {row['active_t1']} | "
            f"{row['tabs_count_t13']} | {row['tabs_count_t1']} | {row['exists_in_t1']} | {row['action']}"
        )
    print("\n=== WORKSPACE TABS ===")
    for row in check["tabs"]:
        print(
            f"{row['workspace_slug']} | {row['tab_title']} | {row['tab_slug']} | "
            f"ot={row['object_type_key']} | page={row['page']} | view={row['view_key']} | {row['action']}"
        )
    print("\n=== CHAT SAFETY AUDIT ===")
    if not check["chat_safety"]:
        print("No chats linked to tenant 1 workspaces")
    for row in check["chat_safety"]:
        print(
            f"workspace_id={row['workspace_id']} slug={row['workspace_slug']} chats={row['chat_count']}"
        )


def apply_phase3(db) -> dict:
    before = safety_counts(db)
    ctx = build_remap_context(db)

    src_ws = {
        w.slug: w
        for w in workspace_rows(db, SOURCE)
        if w.deleted_at is None and w.slug in TARGET_SLUGS
    }
    tgt_by_slug = {w.slug: w for w in workspace_rows(db, TARGET)}

    created_workspaces: list[dict] = []
    updated_workspaces: list[dict] = []
    created_tabs: list[dict] = []

    try:
        for slug in TARGET_SLUGS:
            src = src_ws.get(slug)
            if not src:
                continue
            tgt = tgt_by_slug.get(slug)
            if tgt and tgt.deleted_at is None:
                ctx.workspace_id_map[src.id] = tgt.id
                if slug == "razrabotka" and tgt.title != src.title:
                    tgt.title = src.title
                    updated_workspaces.append({"slug": slug, "title": src.title, "id": tgt.id})
            elif tgt and tgt.deleted_at is not None:
                raise RuntimeError(
                    f"Workspace {slug} is soft-deleted in T1; restore via trash required, not recreate"
                )
            else:
                home_page_id = ctx.page_id_map.get(src.home_page_id) if src.home_page_id else None
                clone = DesignerWorkspace(
                    tenant_id=TARGET,
                    title=src.title,
                    description=src.description,
                    slug=src.slug,
                    status=src.status,
                    icon=src.icon,
                    sort_order=src.sort_order,
                    navigation_item_id=None,
                    home_page_id=home_page_id,
                )
                db.add(clone)
                db.flush()
                ctx.workspace_id_map[src.id] = clone.id
                tgt_by_slug[slug] = clone
                created_workspaces.append(
                    {"id": clone.id, "slug": clone.slug, "title": clone.title}
                )

        for slug in TARGET_SLUGS:
            src = src_ws.get(slug)
            if not src:
                continue
            tgt_ws_id = ctx.workspace_id_map.get(src.id)
            if not tgt_ws_id:
                continue
            existing_slugs = {t.slug for t in active_tabs(db, tgt_ws_id)}
            for tab in active_tabs(db, src.id):
                if tab.slug in existing_slugs:
                    continue
                object_type_id = (
                    ctx.object_type_id_map.get(tab.object_type_id) if tab.object_type_id else None
                )
                object_view_id = (
                    ctx.view_id_map.get(tab.object_view_id) if tab.object_view_id else None
                )
                target_id = tab.target_id
                if target_id and str(target_id).isdigit():
                    target_id = str(ctx.page_id_map.get(int(target_id), int(target_id)))
                url = rewrite_tenant_urls(
                    tab.url,
                    source_tenant_id=SOURCE,
                    target_tenant_id=TARGET,
                )
                new_tab = DesignerWorkspaceTab(
                    tenant_id=TARGET,
                    workspace_id=tgt_ws_id,
                    title=tab.title,
                    description=tab.description,
                    slug=tab.slug,
                    icon=tab.icon,
                    sort_order=tab.sort_order,
                    is_system=tab.is_system,
                    is_visible=tab.is_visible,
                    slug_is_manual=tab.slug_is_manual,
                    object_type_id=object_type_id,
                    object_view_id=object_view_id,
                    tab_type=tab.tab_type,
                    target_type=tab.target_type,
                    target_id=target_id,
                    url=url,
                    open_in_new_tab=tab.open_in_new_tab,
                )
                db.add(new_tab)
                db.flush()
                created_tabs.append(
                    {
                        "id": new_tab.id,
                        "workspace_slug": slug,
                        "tab_slug": new_tab.slug,
                        "tab_title": new_tab.title,
                        "tab_type": new_tab.tab_type,
                    }
                )

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
                raise RuntimeError(f"Safety count changed for {key}: {before[key]} -> {after_in_tx[key]}")

        db.commit()
    except Exception:
        db.rollback()
        raise

    after = safety_counts(db)
    return {
        "created_workspaces": created_workspaces,
        "updated_workspaces": updated_workspaces,
        "created_tabs": created_tabs,
        "before": before,
        "after": after,
    }


def run_dry_run_per_entity() -> dict:
    subprocess.run(
        [sys.executable, str(BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.py")],
        check=True,
    )
    payload = json.loads(
        (BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.json").read_text(encoding="utf-8")
    )
    return payload.get("summary", {}).get("per_entity", {})


def office_structure_check(db) -> list[dict]:
    from app.modules.navigation.models import NavigationItem

    expected = ["Разработка", "Тех. поддержка", "Управление платформой", "Отдел кадров"]
    items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == TARGET,
            NavigationItem.deleted_at.is_(None),
            NavigationItem.type == "workspace",
            NavigationItem.menu_scope == "runtime",
        )
        .all()
    )
    titles = {item.title for item in items}
    return [{"title": title, "present_in_nav": title in titles} for title in expected]


def main() -> int:
    db = SessionLocal()
    report: dict = {"phase": "apply_phase3", "started_at": datetime.now().isoformat()}
    try:
        check = dry_check(db)
        report["dry_check"] = check
        print_dry_check(check)

        dry_before = run_dry_run_per_entity()
        report["dry_run_before"] = dry_before

        print("\n=== APPLY ===")
        result = apply_phase3(db)
        report["apply_result"] = result
        report["status"] = "success"

        dry_after = run_dry_run_per_entity()
        report["dry_run_after"] = dry_after
        report["office_check"] = office_structure_check(db)

        print("\n=== POST CHECK ===")
        print(f"Workspaces: {result['before']['workspaces_t1_active']} -> {result['after']['workspaces_t1_active']}")
        print(f"Tabs: {result['before']['workspace_tabs_t1_active']} -> {result['after']['workspace_tabs_t1_active']}")

        print("\n=== SAFETY CHECK ===")
        for key in result["before"]:
            if key in ("workspaces_t1_active", "workspace_tabs_t1_active"):
                continue
            print(f"{key}: {result['before'][key]} -> {result['after'][key]}")

        print("\n=== DRY RUN DELTA ===")
        print(
            f"Workspaces create: {dry_before.get('workspaces', {}).get('create')} -> "
            f"{dry_after.get('workspaces', {}).get('create')}"
        )
        print(
            f"Workspace tabs create: {dry_before.get('workspace_tabs', {}).get('create')} -> "
            f"{dry_after.get('workspace_tabs', {}).get('create')}"
        )

        print("\n=== OFFICE STRUCTURE (nav runtime workspace items) ===")
        for row in report["office_check"]:
            print(f"{row['title']}: {'OK' if row['present_in_nav'] else 'MISSING'}")

        out = BACKEND_DIR / "scripts" / "apply_phase3_restore_workspaces_report.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nReport: {out}")
        return 0
    except Exception as exc:
        report["status"] = "failed"
        report["error"] = str(exc)
        out = BACKEND_DIR / "scripts" / "apply_phase3_restore_workspaces_report.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"FAILED: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
