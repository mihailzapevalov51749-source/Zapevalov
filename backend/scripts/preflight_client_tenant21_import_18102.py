#!/usr/bin/env python3
"""Step 18.10.2 read-only preflight: tenant_id=21 -> yasnopro_client selective import plan."""
from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT.parent / ".env")
parsed = urlparse(os.environ["DATABASE_URL"])

SOURCE_DB = "portal_constructor_v2"
TARGET_DB = "yasnopro_client"
CLIENT_TENANT_ID = 21
CLIENT_PORTAL_ID = 21
EXCLUDED_TENANT_IDS = (1, 2)
SYSTEM_RUNTIME_ENTITY_ID = "260ed1f0-dc7b-4458-9e54-2f47378d30df"
REQUIRED_PLATFORM_MODULE_KEYS = (
    "runtime.chat",
    "runtime.notifications",
    "runtime.calendar",
)
EXPECTED_ALEMBIC = "20260616_0076"
EXPECTED_TARGET_TABLES = 94
CLIENT_USER_IDS = (1237, 1840)

OUT_JSON = Path(__file__).with_name("preflight_client_tenant21_import_18102_out.json")


@dataclass
class TablePlanRow:
    phase: int
    phase_name: str
    table: str
    filter_note: str
    records_planned: int


def engine(db: str):
    return create_engine(
        urlunparse(parsed._replace(path="/" + db)),
        isolation_level="AUTOCOMMIT",
    )


def q1(conn, sql: str, **params) -> int:
    return int(conn.execute(text(sql), params).scalar() or 0)


