#!/usr/bin/env python3
"""APPLY Phase 4: restore navigation items from tenant 13 -> tenant 1."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from uuid import UUID

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
from app.modules.platform.designer.object_types.models import DesignerObjectType  # noqa: E402
from app.modules.platform.designer.workspaces.models import DesignerWorkspace  # noqa: E402
from app.modules.tenant_bootstrap.clone_tenant_structure import _navigation_clone_order  # noqa: E402
from app.modules.tenant_bootstrap.context import CloneContext  # noqa: E402
from app.modules.tenant_bootstrap.url_rewrite import rewrite_tenant_urls  # noqa: E402
from app.modules.users.models import User  # noqa: F401, E402

SOURCE = 13
TARGET = 1

STUDIO_EXPECTED = [
    "Объекты",
    "Связи",
    "Представления",
    "Пользователи",
    "Системные настройки",
    "Разработка продукта",
    "Проект тест",
]
OFFICE_EXPECTED = [
    "Главная",
    "Разработка",
    "Тех. поддержка",
    "Управление платформой",
    "Отдел кадров",
]


def norm_url(url: str | None) -> str:
    if not url:
        return ""
    value = re.sub(r"/portal/\d+", "/portal/{id}", url)
    value = re.sub(r"/designer/tenant/\d+", "/designer/tenant/{id}", value)
    return value


def parent_key(item: NavigationItem, by_id: dict[int, NavigationItem]) -> tuple | None:
    if not item.parent_id or item.parent_id not in by_id:
        return None
    parent = by_id[item.parent_id]
    return (
        parent.menu_scope,
        parent.title,
        parent.type,
        norm_url(parent.url),
        parent.system_key or "",
    )


def semantic_key(item: NavigationItem, by_id: dict[int, NavigationItem]) -> tuple:
    return (
        item.menu_scope,
        parent_key(item, by_id),
        item.title,
        item.type,
        norm_url(item.url),
        item.system_key or "",
    )


def nav_row(item: NavigationItem, by_id: dict[int, NavigationItem]) -> dict:
    slug = ""
    if item.url:
        slug = item.url.rstrip("/").split("/")[-1]
    return {
        "id": item.id,
        "title": item.title,
        "type": item.type,
        "slug": slug,
        "parent_id": item.parent_id,
        "parent_title": by_id[item.parent_id].title if item.parent_id and item.parent_id in by_id else None,
        "menu_scope": item.menu_scope,
        "system_key": item.system_key,
        "url": item.url,
        "deleted_at": item.deleted_at.isoformat() if item.deleted_at else None,
    }


def load_items(db, tenant_id: int) -> list[NavigationItem]:
    return (
        db.query(NavigationItem)
        .filter(NavigationItem.portal_id == tenant_id)
        .order_by(NavigationItem.id.asc())
        .all()
    )


def safety_counts(db) -> dict[str, int]:
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
        "navigation_active": int(
            db.query(func.count(NavigationItem.id))
            .filter(
                NavigationItem.portal_id == TARGET,
                NavigationItem.deleted_at.is_(None),
            )
            .scalar()
            or 0
        ),
    }


def _page_sig(page: Page) -> str:
    return f"{page.title}|{page.sort_order}|{bool(page.is_home)}"


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

    src_libs = {row.id: row for row in db.query(DocumentLibrary).all()}
    for src_nav in db.query(NavigationItem).filter(
        NavigationItem.portal_id == SOURCE,
        NavigationItem.library_id.isnot(None),
        NavigationItem.deleted_at.is_(None),
    ).all():
        tgt_nav = db.query(NavigationItem).filter(
            NavigationItem.portal_id == TARGET,
            NavigationItem.title == src_nav.title,
            NavigationItem.type == "document_library",
            NavigationItem.deleted_at.is_(None),
        ).first()
        if tgt_nav and tgt_nav.library_id and src_nav.library_id in src_libs:
            ctx.document_library_id_map[src_nav.library_id] = tgt_nav.library_id

    return ctx


def build_plan(db) -> dict:
    src_all = load_items(db, SOURCE)
    tgt_all = load_items(db, TARGET)
    src_by_id = {i.id: i for i in src_all}
    tgt_by_id = {i.id: i for i in tgt_all}

    src_active = [i for i in src_all if i.deleted_at is None]
    tgt_active = [i for i in tgt_all if i.deleted_at is None]
    tgt_deleted = [i for i in tgt_all if i.deleted_at is not None]

    src_keys = {semantic_key(i, src_by_id): i for i in src_active}
    tgt_active_keys = {semantic_key(i, tgt_by_id): i for i in tgt_active}
    tgt_deleted_keys = {semantic_key(i, tgt_by_id): i for i in tgt_deleted}

    plan_items = []
    for key, src_item in src_keys.items():
        if key in tgt_active_keys:
            action = "SKIP"
            existing = tgt_active_keys[key]
        elif key in tgt_deleted_keys:
            action = "RESTORE"
            existing = tgt_deleted_keys[key]
        else:
            action = "CREATE"
            existing = None
        plan_items.append(
            {
                "action": action,
                "source_id": src_item.id,
                "target_id": existing.id if existing else None,
                "semantic_key": key,
                **nav_row(src_item, src_by_id),
            }
        )

    # Items only in T1
    for key, tgt_item in tgt_active_keys.items():
        if key not in src_keys:
            plan_items.append(
                {
                    "action": "SKIP",
                    "reason": "target_only_preserve",
                    "target_id": tgt_item.id,
                    **nav_row(tgt_item, tgt_by_id),
                }
            )

    missing_from_t13 = [p for p in plan_items if p["action"] == "CREATE"]
    create_source_ids = {p["source_id"] for p in missing_from_t13}

    return {
        "source_active": [nav_row(i, src_by_id) for i in src_active],
        "target_active": [nav_row(i, tgt_by_id) for i in tgt_active],
        "plan": plan_items,
        "to_create": [p for p in plan_items if p["action"] == "CREATE"],
        "to_restore": [p for p in plan_items if p["action"] == "RESTORE"],
        "to_skip": [p for p in plan_items if p["action"] == "SKIP"],
        "to_update_url": [],
        "create_source_ids": create_source_ids,
    }


def print_dry_check(plan: dict) -> None:
    print("=== MISSING IN T1 (CREATE) ===")
    for row in plan["to_create"]:
        print(
            f"CREATE | {row['title']} | {row['type']} | {row['menu_scope']} | "
            f"system_key={row['system_key']} | url={row['url']}"
        )
    print(f"create count: {len(plan['to_create'])}")

    print("\n=== RESTORE ===")
    for row in plan["to_restore"]:
        print(f"RESTORE | id={row['target_id']} | {row['title']} | {row['type']}")
    print(f"restore count: {len(plan['to_restore'])}")

    print("\n=== WORKSPACE NAV CHECK ===")
    db = SessionLocal()
    try:
        for slug in ("razrabotka", "teh-podderzhka", "upravlenie-platformoy", "otdel-kadrov-2"):
            ws = (
                db.query(DesignerWorkspace)
                .filter(
                    DesignerWorkspace.tenant_id == TARGET,
                    DesignerWorkspace.slug == slug,
                    DesignerWorkspace.deleted_at.is_(None),
                )
                .first()
            )
            nav = (
                db.query(NavigationItem)
                .filter(
                    NavigationItem.portal_id == TARGET,
                    NavigationItem.deleted_at.is_(None),
                    NavigationItem.type == "workspace",
                    NavigationItem.url.like(f"%/workspaces/{slug}"),
                )
                .first()
            )
            print(
                f"{slug}: workspace_id={ws.id if ws else None} "
                f"nav_id={nav.id if nav else 'MISSING'} url={nav.url if nav else None}"
            )
    finally:
        db.close()


def apply_phase4(db, plan: dict) -> dict:
    guard_script_structure_write(db, TARGET, "apply_phase4_restore_navigation")
    before = safety_counts(db)
    ctx = build_remap_context(db)

    src_all = load_items(db, SOURCE)
    tgt_all = load_items(db, TARGET)
    src_by_id = {i.id: i for i in src_all}
    tgt_by_id = {i.id: i for i in tgt_all}

    src_active = [i for i in src_all if i.deleted_at is None]
    tgt_active = [i for i in tgt_all if i.deleted_at is None]

    for src_item in src_active:
        key = semantic_key(src_item, src_by_id)
        for tgt_item in tgt_active:
            if semantic_key(tgt_item, tgt_by_id) == key:
                ctx.navigation_item_id_map[src_item.id] = tgt_item.id
                break

    restored: list[dict] = []
    for row in plan["to_restore"]:
        item = db.query(NavigationItem).filter(NavigationItem.id == row["target_id"]).one()
        item.deleted_at = None
        item.deleted_by = None
        src_item = src_by_id[row["source_id"]]
        ctx.navigation_item_id_map[src_item.id] = item.id
        restored.append({"id": item.id, "title": item.title, "type": item.type})

    updated: list[dict] = []
    for item in tgt_active:
        if item.url and (f"/portal/{SOURCE}" in item.url or f"/designer/tenant/{SOURCE}" in item.url):
            old = item.url
            item.url = rewrite_tenant_urls(
                item.url,
                source_tenant_id=SOURCE,
                target_tenant_id=TARGET,
            )
            updated.append({"id": item.id, "title": item.title, "old_url": old, "new_url": item.url})

    to_create_rows = [
        src_by_id[row["source_id"]]
        for row in plan["to_create"]
        if row["source_id"] in src_by_id
    ]
    created: list[dict] = []

    try:
        for row in _navigation_clone_order(to_create_rows):
            parent_id = (
                ctx.navigation_item_id_map.get(row.parent_id) if row.parent_id else None
            )
            page_id = ctx.page_id_map.get(row.page_id) if row.page_id else None
            library_id = (
                ctx.document_library_id_map.get(row.library_id) if row.library_id else None
            )
            object_type_id = (
                ctx.object_type_id_map.get(row.object_type_id) if row.object_type_id else None
            )
            url = rewrite_tenant_urls(
                row.url,
                source_tenant_id=SOURCE,
                target_tenant_id=TARGET,
            )
            clone = NavigationItem(
                portal_id=TARGET,
                parent_id=parent_id,
                type=row.type,
                title=row.title,
                page_id=page_id,
                library_id=library_id,
                object_type_id=object_type_id,
                url=url,
                sort_order=row.sort_order,
                is_visible=row.is_visible,
                icon=row.icon,
                icon_type=row.icon_type,
                icon_file_url=row.icon_file_url,
                color=row.color,
                show_icon=row.show_icon,
                is_bold=row.is_bold,
                is_italic=row.is_italic,
                menu_scope=row.menu_scope,
                system_key=row.system_key,
                is_system=row.is_system,
                is_protected=row.is_protected,
            )
            db.add(clone)
            db.flush()
            ctx.navigation_item_id_map[row.id] = clone.id
            created.append(
                {
                    "id": clone.id,
                    "title": clone.title,
                    "type": clone.type,
                    "menu_scope": clone.menu_scope,
                    "url": clone.url,
                    "parent_id": clone.parent_id,
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
                raise RuntimeError(f"Safety count changed for {key}")

        db.commit()
    except Exception:
        db.rollback()
        raise

    after = safety_counts(db)
    return {
        "before": before,
        "after": after,
        "created": created,
        "restored": restored,
        "updated": updated,
        "skipped_count": len(plan["to_skip"]),
    }


def run_dry_run_nav() -> dict:
    subprocess.run(
        [sys.executable, str(BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.py")],
        check=True,
    )
    payload = json.loads(
        (BACKEND_DIR / "scripts" / "dry_run_tenant1_recovery_plan.json").read_text(encoding="utf-8")
    )
    return payload.get("summary", {}).get("per_entity", {})


def structure_check(db) -> dict:
    items = (
        db.query(NavigationItem)
        .filter(
            NavigationItem.portal_id == TARGET,
            NavigationItem.deleted_at.is_(None),
        )
        .all()
    )
    titles = {i.title for i in items}
    studio = {title: title in titles for title in STUDIO_EXPECTED}
    office = {title: title in titles for title in OFFICE_EXPECTED}
    return {"studio": studio, "office": office}


def json_safe(value):
    if isinstance(value, tuple):
        return [json_safe(v) for v in value]
    if isinstance(value, set):
        return sorted(json_safe(v) for v in value)
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    return value


def main() -> int:
    db = SessionLocal()
    report: dict = {"phase": "apply_phase4", "started_at": datetime.now().isoformat()}
    try:
        plan = build_plan(db)
        report["dry_check"] = plan
        print_dry_check(plan)

        dry_before = run_dry_run_nav()
        report["dry_run_before"] = dry_before

        print("\n=== APPLY ===")
        result = apply_phase4(db, plan)
        report["apply_result"] = result
        report["status"] = "success"

        dry_after = run_dry_run_nav()
        report["dry_run_after"] = dry_after
        report["structure_check"] = structure_check(db)

        print("\n=== POST CHECK ===")
        print(
            f"navigation: {result['before']['navigation_active']} -> "
            f"{result['after']['navigation_active']}"
        )
        print(f"created: {len(result['created'])}")
        print(f"restored: {len(result['restored'])}")
        print(f"updated: {len(result['updated'])}")
        print(f"skipped: {result['skipped_count']}")

        print("\n=== SAFETY ===")
        for key in result["before"]:
            if key == "navigation_active":
                continue
            print(f"{key}: {result['before'][key]} -> {result['after'][key]}")

        print("\n=== DRY RUN NAV DELTA ===")
        print(
            f"Navigation create: {dry_before.get('navigation', {}).get('create')} -> "
            f"{dry_after.get('navigation', {}).get('create')}"
        )

        print("\n=== STRUCTURE CHECK ===")
        for scope, rows in report["structure_check"].items():
            print(scope.upper())
            for title, ok in rows.items():
                print(f"  {title}: {'OK' if ok else 'MISSING'}")

        out = BACKEND_DIR / "scripts" / "apply_phase4_restore_navigation_report.json"
        out.write_text(
            json.dumps(json_safe(report), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\nReport: {out}")
        return 0
    except Exception as exc:
        report["status"] = "failed"
        report["error"] = str(exc)
        out = BACKEND_DIR / "scripts" / "apply_phase4_restore_navigation_report.json"
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
