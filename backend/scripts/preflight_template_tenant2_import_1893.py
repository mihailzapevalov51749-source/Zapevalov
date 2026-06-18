#!/usr/bin/env python3
"""Step 18.9.3 read-only preflight: tenant_id=2 -> yasnopro_template selective import."""
from __future__ import annotations

import json
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT.parent / ".env")
parsed = urlparse(os.environ["DATABASE_URL"])

SOURCE_DB = "portal_constructor_v2"
TARGET_DB = "yasnopro_template"
SOURCE_TENANT_ID = 2
OTHER_TENANT_IDS = (1, 21)

# Phases aligned with DEV selective import (18.8) — tenant-scoped tables only.
IMPORT_PHASES: list[tuple[str, list[str]]] = [
    ("phase_0_foundation", ["portals", "roles", "users"]),
    ("phase_1_membership", ["tenant_user_memberships", "tenant_user_profiles", "platform_users"]),
    ("phase_2_designer_metadata", [
        "designer_object_types", "designer_field_definitions", "designer_relation_definitions",
        "designer_view_definitions", "designer_action_definitions", "designer_action_placements",
        "designer_action_forms", "designer_action_form_fields",
        "designer_workspaces", "designer_workspace_tabs",
        "designer_system_menu_settings", "tenant_runtime_menu_settings",
        "designer_metadata_snapshots", "designer_publish_records",
    ]),
    ("phase_3_pages_structure", ["pages", "sections", "blocks", "navigation_items"]),
    ("phase_4_modules", [
        "tenant_modules", "tenant_module_configurations", "tenant_module_config_snapshots",
    ]),
    ("phase_5_documents", ["document_libraries", "library_documents"]),
    ("phase_6_runtime", [
        "runtime_entities", "runtime_entity_values", "runtime_relation_instances",
        "runtime_office_user_table_views",
    ]),
    ("phase_7_operational", [
        "comments", "comment_attachments", "comment_mentions", "comment_reactions",
        "notes", "note_mentions", "notifications", "notification_recipients",
        "checklist_items", "chats", "chat_participants", "chat_messages",
        "chat_message_attachments", "chat_message_reactions", "chat_message_mentions",
        "calendar_events", "calendar_event_participants",
        "user_activity_sessions", "user_presence_states",
        "user_menu_preferences", "user_workspace_tabs",
        "quality_issues", "quality_issue_status_history",
    ]),
    ("phase_8_journal", ["platform_event_journal_entries"]),
]

SELF_FK_TABLES = {
    "navigation_items": ("id", "parent_id", "portal_id"),
    "library_documents": ("id", "parent_id", None),
    "comments": ("id", "parent_comment_id", None),
}

TENANT_COLUMN_HINTS = {
    "portals": "id",
    "pages": "portal_id",
    "navigation_items": "portal_id",
    "sections": None,
    "blocks": None,
    "tenant_user_memberships": "tenant_id",
    "tenant_user_profiles": "tenant_id",
    "tenant_modules": "tenant_id",
    "tenant_module_configurations": "tenant_id",
    "tenant_module_config_snapshots": "tenant_id",
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
    "designer_metadata_snapshots": "tenant_id",
    "designer_publish_records": "tenant_id",
    "runtime_entities": "tenant_id",
    "runtime_relation_instances": "tenant_id",
    "platform_event_journal_entries": "tenant_id",
    "user_activity_sessions": "tenant_id",
    "user_presence_states": "tenant_id",
    "calendar_events": "tenant_id",
    "chats": "tenant_id",
    "quality_issues": "tenant_id",
}

USER_FK_CHECKS = [
    ("user_activity_sessions", "user_id"),
    ("user_presence_states", "user_id"),
    ("comments", "author_id"),
    ("notifications", "actor_user_id"),
    ("tenant_user_memberships", "user_id"),
    ("tenant_user_profiles", "user_id"),
]


def engine(db: str):
    return create_engine(
        urlunparse(parsed._replace(path="/" + db)),
        isolation_level="AUTOCOMMIT",
    )


def q1(conn, sql: str, **params) -> int:
    return int(conn.execute(text(sql), params).scalar() or 0)


def qall(conn, sql: str, **params) -> list[dict]:
    return [dict(r) for r in conn.execute(text(sql), params).mappings().all()]