def build_table_plans(conn) -> list[TablePlanRow]:
    p = {
        "tenant_id": CLIENT_TENANT_ID,
        "portal_id": CLIENT_PORTAL_ID,
        "runtime_entity_id": SYSTEM_RUNTIME_ENTITY_ID,
        "required_module_keys": list(REQUIRED_PLATFORM_MODULE_KEYS),
        "client_user_ids": list(CLIENT_USER_IDS),
    }
    rows: list[TablePlanRow] = []

    def add(phase: int, phase_name: str, table: str, note: str, count_sql: str) -> None:
        rows.append(
            TablePlanRow(
                phase=phase,
                phase_name=phase_name,
                table=table,
                filter_note=note,
                records_planned=q1(conn, count_sql, **p),
            )
        )

    add(
        0,
        "Platform Catalog Seed",
        "platform_modules",
        "module_key IN (runtime.chat, runtime.notifications, runtime.calendar)",
        "SELECT COUNT(*) FROM platform_modules WHERE module_key = ANY(:required_module_keys)",
    )
    add(
        0,
        "Platform Catalog Seed",
        "platform_module_manifests",
        "module_key IN (runtime.chat, runtime.notifications, runtime.calendar)",
        "SELECT COUNT(*) FROM platform_module_manifests WHERE module_key = ANY(:required_module_keys)",
    )

    add(
        1,
        "Foundation",
        "portals",
        "id = 21",
        "SELECT COUNT(*) FROM portals WHERE id = :portal_id",
    )

    add(
        2,
        "Users",
        "users",
        "id IN (SELECT user_id FROM tenant_user_memberships WHERE tenant_id = 21)",
        """
        SELECT COUNT(*) FROM users u
        WHERE EXISTS (
            SELECT 1 FROM tenant_user_memberships m
            WHERE m.user_id = u.id AND m.tenant_id = :tenant_id
        )
        """,
    )
    add(
        2,
        "Users",
        "tenant_user_memberships",
        "tenant_id = 21 ONLY (excludes user 1840 DEV membership)",
        "SELECT COUNT(*) FROM tenant_user_memberships WHERE tenant_id = :tenant_id",
    )
    add(
        2,
        "Users",
        "tenant_user_profiles",
        "tenant_id = 21",
        "SELECT COUNT(*) FROM tenant_user_profiles WHERE tenant_id = :tenant_id",
    )

    for table in (
        "designer_object_types",
        "designer_field_definitions",
        "designer_relation_definitions",
        "designer_view_definitions",
        "designer_action_definitions",
        "designer_action_placements",
        "designer_action_forms",
        "designer_action_form_fields",
        "designer_metadata_snapshots",
        "designer_publish_records",
        "designer_system_menu_settings",
        "tenant_runtime_menu_settings",
    ):
        add(
            3,
            "Designer",
            table,
            "tenant_id = 21",
            f"SELECT COUNT(*) FROM {table} WHERE tenant_id = :tenant_id",
        )

    add(4, "Pages / Navigation", "pages", "portal_id = 21", "SELECT COUNT(*) FROM pages WHERE portal_id = :portal_id")
    add(
        4,
        "Pages / Navigation",
        "sections",
        "page_id IN CLIENT pages",
        """
        SELECT COUNT(*) FROM sections s
        JOIN pages p ON p.id = s.page_id
        WHERE p.portal_id = :portal_id
        """,
    )
    add(
        4,
        "Pages / Navigation",
        "blocks",
        "section_id IN CLIENT sections",
        """
        SELECT COUNT(*) FROM blocks b
        JOIN sections s ON s.id = b.section_id
        JOIN pages p ON p.id = s.page_id
        WHERE p.portal_id = :portal_id
        """,
    )
    add(
        4,
        "Pages / Navigation",
        "navigation_items",
        "portal_id = 21; self-FK ordered insert",
        "SELECT COUNT(*) FROM navigation_items WHERE portal_id = :portal_id",
    )

    for table in ("tenant_modules", "tenant_module_configurations"):
        add(
            5,
            "Modules",
            table,
            "tenant_id = 21",
            f"SELECT COUNT(*) FROM {table} WHERE tenant_id = :tenant_id",
        )

    add(
        6,
        "Runtime Seed",
        "runtime_entities",
        f"id = {SYSTEM_RUNTIME_ENTITY_ID}; is_system=true; deleted_at IS NULL",
        """
        SELECT COUNT(*) FROM runtime_entities
        WHERE id = CAST(:runtime_entity_id AS uuid)
          AND tenant_id = :tenant_id
          AND is_system = true
          AND deleted_at IS NULL
        """,
    )
    add(
        6,
        "Runtime Seed",
        "runtime_entity_values",
        f"entity_id = {SYSTEM_RUNTIME_ENTITY_ID}",
        """
        SELECT COUNT(*) FROM runtime_entity_values
        WHERE entity_id = CAST(:runtime_entity_id AS uuid)
          AND tenant_id = :tenant_id
        """,
    )

    add(
        7,
        "Operational Data",
        "document_libraries",
        "scoped via navigation/blocks — tenant 21 has 0",
        "SELECT 0",
    )
    add(
        7,
        "Operational Data",
        "library_documents",
        "scoped via document_libraries — tenant 21 has 0",
        "SELECT 0",
    )
    add(
        7,
        "Operational Data",
        "comments",
        "entity-scoped; no CLIENT runtime/doc targets — 0 planned",
        "SELECT 0",
    )
    add(
        7,
        "Operational Data",
        "notes",
        "entity-scoped; no CLIENT targets — 0 planned",
        "SELECT 0",
    )
    add(
        7,
        "Operational Data",
        "notifications",
        "entity-scoped; no CLIENT targets — 0 planned",
        "SELECT 0",
    )

    return rows


def user_import_strategy(conn) -> dict[str, Any]:
    memberships = conn.execute(
        text(
            """
            SELECT tenant_id, user_id, role_key
            FROM tenant_user_memberships
            WHERE user_id = ANY(:client_user_ids)
            ORDER BY user_id, tenant_id
            """
        ),
        {"client_user_ids": list(CLIENT_USER_IDS)},
    ).fetchall()
    profiles = conn.execute(
        text(
            """
            SELECT id, user_id, tenant_id
            FROM tenant_user_profiles
            WHERE tenant_id = :tenant_id
            ORDER BY user_id
            """
        ),
        {"tenant_id": CLIENT_TENANT_ID},
    ).fetchall()
    users = conn.execute(
        text(
            """
            SELECT u.id, u.email, u.full_name
            FROM users u
            WHERE EXISTS (
                SELECT 1 FROM tenant_user_memberships m
                WHERE m.user_id = u.id AND m.tenant_id = :tenant_id
            )
            ORDER BY u.id
            """
        ),
        {"tenant_id": CLIENT_TENANT_ID},
    ).fetchall()

    user_1840_memberships = [dict(r._mapping) for r in memberships if r.user_id == 1840]
    import_memberships = [m for m in user_1840_memberships if m["tenant_id"] == CLIENT_TENANT_ID]
    excluded_memberships = [m for m in user_1840_memberships if m["tenant_id"] != CLIENT_TENANT_ID]

    return {
        "users": {
            "filter": "id IN (SELECT user_id FROM tenant_user_memberships WHERE tenant_id = 21)",
            "records_planned": len(users),
            "rows": [dict(r._mapping) for r in users],
        },
        "tenant_user_memberships": {
            "filter": "tenant_id = 21 ONLY",
            "records_planned": q1(
                conn,
                "SELECT COUNT(*) FROM tenant_user_memberships WHERE tenant_id = :tenant_id",
                tenant_id=CLIENT_TENANT_ID,
            ),
            "all_memberships_for_client_users": [dict(r._mapping) for r in memberships],
            "import_rows": import_memberships,
            "excluded_rows": excluded_memberships,
            "user_1840_client_only_membership_confirmed": len(import_memberships) == 1
            and len(excluded_memberships) == 1
            and excluded_memberships[0]["tenant_id"] == 1,
        },
        "tenant_user_profiles": {
            "filter": "tenant_id = 21",
            "records_planned": len(profiles),
            "rows": [dict(r._mapping) for r in profiles],
        },
    }


