#!/usr/bin/env python3
"""Read-only Step 18.9.2 — TEMPLATE boundary audit."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT.parent / ".env")
parsed = urlparse(os.environ["DATABASE_URL"])
TARGET_DBS = ("yasnopro_dev", "yasnopro_template", "yasnopro_client")

STRUCTURE_QUERIES = {
    "pages": "SELECT COUNT(*) FROM pages WHERE portal_id=:pid AND deleted_at IS NULL",
    "sections": """
        SELECT COUNT(*) FROM sections s
        JOIN pages p ON p.id = s.page_id
        WHERE p.portal_id=:pid AND p.deleted_at IS NULL
    """,
    "blocks": """
        SELECT COUNT(*) FROM blocks b
        JOIN sections s ON s.id = b.section_id
        JOIN pages p ON p.id = s.page_id
        WHERE p.portal_id=:pid AND p.deleted_at IS NULL
    """,
    "navigation_items": "SELECT COUNT(*) FROM navigation_items WHERE portal_id=:pid AND deleted_at IS NULL",
    "designer_object_types": "SELECT COUNT(*) FROM designer_object_types WHERE tenant_id=:pid AND deleted_at IS NULL",
    "designer_field_definitions": "SELECT COUNT(*) FROM designer_field_definitions WHERE tenant_id=:pid AND deleted_at IS NULL",
    "designer_relation_definitions": "SELECT COUNT(*) FROM designer_relation_definitions WHERE tenant_id=:pid AND deleted_at IS NULL",
    "designer_view_definitions": "SELECT COUNT(*) FROM designer_view_definitions WHERE tenant_id=:pid AND deleted_at IS NULL",
    "designer_action_definitions": "SELECT COUNT(*) FROM designer_action_definitions WHERE tenant_id=:pid",
    "designer_action_forms": "SELECT COUNT(*) FROM designer_action_forms WHERE tenant_id=:pid",
    "designer_workspaces": "SELECT COUNT(*) FROM designer_workspaces WHERE tenant_id=:pid AND deleted_at IS NULL",
    "designer_workspace_tabs": "SELECT COUNT(*) FROM designer_workspace_tabs WHERE tenant_id=:pid AND deleted_at IS NULL",
    "designer_system_menu_settings": "SELECT COUNT(*) FROM designer_system_menu_settings WHERE tenant_id=:pid",
    "tenant_runtime_menu_settings": "SELECT COUNT(*) FROM tenant_runtime_menu_settings WHERE tenant_id=:pid",
    "tenant_modules": "SELECT COUNT(*) FROM tenant_modules WHERE tenant_id=:pid",
    "tenant_module_configurations": "SELECT COUNT(*) FROM tenant_module_configurations WHERE tenant_id=:pid",
}

LEVEL2_TABLES = [
    "runtime_entities",
    "runtime_entity_values",
    "runtime_relation_instances",
    "comments",
    "notes",
    "notifications",
    "notification_recipients",
    "document_libraries",
    "library_documents",
    "calendar_events",
    "chat_messages",
    "chats",
    "user_activity_sessions",
    "user_presence_states",
]

PLATFORM_L0_PREFIXES = (
    "platform_",
    "release_",
    "tenant_update_offers",
    "tenant_versions",
    "customer_companies",
    "alembic_version",
    "test_cleanup_",
)


def engine_for(dbname: str):
    return create_engine(urlunparse(parsed._replace(path="/" + dbname)), connect_args={"connect_timeout": 15})


def q1(conn, sql: str, **params):
    return int(conn.execute(text(sql), params).scalar() or 0)


def qall(conn, sql: str, **params):
    return [dict(r) for r in conn.execute(text(sql), params).mappings().all()]


def list_tables(conn) -> list[str]:
    return [
        r[0]
        for r in conn.execute(
            text(
                """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema='public' AND table_type='BASE TABLE'
                ORDER BY table_name
                """
            )
        ).fetchall()
    ]


def classify_table(table: str, records: int, has_tenant_portal: bool) -> str:
    if table in LEVEL2_TABLES or table.startswith("chat_") or table.startswith("comment_") or table.startswith("note_"):
        return "2" if records else "2"
    if any(table.startswith(p) for p in PLATFORM_L0_PREFIXES):
        return "0"
    if table in ("roles", "users", "tenant_user_memberships", "tenant_user_profiles", "portals"):
        return "0" if table != "portals" else "0"
    if table in (
        "pages", "sections", "blocks", "navigation_items",
        "designer_object_types", "designer_field_definitions", "designer_relation_definitions",
        "designer_view_definitions", "designer_action_definitions", "designer_action_placements",
        "designer_action_forms", "designer_action_form_fields",
        "designer_workspaces", "designer_workspace_tabs",
        "designer_system_menu_settings", "tenant_runtime_menu_settings",
        "tenant_modules", "tenant_module_configurations", "tenant_module_config_snapshots",
        "designer_metadata_snapshots",
    ):
        return "1A" if records >= 0 else "1A"
    if table in ("document_libraries",):
        return "1A" if records else "1A"
    if table in ("library_documents",):
        return "2" if records else "2"
    if table in ("designer_publish_records",):
        return "0"
    if table in (
        "tenant_module_configuration_applies", "tenant_module_configuration_diffs",
        "tenant_module_configuration_rollbacks", "tenant_module_update_offers",
        "tenant_module_update_previews",
    ):
        return "0"
    if table in ("tasks", "task_assignees", "task_checklist_items", "task_view_columns", "tables", "table_rows", "table_columns"):
        return "2"
    if table in ("checklist_items", "quality_issues", "quality_issue_status_history"):
        return "2"
    if table in ("user_menu_preferences", "user_workspace_tabs", "runtime_office_user_table_views"):
        return "2"
    return "1B" if has_tenant_portal and records else "0"


def audit_db(dbname: str) -> dict:
    out: dict = {"database": dbname, "status": "ok"}
    try:
        with engine_for(dbname).connect() as conn:
            tables = list_tables(conn)
            out["table_count"] = len(tables)
            out["total_records"] = 0
            catalog = []
            for table in tables:
                cnt = q1(conn, f'SELECT COUNT(*) FROM "{table}"')
                out["total_records"] += max(cnt, 0)
                has_tp = table in {
                    "pages", "navigation_items", "designer_object_types", "designer_field_definitions",
                    "designer_relation_definitions", "designer_view_definitions", "designer_action_definitions",
                    "designer_workspaces", "tenant_modules", "runtime_entities",
                }
                catalog.append({"table": table, "records": cnt, "level": classify_table(table, cnt, has_tp)})
            out["catalog"] = catalog

            portals = qall(
                conn,
                """
                SELECT id, name, tenant_type, environment_role, code, is_protected, template_version
                FROM portals ORDER BY id
                """,
            )
            out["portals"] = portals
            out["portal_count"] = len(portals)

            template_portal_id = None
            for p in portals:
                if str(p.get("tenant_type") or "").upper() == "TEMPLATE":
                    template_portal_id = int(p["id"])
                    break
            if template_portal_id is None and portals:
                template_portal_id = int(portals[0]["id"])

            out["template_portal_id"] = template_portal_id
            out["structure"] = {}
            if template_portal_id is not None and tables:
                pid = template_portal_id
                for key, sql in STRUCTURE_QUERIES.items():
                    try:
                        out["structure"][key] = q1(conn, sql, pid=pid)
                    except Exception as exc:
                        out["structure"][key] = f"error:{exc}"

            out["level2"] = {t: q1(conn, f'SELECT COUNT(*) FROM "{t}"') for t in LEVEL2_TABLES if t in tables}
            out["cleanup"] = {
                "test_cleanup_runs": q1(conn, "SELECT COUNT(*) FROM test_cleanup_runs") if "test_cleanup_runs" in tables else -1,
                "test_cleanup_records": q1(conn, "SELECT COUNT(*) FROM test_cleanup_records") if "test_cleanup_records" in tables else -1,
            }

            if "designer_object_types" in tables and template_portal_id:
                out["object_types"] = qall(
                    conn,
                    """
                    SELECT key, name, is_system, status
                    FROM designer_object_types
                    WHERE tenant_id=:pid AND deleted_at IS NULL
                    ORDER BY key
                    """,
                    pid=template_portal_id,
                )
                out["pages_list"] = qall(
                    conn,
                    """
                    SELECT id, title, status, is_home, is_visible
                    FROM pages WHERE portal_id=:pid AND deleted_at IS NULL
                    ORDER BY sort_order, id
                    """,
                    pid=template_portal_id,
                )
                out["workspaces_list"] = qall(
                    conn,
                    """
                    SELECT id, title, slug, status
                    FROM designer_workspaces
                    WHERE tenant_id=:pid AND deleted_at IS NULL
                    ORDER BY sort_order, id
                    """,
                    pid=template_portal_id,
                )
                out["views_list"] = qall(
                    conn,
                    """
                    SELECT v.key, v.name, v.view_type, v.is_system, o.key AS object_type_key
                    FROM designer_view_definitions v
                    JOIN designer_object_types o ON o.id = v.object_type_id
                    WHERE v.tenant_id=:pid AND v.deleted_at IS NULL AND o.deleted_at IS NULL
                    ORDER BY o.key, v.key
                    """,
                    pid=template_portal_id,
                )
                out["runtime_by_object"] = qall(
                    conn,
                    """
                    SELECT dot.key, dot.name, dot.is_system, COUNT(re.id) AS entities
                    FROM designer_object_types dot
                    LEFT JOIN runtime_entities re ON re.object_type_id = dot.id AND re.deleted_at IS NULL
                    WHERE dot.tenant_id=:pid AND dot.deleted_at IS NULL
                    GROUP BY dot.key, dot.name, dot.is_system
                    ORDER BY entities DESC, dot.key
                    """,
                    pid=template_portal_id,
                )
    except Exception as exc:
        out["status"] = "error"
        out["error"] = f"{type(exc).__name__}: {exc}"
    return out


def compare_structure(dev: dict, tmpl: dict) -> dict:
    dev_s = dev.get("structure") or {}
    tmpl_s = tmpl.get("structure") or {}
    keys = sorted(set(dev_s) | set(tmpl_s))
    rows = []
    for k in keys:
        dv, tv = dev_s.get(k), tmpl_s.get(k)
        if isinstance(dv, int) and isinstance(tv, int):
            diff = dv - tv
            rows.append({"metric": k, "dev": dv, "template": tv, "delta": diff, "parity": dv == tv})
        else:
            rows.append({"metric": k, "dev": dv, "template": tv, "delta": None, "parity": False})
    return rows

def missing_1a(dev: dict, tmpl: dict) -> list[dict]:
    dev_ot = {r["key"]: r for r in dev.get("object_types") or []}
    tmpl_ot = {r["key"]: r for r in tmpl.get("object_types") or []}
    missing = []
    for key, row in sorted(dev_ot.items()):
        if row.get("is_system") and key not in tmpl_ot:
            missing.append({"kind": "object_type", "key": key, "name": row.get("name"), "reason": "system in DEV, absent in TEMPLATE"})
    dev_pages = {(r.get("title") or "").strip().casefold() for r in dev.get("pages_list") or []}
    tmpl_pages = {(r.get("title") or "").strip().casefold() for r in tmpl.get("pages_list") or []}
    for p in dev.get("pages_list") or []:
        title = (p.get("title") or "").strip()
        if title and title.casefold() not in tmpl_pages and p.get("is_home"):
            missing.append({"kind": "page", "key": title, "reason": "home/system page in DEV missing in TEMPLATE"})
    return missing


def contamination(tmpl: dict) -> dict:
    level1b = []
    level2 = []
    pid = tmpl.get("template_portal_id")
    for row in tmpl.get("object_types") or []:
        if not row.get("is_system"):
            level1b.append({"type": "object_type", "key": row["key"], "name": row["name"]})
    for row in tmpl.get("pages_list") or []:
        title = (row.get("title") or "").strip()
        if title and not row.get("is_home"):
            level1b.append({"type": "page", "title": title, "id": row.get("id")})
    for row in tmpl.get("workspaces_list") or []:
        level1b.append({"type": "workspace", "slug": row.get("slug"), "title": row.get("title")})
    for row in tmpl.get("runtime_by_object") or []:
        if int(row.get("entities") or 0) > 0:
            level2.append({"type": "runtime_entities", "object_type_key": row["key"], "count": row["entities"], "is_system": row.get("is_system")})
    for table, cnt in (tmpl.get("level2") or {}).items():
        if int(cnt or 0) > 0 and table != "runtime_entities":
            level2.append({"type": "table", "table": table, "count": cnt})
    return {"level_1b": level1b, "level_2": level2}


def main() -> None:
    result = {}
    for db in TARGET_DBS:
        result[db] = audit_db(db)
    dev_pid = result["yasnopro_dev"].get("template_portal_id") or 1
    tmpl_pid = result["yasnopro_template"].get("template_portal_id")
    if result["yasnopro_dev"].get("portals"):
        for p in result["yasnopro_dev"]["portals"]:
            if str(p.get("tenant_type")).upper() == "DEV":
                dev_pid = int(p["id"])
    result["yasnopro_dev"]["template_portal_id"] = dev_pid
    if dev_pid and result["yasnopro_dev"].get("structure") is not None:
        with engine_for("yasnopro_dev").connect() as conn:
            result["yasnopro_dev"]["structure"] = {
                k: q1(conn, sql, pid=dev_pid) for k, sql in STRUCTURE_QUERIES.items()
            }
            result["yasnopro_dev"]["object_types"] = qall(
                conn,
                "SELECT key, name, is_system, status FROM designer_object_types WHERE tenant_id=:pid AND deleted_at IS NULL ORDER BY key",
                pid=dev_pid,
            )
            result["yasnopro_dev"]["pages_list"] = qall(
                conn,
                "SELECT id, title, status, is_home, is_visible FROM pages WHERE portal_id=:pid AND deleted_at IS NULL ORDER BY sort_order, id",
                pid=dev_pid,
            )
            result["yasnopro_dev"]["workspaces_list"] = qall(
                conn,
                "SELECT id, title, slug, status FROM designer_workspaces WHERE tenant_id=:pid AND deleted_at IS NULL ORDER BY sort_order, id",
                pid=dev_pid,
            )
            result["yasnopro_dev"]["views_list"] = qall(
                conn,
                """
                SELECT v.key, v.name, v.view_type, v.is_system, o.key AS object_type_key
                FROM designer_view_definitions v
                JOIN designer_object_types o ON o.id = v.object_type_id
                WHERE v.tenant_id=:pid AND v.deleted_at IS NULL AND o.deleted_at IS NULL
                ORDER BY o.key, v.key
                """,
                pid=dev_pid,
            )
            result["yasnopro_dev"]["runtime_by_object"] = qall(
                conn,
                """
                SELECT dot.key, dot.name, dot.is_system, COUNT(re.id) AS entities
                FROM designer_object_types dot
                LEFT JOIN runtime_entities re ON re.object_type_id = dot.id AND re.deleted_at IS NULL
                WHERE dot.tenant_id=:pid AND dot.deleted_at IS NULL
                GROUP BY dot.key, dot.name, dot.is_system
                ORDER BY entities DESC, dot.key
                """,
                pid=dev_pid,
            )
    result["functional_parity"] = compare_structure(result["yasnopro_dev"], result["yasnopro_template"])
    result["missing_template_assets"] = missing_1a(result["yasnopro_dev"], result["yasnopro_template"])
    result["contamination"] = contamination(result["yasnopro_template"])
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