def table_columns(conn, table: str) -> set[str]:
    rows = conn.execute(
        text(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_schema='public' AND table_name=:t
            """
        ),
        {"t": table},
    ).fetchall()
    return {r[0] for r in rows}


def count_planned(conn, table: str, tid: int) -> int | None:
    cols = table_columns(conn, table)
    if table == "portals":
        return q1(conn, "SELECT COUNT(*) FROM portals WHERE id=:tid", tid=tid)
    if table == "roles":
        # roles imported if referenced by tenant users
        return q1(
            conn,
            """
            SELECT COUNT(DISTINCT u.role_id) FROM users u
            JOIN tenant_user_memberships m ON m.user_id=u.id
            WHERE m.tenant_id=:tid AND u.role_id IS NOT NULL
            """,
            tid=tid,
        )
    if table == "users":
        return q1(
            conn,
            """
            SELECT COUNT(DISTINCT u.id) FROM users u
            JOIN tenant_user_memberships m ON m.user_id=u.id
            WHERE m.tenant_id=:tid
            """,
            tid=tid,
        )
    if table == "platform_users":
        return q1(
            conn,
            """
            SELECT COUNT(*) FROM platform_users pu
            JOIN tenant_user_memberships m ON m.user_id=pu.user_id
            WHERE m.tenant_id=:tid
            """,
            tid=tid,
        ) if "platform_users" in {t[0] for t in conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()} else 0
    if table == "sections":
        return q1(
            conn,
            """
            SELECT COUNT(*) FROM sections s
            JOIN pages p ON p.id=s.page_id
            WHERE p.portal_id=:tid
            """,
            tid=tid,
        )
    if table == "blocks":
        return q1(
            conn,
            """
            SELECT COUNT(*) FROM blocks b
            JOIN sections s ON s.id=b.section_id
            JOIN pages p ON p.id=s.page_id
            WHERE p.portal_id=:tid
            """,
            tid=tid,
        )
    if table == "runtime_entity_values":
        return q1(
            conn,
            """
            SELECT COUNT(*) FROM runtime_entity_values rev
            JOIN runtime_entities re ON re.id=rev.entity_id
            WHERE re.tenant_id=:tid
            """,
            tid=tid,
        )
    if table == "library_documents":
        lib_ids = qall(
            conn,
            """
            SELECT DISTINCT library_id FROM navigation_items
            WHERE portal_id=:tid AND library_id IS NOT NULL AND deleted_at IS NULL
            """,
            tid=tid,
        )
        if not lib_ids:
            return q1(
                conn,
                "SELECT COUNT(*) FROM library_documents",
            )  # fallback all if nav-linked unknown — refine below
        ids = [r["library_id"] for r in lib_ids if r.get("library_id")]
        if not ids:
            return 0
        return q1(
            conn,
            "SELECT COUNT(*) FROM library_documents WHERE library_id = ANY(:ids)",
            ids=ids,
        )
    if table == "document_libraries":
        lib_ids = qall(
            conn,
            "SELECT DISTINCT library_id FROM navigation_items WHERE portal_id=:tid AND library_id IS NOT NULL",
            tid=tid,
        )
        ids = [r["library_id"] for r in lib_ids if r.get("library_id")]
        if ids:
            return q1(conn, "SELECT COUNT(*) FROM document_libraries WHERE id = ANY(:ids)", ids=ids)
        return q1(conn, "SELECT COUNT(*) FROM document_libraries")
    if table in ("comment_attachments", "comment_mentions", "comment_reactions"):
        base = "comments"
        return q1(conn, f"SELECT COUNT(*) FROM {table} ca JOIN {base} c ON c.id=ca.comment_id")  # tenant filter weak
    hint = TENANT_COLUMN_HINTS.get(table)
    if hint and hint in cols:
        return q1(conn, f'SELECT COUNT(*) FROM "{table}" WHERE {hint}=:tid', tid=tid)
    if "portal_id" in cols:
        return q1(conn, f'SELECT COUNT(*) FROM "{table}" WHERE portal_id=:tid', tid=tid)
    if "tenant_id" in cols:
        return q1(conn, f'SELECT COUNT(*) FROM "{table}" WHERE tenant_id=:tid', tid=tid)
    return None


def template_user_ids(conn, tid: int) -> list[int]:
    return [
        r["user_id"]
        for r in qall(
            conn,
            "SELECT DISTINCT user_id FROM tenant_user_memberships WHERE tenant_id=:tid",
            tid=tid,
        )
    ]


def audit_self_fk(conn, table: str, tid: int) -> dict:
    if table == "navigation_items":
        rows = qall(
            conn,
            """
            SELECT id, parent_id FROM navigation_items
            WHERE portal_id=:tid AND deleted_at IS NULL
            """,
            tid=tid,
        )
        ids = {r["id"] for r in rows}
        orphans = [r for r in rows if r["parent_id"] and r["parent_id"] not in ids]
        depth = _tree_depth({r["id"]: r["parent_id"] for r in rows})
        return {"rows": len(rows), "orphans": len(orphans), "max_depth": depth, "cycles": _cycle_count({r["id"]: r["parent_id"] for r in rows})}
    if table == "library_documents":
        lib_ids = [
            r["library_id"]
            for r in qall(
                conn,
                "SELECT DISTINCT library_id FROM navigation_items WHERE portal_id=:tid AND library_id IS NOT NULL",
                tid=tid,
            )
        ]
        if not lib_ids:
            return {"rows": 0, "orphans": 0, "max_depth": 0, "cycles": 0}
        rows = qall(
            conn,
            "SELECT id, parent_id FROM library_documents WHERE library_id = ANY(:ids)",
            ids=lib_ids,
        )
        ids = {r["id"] for r in rows}
        orphans = [r for r in rows if r["parent_id"] and r["parent_id"] not in ids]
        return {"rows": len(rows), "orphans": len(orphans), "max_depth": _tree_depth({r["id"]: r["parent_id"] for r in rows}), "cycles": _cycle_count({r["id"]: r["parent_id"] for r in rows})}
    if table == "comments":
        rows = qall(conn, "SELECT id, parent_comment_id FROM comments")
        ids = {r["id"] for r in rows}
        orphans = [r for r in rows if r["parent_comment_id"] and r["parent_comment_id"] not in ids]
        return {"rows": len(rows), "orphans": len(orphans), "max_depth": _tree_depth({r["id"]: r["parent_comment_id"] for r in rows}), "cycles": _cycle_count({r["id"]: r["parent_comment_id"] for r in rows})}
    return {}


def _tree_depth(parent_map: dict[int, int | None]) -> int:
    depth_cache: dict[int, int] = {}

    def depth(node: int, seen: set[int]) -> int:
        if node in depth_cache:
            return depth_cache[node]
        if node in seen:
            return 0
        seen.add(node)
        p = parent_map.get(node)
        if not p:
            depth_cache[node] = 1
            return 1
        d = 1 + depth(p, seen)
        depth_cache[node] = d
        return d

    if not parent_map:
        return 0
    return max(depth(n, set()) for n in parent_map)


def _cycle_count(parent_map: dict[int, int | None]) -> int:
    cycles = 0
    for node in parent_map:
        seen = set()
        cur = node
        while cur and cur in parent_map:
            if cur in seen:
                cycles += 1
                break
            seen.add(cur)
            cur = parent_map.get(cur)
    return cycles


def audit_json_columns(conn, tid: int) -> dict:
    rows = qall(
        conn,
        """
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema='public'
          AND (data_type IN ('json', 'jsonb') OR udt_name IN ('json', 'jsonb'))
        ORDER BY table_name, column_name
        """,
    )
    failures = []
    checked = 0
    planned_tables = {t for _, ts in IMPORT_PHASES for t in ts}
    for row in rows:
        table, col = row["table_name"], row["column_name"]
        if table not in planned_tables:
            continue
        cols = table_columns(conn, table)
        where = ""
        params: dict[str, Any] = {}
        if table == "portals":
            where = "WHERE id=:tid"
            params["tid"] = tid
        elif "tenant_id" in cols:
            where = "WHERE tenant_id=:tid"
            params["tid"] = tid
        elif table in ("sections", "blocks"):
            continue
        try:
            cnt = q1(conn, f'SELECT COUNT(*) FROM "{table}" {where}', **params)
            checked += cnt
            connector = "AND" if where else "WHERE"
            bad = q1(
                conn,
                f"""
                SELECT COUNT(*) FROM "{table}" {where}
                {connector} "{col}" IS NOT NULL AND "{col}"::text = ''
                """,
                **params,
            )
            if bad:
                failures.append({"table": table, "column": col, "bad": bad})
        except Exception as exc:
            failures.append({"table": table, "column": col, "error": str(exc)[:120]})
    return {"columns": len(rows), "records_checked": checked, "failures": failures, "failure_count": len(failures)}


def audit_leakage(conn, tid: int) -> dict:
    leaks: dict[str, int] = {}
    checks = [
        ("pages_t1_in_t2_scope", "SELECT COUNT(*) FROM pages WHERE portal_id=1", {}),
        ("pages_t21_in_t2_scope", "SELECT COUNT(*) FROM pages WHERE portal_id=21", {}),
        ("runtime_entities_t1", "SELECT COUNT(*) FROM runtime_entities WHERE tenant_id=1", {}),
        ("runtime_entities_t21", "SELECT COUNT(*) FROM runtime_entities WHERE tenant_id=21", {}),
        ("runtime_entities_t2", "SELECT COUNT(*) FROM runtime_entities WHERE tenant_id=2", {}),
        ("designer_object_types_t1", "SELECT COUNT(*) FROM designer_object_types WHERE tenant_id=1", {}),
        ("designer_object_types_t2", "SELECT COUNT(*) FROM designer_object_types WHERE tenant_id=2", {}),
        ("memberships_t1", "SELECT COUNT(*) FROM tenant_user_memberships WHERE tenant_id=1", {}),
        ("memberships_t2", "SELECT COUNT(*) FROM tenant_user_memberships WHERE tenant_id=2", {}),
    ]
    for key, sql, params in checks:
        try:
            leaks[key] = q1(conn, sql, **params)
        except Exception as exc:
            leaks[key] = -1
            leaks[f"{key}_error"] = str(exc)[:120]
  # expected leak if importing only t2: t1/t21 rows exist in source but should NOT be in target
    leaks["expected_source_only_t1_pages"] = leaks.get("pages_t1_in_t2_scope", 0)
    leaks["expected_source_only_t21_pages"] = leaks.get("pages_t21_in_t2_scope", 0)
    leaks["expected_import_t2_pages"] = q1(conn, "SELECT COUNT(*) FROM pages WHERE portal_id=2 AND deleted_at IS NULL")
    leaks["leak_risk_if_unfiltered"] = leaks["expected_source_only_t1_pages"] + leaks["expected_source_only_t21_pages"]
    return leaks


def audit_sequence_sync(conn, tables: list[str]) -> dict:
    issues = []
    for table in tables:
        try:
            cols = table_columns(conn, table)
            if "id" not in cols:
                continue
            max_id = conn.execute(text(f'SELECT MAX(id) FROM "{table}"')).scalar()
            seq = conn.execute(text("SELECT pg_get_serial_sequence(:t, 'id')"), {"t": table}).scalar()
            if not seq or max_id is None:
                continue
            last = conn.execute(text(f"SELECT last_value FROM {seq}")).scalar()
            if int(last) < int(max_id):
                issues.append({"table": table, "max_id": int(max_id), "seq_last": int(last)})
        except Exception:
            pass
    return {"issues": issues, "issue_count": len(issues)}


def audit_phase_order(conn, tid: int) -> dict:
    issues = []
    # navigation parent must exist before child (by id order import risk)
    nav_orphans = q1(
        conn,
        """
        SELECT COUNT(*) FROM navigation_items n
        WHERE n.portal_id=:tid AND n.deleted_at IS NULL
          AND n.parent_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM navigation_items p
            WHERE p.id=n.parent_id AND p.portal_id=:tid
          )
        """,
        tid=tid,
    )
    if nav_orphans:
        issues.append({"check": "navigation_parent_exists", "count": nav_orphans})
    # object types before fields
    field_orphans = q1(
        conn,
        """
        SELECT COUNT(*) FROM designer_field_definitions f
        WHERE f.tenant_id=:tid AND f.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM designer_object_types o
            WHERE o.id=f.object_type_id AND o.tenant_id=:tid
          )
        """,
        tid=tid,
    )
    if field_orphans:
        issues.append({"check": "field_object_type_fk", "count": field_orphans})
  # runtime values before entities
    value_orphans = q1(
        conn,
        """
        SELECT COUNT(*) FROM runtime_entity_values rev
        JOIN runtime_entities re ON re.id=rev.entity_id
        WHERE re.tenant_id=:tid
          AND NOT EXISTS (SELECT 1 FROM runtime_entities e WHERE e.id=rev.entity_id)
        """,
        tid=tid,
    )
    if value_orphans:
        issues.append({"check": "runtime_value_entity_fk", "count": value_orphans})
    rev_orphans = q1(
        conn,
        """
        SELECT COUNT(*) FROM runtime_entity_values rev
        WHERE NOT EXISTS (SELECT 1 FROM runtime_entities re WHERE re.id=rev.entity_id)
        """,
    )
    if rev_orphans:
        issues.append({"check": "runtime_values_global_orphans", "count": rev_orphans})
    return {"issues": issues, "issue_count": len(issues)}


def audit_user_fk_scope(conn, tid: int, user_ids: list[int]) -> dict:
    if not user_ids:
        return {"template_user_ids": [], "violations": [], "violation_count": 0}
    violations = []
    uid_set = set(user_ids)
    for table, col in USER_FK_CHECKS:
        cols = table_columns(conn, table)
        if col not in cols:
            continue
        rows = qall(conn, f'SELECT DISTINCT "{col}" AS uid FROM "{table}" WHERE "{col}" IS NOT NULL')
        for r in rows:
            uid = r["uid"]
            if uid not in uid_set:
                # only flag if row is tenant-scoped to tid
                if table in ("tenant_user_memberships", "tenant_user_profiles"):
                    continue
                cnt = 0
                if table == "comments":
                    cnt = q1(conn, "SELECT COUNT(*) FROM comments WHERE author_id=:u", u=uid)
                elif table == "user_activity_sessions" and "tenant_id" in cols:
                    cnt = q1(conn, f"SELECT COUNT(*) FROM {table} WHERE {col}=:u AND tenant_id=:tid", u=uid, tid=tid)
                elif table == "notifications" and "tenant_id" in cols:
                    cnt = q1(conn, f"SELECT COUNT(*) FROM {table} WHERE {col}=:u AND tenant_id=:tid", u=uid, tid=tid)
                else:
                    cnt = q1(conn, f'SELECT COUNT(*) FROM "{table}" WHERE "{col}"=:u', u=uid)
                if cnt:
                    violations.append({"table": table, "column": col, "foreign_user_id": uid, "rows": cnt})
    return {"template_user_ids": user_ids, "violations": violations, "violation_count": len(violations)}


def target_readiness(conn) -> dict:
    tables = q1(
        conn,
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
    )
    out = {"table_count": tables, "alembic_version": None, "portals": 0, "users": 0}
    if tables:
        try:
            out["alembic_version"] = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        except Exception:
            out["alembic_version"] = "missing"
        out["portals"] = q1(conn, "SELECT COUNT(*) FROM portals")
        out["users"] = q1(conn, "SELECT COUNT(*) FROM users")
    return out


def main() -> None:
    out: dict[str, Any] = {
        "source_db": SOURCE_DB,
        "target_db": TARGET_DB,
        "source_tenant_id": SOURCE_TENANT_ID,
        "dry_run": True,
        "records_inserted": 0,
        "records_failed": 0,
    }
    preflight: list[dict] = []
    total_planned = 0
    with engine(SOURCE_DB).connect() as conn:
        portal = qall(
            conn,
            "SELECT id,name,tenant_type,environment_role,is_protected,template_version FROM portals WHERE id=:tid",
            tid=SOURCE_TENANT_ID,
        )
        out["template_tenant_summary"] = portal[0] if portal else None
        user_ids = template_user_ids(conn, SOURCE_TENANT_ID)
        out["TEMPLATE_USER_IDS"] = user_ids
        out["template_users"] = qall(
            conn,
            """
            SELECT u.id,u.email,u.full_name,u.is_active,m.role_key
            FROM users u
            JOIN tenant_user_memberships m ON m.user_id=u.id
            WHERE m.tenant_id=:tid
            ORDER BY u.id
            """,
            tid=SOURCE_TENANT_ID,
        )
        for phase, tables in IMPORT_PHASES:
            for table in tables:
                planned = count_planned(conn, table, SOURCE_TENANT_ID)
                if planned is None:
                    planned = 0
                preflight.append({"phase": phase, "table": table, "records_planned": planned})
                total_planned += planned
        out["preflight"] = preflight
        out["records_planned_total"] = total_planned
        out["tenant_scope"] = {
            "users": len(user_ids),
            "memberships": q1(conn, "SELECT COUNT(*) FROM tenant_user_memberships WHERE tenant_id=:tid", tid=SOURCE_TENANT_ID),
            "profiles": q1(conn, "SELECT COUNT(*) FROM tenant_user_profiles WHERE tenant_id=:tid", tid=SOURCE_TENANT_ID),
            "pages": q1(conn, "SELECT COUNT(*) FROM pages WHERE portal_id=:tid AND deleted_at IS NULL", tid=SOURCE_TENANT_ID),
            "navigation": q1(conn, "SELECT COUNT(*) FROM navigation_items WHERE portal_id=:tid AND deleted_at IS NULL", tid=SOURCE_TENANT_ID),
            "object_types": q1(conn, "SELECT COUNT(*) FROM designer_object_types WHERE tenant_id=:tid AND deleted_at IS NULL", tid=SOURCE_TENANT_ID),
            "fields": q1(conn, "SELECT COUNT(*) FROM designer_field_definitions WHERE tenant_id=:tid AND deleted_at IS NULL", tid=SOURCE_TENANT_ID),
            "views": q1(conn, "SELECT COUNT(*) FROM designer_view_definitions WHERE tenant_id=:tid AND deleted_at IS NULL", tid=SOURCE_TENANT_ID),
            "workspaces": q1(conn, "SELECT COUNT(*) FROM designer_workspaces WHERE tenant_id=:tid AND deleted_at IS NULL", tid=SOURCE_TENANT_ID),
            "runtime_entities": q1(conn, "SELECT COUNT(*) FROM runtime_entities WHERE tenant_id=:tid AND deleted_at IS NULL", tid=SOURCE_TENANT_ID),
            "document_libraries": count_planned(conn, "document_libraries", SOURCE_TENANT_ID),
            "library_documents": count_planned(conn, "library_documents", SOURCE_TENANT_ID),
            "journal_entries": q1(conn, "SELECT COUNT(*) FROM platform_event_journal_entries WHERE tenant_id=:tid", tid=SOURCE_TENANT_ID),
            "modules": q1(conn, "SELECT COUNT(*) FROM tenant_modules WHERE tenant_id=:tid", tid=SOURCE_TENANT_ID),
        }
        out["json_audit"] = audit_json_columns(conn, SOURCE_TENANT_ID)
        out["phase_order_audit"] = audit_phase_order(conn, SOURCE_TENANT_ID)
        out["self_fk_audit"] = {
            t: audit_self_fk(conn, t, SOURCE_TENANT_ID) for t in SELF_FK_TABLES
        }
        out["leakage_audit"] = audit_leakage(conn, SOURCE_TENANT_ID)
        planned_tables = [p["table"] for p in preflight if p["records_planned"]]
        out["sequence_sync_audit"] = audit_sequence_sync(conn, planned_tables)
        out["user_fk_audit"] = audit_user_fk_scope(conn, SOURCE_TENANT_ID, user_ids)
        out["cleanup_source"] = {
            "test_cleanup_runs": q1(conn, "SELECT COUNT(*) FROM test_cleanup_runs"),
            "test_cleanup_records": q1(conn, "SELECT COUNT(*) FROM test_cleanup_records"),
        }
    with engine(TARGET_DB).connect() as conn:
        out["target_readiness"] = target_readiness(conn)
    blockers = []
    if out["target_readiness"]["table_count"] == 0:
        blockers.append("target_schema_missing")
    if out["phase_order_audit"]["issue_count"]:
        blockers.append("phase_order_issues")
    for t, r in out["self_fk_audit"].items():
        if r.get("orphans"):
            blockers.append(f"self_fk_orphans_{t}")
    if out["user_fk_audit"]["violation_count"]:
        blockers.append("user_fk_scope_violations")
    if out["json_audit"]["failure_count"]:
        blockers.append("json_serialization_failures")
    if out["sequence_sync_audit"]["issue_count"]:
        blockers.append("sequence_sync_issues")
    out["blockers"] = blockers
    out["final_status"] = (
        "READY FOR STEP 18.9.4 TEMPLATE EXECUTE"
        if not blockers
        else "BLOCKED — ROOT CAUSE IDENTIFIED"
    )
    out_path = Path(__file__).resolve().parent / "preflight_template_tenant2_import_1893_out.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