def runtime_classification(conn) -> dict[str, Any]:
    all_entities = conn.execute(
        text(
            """
            SELECT id::text, is_system, deleted_at, object_type_key
            FROM runtime_entities
            WHERE tenant_id = :tenant_id
            ORDER BY id
            """
        ),
        {"tenant_id": CLIENT_TENANT_ID},
    ).fetchall()
    all_values = conn.execute(
        text(
            """
            SELECT rev.id::text, rev.entity_id::text, rev.field_key
            FROM runtime_entity_values rev
            WHERE rev.tenant_id = :tenant_id
            ORDER BY rev.id
            """
        ),
        {"tenant_id": CLIENT_TENANT_ID},
    ).fetchall()
    import_entity = [
        r for r in all_entities if str(r.id) == SYSTEM_RUNTIME_ENTITY_ID and r.deleted_at is None
    ]
    excluded_entities = [r for r in all_entities if str(r.id) != SYSTEM_RUNTIME_ENTITY_ID or r.deleted_at]
    import_values = [r for r in all_values if str(r.entity_id) == SYSTEM_RUNTIME_ENTITY_ID]
    excluded_values = [r for r in all_values if str(r.entity_id) != SYSTEM_RUNTIME_ENTITY_ID]

    return {
        "runtime_entities": {
            "source_total": len(all_entities),
            "import_filter": f"id = {SYSTEM_RUNTIME_ENTITY_ID} AND is_system = true AND deleted_at IS NULL",
            "records_planned": len(import_entity),
            "import_rows": [dict(r._mapping) for r in import_entity],
            "excluded_rows": [dict(r._mapping) for r in excluded_entities],
        },
        "runtime_entity_values": {
            "source_total": len(all_values),
            "import_filter": f"entity_id = {SYSTEM_RUNTIME_ENTITY_ID} AND tenant_id = 21",
            "records_planned": len(import_values),
            "import_rows": [dict(r._mapping) for r in import_values],
            "excluded_rows": [dict(r._mapping) for r in excluded_values],
        },
    }


def platform_catalog_seed(conn) -> dict[str, Any]:
    modules = q1(
        conn,
        "SELECT COUNT(*) FROM platform_modules WHERE module_key = ANY(:keys)",
        keys=list(REQUIRED_PLATFORM_MODULE_KEYS),
    )
    manifests = q1(
        conn,
        "SELECT COUNT(*) FROM platform_module_manifests WHERE module_key = ANY(:keys)",
        keys=list(REQUIRED_PLATFORM_MODULE_KEYS),
    )
    per_key = []
    for key in REQUIRED_PLATFORM_MODULE_KEYS:
        per_key.append(
            {
                "module_key": key,
                "platform_modules": q1(
                    conn,
                    "SELECT COUNT(*) FROM platform_modules WHERE module_key = :key",
                    key=key,
                ),
                "platform_module_manifests": q1(
                    conn,
                    "SELECT COUNT(*) FROM platform_module_manifests WHERE module_key = :key",
                    key=key,
                ),
                "platform_module_versions": q1(
                    conn,
                    "SELECT COUNT(*) FROM platform_module_versions WHERE module_key = :key",
                    key=key,
                ),
            }
        )
    return {
        "required_module_keys": list(REQUIRED_PLATFORM_MODULE_KEYS),
        "records_planned_delta": modules + manifests,
        "platform_modules": modules,
        "platform_module_manifests": manifests,
        "bulk_versions_excluded": True,
        "per_module": per_key,
    }


