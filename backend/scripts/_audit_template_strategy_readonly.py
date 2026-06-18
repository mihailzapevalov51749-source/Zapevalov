#!/usr/bin/env python3
"""Read-only audit: table catalog for DEV/TEMPLATE strategy (Step 18.9.1)."""
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

BASE_URL = os.getenv("DATABASE_URL")
if not BASE_URL:
    print("DATABASE_URL missing", file=sys.stderr)
    sys.exit(1)

parsed = urlparse(BASE_URL)
TARGET_DBS = ["yasnopro_dev", "yasnopro_template", "yasnopro_client"]

# Tables with portal_id or tenant_id for tenant scoping hints
TENANT_PORTAL_COLUMNS = {
    "portals": "id",
    "pages": "portal_id",
    "sections": None,  # via pages
    "blocks": None,
    "navigation_items": "portal_id",
    "document_libraries": None,
    "library_documents": None,
    "designer_object_types": "tenant_id",
    "designer_field_definitions": "tenant_id",
    "designer_relation_definitions": "tenant_id",
    "designer_view_definitions": "tenant_id",
    "designer_action_definitions": "tenant_id",
    "designer_action_placements": "tenant_id",
    "designer_action_forms": "tenant_id",
    "designer_action_form_fields": "tenant_id",
    "designer_workspaces": "tenant_id",
    "designer_workspace_tabs": "tenant_id",
    "designer_system_menu_settings": "tenant_id",
    "tenant_runtime_menu_settings": "tenant_id",
    "runtime_entities": "tenant_id",
    "runtime_entity_values": None,
    "runtime_relation_instances": "tenant_id",
    "tenant_modules": "tenant_id",
    "tenant_module_configurations": "tenant_id",
    "tenant_module_configuration_diffs": "tenant_id",
    "tenant_module_configuration_applies": "tenant_id",
    "tenant_module_configuration_rollbacks": "tenant_id",
    "tenant_module_update_offers": "tenant_id",
    "tenant_module_update_previews": "tenant_id",
    "tenant_user_memberships": "tenant_id",
    "tenant_user_profiles": "tenant_id",
    "comments": "tenant_id",
    "notifications": "tenant_id",
    "notification_recipients": None,
    "notes": "tenant_id",
    "checklists": "tenant_id",
    "chats": "tenant_id",
    "chat_messages": None,
    "calendar_events": "tenant_id",
    "user_activity_sessions": "tenant_id",
    "user_presence_states": "tenant_id",
    "platform_event_journal_entries": "tenant_id",
    "quality_issues": "tenant_id",
}


def engine_for(dbname: str):
    url = urlunparse(parsed._replace(path="/" + dbname))
    return create_engine(url, connect_args={"connect_timeout": 10})


def list_tables(conn) -> list[str]:
    rows = conn.execute(
        text(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """
        )
    ).fetchall()
    return [r[0] for r in rows]


def count_table(conn, table: str) -> int:
    try:
        return int(conn.execute(text(f'SELECT COUNT(*) FROM "{table}"')).scalar() or 0)
    except Exception:
        return -1


def portal_summary(conn) -> list[dict]:
    try:
        rows = conn.execute(
            text(
                """
                SELECT id, tenant_type, environment_role, name, code, is_protected
                FROM portals
                ORDER BY id
                """
            )
        ).mappings().all()
        return [dict(r) for r in rows]
    except Exception as exc:
        return [{"error": str(exc)}]


def cleanup_audit(conn) -> dict:
    out = {}
    for t in ("test_cleanup_runs", "test_cleanup_records"):
        try:
            out[t] = count_table(conn, t)
        except Exception:
            out[t] = "missing"
    return out


def main() -> None:
    result: dict = {"databases": {}}
    for dbname in TARGET_DBS:
        db_entry: dict = {"status": "ok", "tables": [], "portals": [], "cleanup": {}}
        try:
            eng = engine_for(dbname)
            with eng.connect() as conn:
                db_entry["portals"] = portal_summary(conn)
                db_entry["cleanup"] = cleanup_audit(conn)
                for table in list_tables(conn):
                    db_entry["tables"].append({"table": table, "records": count_table(conn, table)})
        except Exception as exc:
            db_entry["status"] = "error"
            db_entry["error"] = f"{type(exc).__name__}: {exc}"
        result["databases"][dbname] = db_entry

    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