def leakage_protection(conn) -> dict[str, Any]:
    params = {
        "excluded_tenant_ids": list(EXCLUDED_TENANT_IDS),
        "tenant_id": CLIENT_TENANT_ID,
        "portal_id": CLIENT_PORTAL_ID,
    }
    source_scope = {
        "pages_client": q1(conn, "SELECT COUNT(*) FROM pages WHERE portal_id = :portal_id", portal_id=CLIENT_PORTAL_ID),
        "pages_excluded": q1(
            conn,
            "SELECT COUNT(*) FROM pages WHERE portal_id = ANY(:excluded_tenant_ids)",
            excluded_tenant_ids=list(EXCLUDED_TENANT_IDS),
        ),
        "navigation_client": q1(
            conn, "SELECT COUNT(*) FROM navigation_items WHERE portal_id = :portal_id", portal_id=CLIENT_PORTAL_ID
        ),
        "navigation_excluded": q1(
            conn,
            "SELECT COUNT(*) FROM navigation_items WHERE portal_id = ANY(:excluded_tenant_ids)",
            excluded_tenant_ids=list(EXCLUDED_TENANT_IDS),
        ),
        "designer_client": q1(
            conn, "SELECT COUNT(*) FROM designer_object_types WHERE tenant_id = :tenant_id", tenant_id=CLIENT_TENANT_ID
        ),
        "designer_excluded": q1(
            conn,
            "SELECT COUNT(*) FROM designer_object_types WHERE tenant_id = ANY(:excluded_tenant_ids)",
            excluded_tenant_ids=list(EXCLUDED_TENANT_IDS),
        ),
        "runtime_entities_client": q1(
            conn, "SELECT COUNT(*) FROM runtime_entities WHERE tenant_id = :tenant_id", tenant_id=CLIENT_TENANT_ID
        ),
        "runtime_entities_excluded": q1(
            conn,
            "SELECT COUNT(*) FROM runtime_entities WHERE tenant_id = ANY(:excluded_tenant_ids)",
            excluded_tenant_ids=list(EXCLUDED_TENANT_IDS),
        ),
        "runtime_values_client": q1(
            conn,
            """
            SELECT COUNT(*) FROM runtime_entity_values rev
            JOIN runtime_entities re ON re.id = rev.entity_id
            WHERE re.tenant_id = :tenant_id
            """,
            tenant_id=CLIENT_TENANT_ID,
        ),
        "runtime_values_excluded": q1(
            conn,
            """
            SELECT COUNT(*) FROM runtime_entity_values rev
            JOIN runtime_entities re ON re.id = rev.entity_id
            WHERE re.tenant_id = ANY(:excluded_tenant_ids)
            """,
            excluded_tenant_ids=list(EXCLUDED_TENANT_IDS),
        ),
        "portals_client": q1(conn, "SELECT COUNT(*) FROM portals WHERE id = :portal_id", portal_id=CLIENT_PORTAL_ID),
        "portals_excluded": q1(
            conn, "SELECT COUNT(*) FROM portals WHERE id = ANY(:excluded_tenant_ids)", excluded_tenant_ids=list(EXCLUDED_TENANT_IDS)
        ),
    }
    post_execute_checks = {
        "portals_excluded": "SELECT COUNT(*) FROM portals WHERE id = ANY(:excluded_tenant_ids)",
        "pages_excluded": "SELECT COUNT(*) FROM pages WHERE portal_id = ANY(:excluded_tenant_ids)",
        "navigation_excluded": "SELECT COUNT(*) FROM navigation_items WHERE portal_id = ANY(:excluded_tenant_ids)",
        "designer_excluded": "SELECT COUNT(*) FROM designer_object_types WHERE tenant_id = ANY(:excluded_tenant_ids)",
        "runtime_entities_excluded": "SELECT COUNT(*) FROM runtime_entities WHERE tenant_id = ANY(:excluded_tenant_ids)",
        "runtime_values_excluded": """
            SELECT COUNT(*) FROM runtime_entity_values rev
            JOIN runtime_entities re ON re.id = rev.entity_id
            WHERE re.tenant_id = ANY(:excluded_tenant_ids)
        """,
    }
    return {
        "execute_scope": {"tenant_id": CLIENT_TENANT_ID, "portal_id": CLIENT_PORTAL_ID},
        "excluded_tenant_ids": list(EXCLUDED_TENANT_IDS),
        "source_boundary_counts": source_scope,
        "post_execute_leakage_checks": post_execute_checks,
        "expected_post_execute_leak_count": 0,
    }


def target_readiness(target_conn) -> dict[str, Any]:
    table_count = q1(
        target_conn,
        """
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """,
    )
    alembic = None
    if table_count > 0:
        alembic = target_conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    portals = None
    if table_count > 0:
        portals = q1(target_conn, "SELECT COUNT(*) FROM portals")
    return {
        "table_count": table_count,
        "alembic_version": alembic,
        "portals": portals,
        "data_empty": table_count == 0 or (portals == 0 if portals is not None else True),
        "schema_ready": table_count >= EXPECTED_TARGET_TABLES and alembic == EXPECTED_ALEMBIC,
    }


def schema_bootstrap_plan() -> dict[str, Any]:
    return {
        "action": "schema-only bootstrap (NOT executed in 18.10.2)",
        "schema_only_source": "yasnopro_dev",
        "target": TARGET_DB,
        "method": "pg_dump --schema-only from yasnopro_dev -> restore to yasnopro_client",
        "post_restore_sql": f"INSERT INTO alembic_version (version_num) VALUES ('{EXPECTED_ALEMBIC}') ON CONFLICT DO NOTHING",
        "expected_tables": EXPECTED_TARGET_TABLES,
        "expected_alembic_version": EXPECTED_ALEMBIC,
        "reference_step": "18.9.4-fix (TEMPLATE schema bootstrap)",
    }


def main() -> int:
    source = engine(SOURCE_DB)
    target = engine(TARGET_DB)
    with source.connect() as src_conn, target.connect() as tgt_conn:
        plans = build_table_plans(src_conn)
        by_phase: dict[int, int] = {}
        for row in plans:
            by_phase[row.phase] = by_phase.get(row.phase, 0) + row.records_planned
        total = sum(r.records_planned for r in plans)

        user_strategy = user_import_strategy(src_conn)
        runtime = runtime_classification(src_conn)
        platform = platform_catalog_seed(src_conn)
        leakage = leakage_protection(src_conn)
        readiness = target_readiness(tgt_conn)
        bootstrap = schema_bootstrap_plan()

        execute_readiness = {
            "schema_ready": readiness["schema_ready"],
            "data_empty": readiness["data_empty"],
            "platform_catalog_ready": False,
            "records_planned": total,
            "user_scope_ready": user_strategy["tenant_user_memberships"]["user_1840_client_only_membership_confirmed"],
            "runtime_scope_ready": runtime["runtime_entities"]["records_planned"] == 1
            and runtime["runtime_entity_values"]["records_planned"] == 1,
            "blocked_reasons": [],
        }
        if not execute_readiness["schema_ready"]:
            execute_readiness["blocked_reasons"].append("schema_missing")
        if not execute_readiness["data_empty"] and readiness["table_count"] > 0:
            execute_readiness["blocked_reasons"].append("target_not_empty")
        expected_total = 83
        execute_readiness["records_planned_expected"] = expected_total
        if execute_readiness["records_planned"] != expected_total:
            execute_readiness["blocked_reasons"].append(
                f"records_planned_unexpected_{execute_readiness['records_planned']}"
            )

        report = {
            "step": "18.10.2",
            "source_db": SOURCE_DB,
            "target_db": TARGET_DB,
            "client_tenant_id": CLIENT_TENANT_ID,
            "client_portal_id": CLIENT_PORTAL_ID,
            "portal": dict(
                src_conn.execute(
                    text(
                        "SELECT id, name, tenant_type, environment_role, is_protected, code FROM portals WHERE id = :id"
                    ),
                    {"id": CLIENT_PORTAL_ID},
                ).mappings().one()
            ),
            "table_plans": [asdict(r) for r in plans],
            "records_planned_by_phase": {str(k): v for k, v in sorted(by_phase.items())},
            "records_planned_total": total,
            "user_import_strategy": user_strategy,
            "runtime_classification": runtime,
            "platform_catalog_seed": platform,
            "leakage_protection": leakage,
            "schema_bootstrap_plan": bootstrap,
            "target_readiness": readiness,
            "execute_readiness": execute_readiness,
            "cleanup_source": {
                "test_cleanup_runs": 0,
                "test_cleanup_records": 0,
            },
        }

    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"records_planned_total": total, "out": str(OUT_JSON)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
