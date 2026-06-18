#!/usr/bin/env python3
"""Read-only Step 18.9.4 platform modules dependency audit."""
from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
parsed = urlparse(os.environ["DATABASE_URL"])
SOURCE_DB = "portal_constructor_v2"
TENANT_ID = 2
MODULE_KEYS = ("runtime.chat", "runtime.notifications", "runtime.calendar")
CATALOG_TABLES = (
    "platform_modules",
    "platform_module_manifests",
    "platform_module_versions",
    "platform_module_publications",
    "platform_releases",
    "tenant_update_offers",
)


def eng(db: str):
    return create_engine(urlunparse(parsed._replace(path="/" + db)))


def fk_edges(conn, tables: tuple[str, ...]) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT child.relname AS child_table,
                   a.attname AS child_column,
                   parent.relname AS parent_table,
                   af.attname AS parent_column,
                   con.conname AS constraint_name
            FROM pg_constraint con
            JOIN pg_class child ON con.conrelid = child.oid
            JOIN pg_class parent ON con.confrelid = parent.oid
            JOIN pg_namespace nsp ON nsp.oid = child.relnamespace
            JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
            JOIN unnest(con.confkey) WITH ORDINALITY AS fk(attnum, ord) ON ck.ord = fk.ord
            JOIN pg_attribute a ON a.attrelid = child.oid AND a.attnum = ck.attnum
            JOIN pg_attribute af ON af.attrelid = parent.oid AND af.attnum = fk.attnum
            WHERE con.contype = 'f'
              AND nsp.nspname = 'public'
              AND child.relname = ANY(:tables)
            ORDER BY child.relname, parent.relname, a.attname
            """
        ),
        {"tables": list(tables)},
    ).mappings().all()
    return [dict(r) for r in rows]


def table_exists(conn, table: str) -> bool:
    return bool(
        conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='public' AND table_name=:t
                """
            ),
            {"t": table},
        ).scalar()
    )


def count_for_module_key(conn, table: str, module_key: str) -> int | None:
    if not table_exists(conn, table):
        return None
    cols = {
        r[0]
        for r in conn.execute(
            text(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_schema='public' AND table_name=:t
                """
            ),
            {"t": table},
        ).fetchall()
    }
    if "module_key" in cols:
        return int(
            conn.execute(
                text(f"SELECT COUNT(*) FROM {table} WHERE module_key = :mk"),
                {"mk": module_key},
            ).scalar()
            or 0
        )
    if table == "platform_module_versions" and "module_id" in cols:
        return int(
            conn.execute(
                text(
                    """
                    SELECT COUNT(*) FROM platform_module_versions v
                    JOIN platform_modules pm ON pm.id = v.module_id
                    WHERE pm.module_key = :mk
                    """
                ),
                {"mk": module_key},
            ).scalar()
            or 0
        )
    if table == "platform_module_manifests" and "module_id" in cols:
        return int(
            conn.execute(
                text(
                    """
                    SELECT COUNT(*) FROM platform_module_manifests m
                    JOIN platform_modules pm ON pm.id = m.module_id
                    WHERE pm.module_key = :mk
                    """
                ),
                {"mk": module_key},
            ).scalar()
            or 0
        )
    return None


def main() -> None:
    out: dict = {"source_db": SOURCE_DB, "tenant_id": TENANT_ID}
    with eng(SOURCE_DB).connect() as c:
        out["tenant_modules_fk_audit"] = fk_edges(
            c, ("tenant_modules", "tenant_module_configurations")
        )
        out["source_tenant_modules"] = [
            dict(r)
            for r in c.execute(
                text(
                    """
                    SELECT id, tenant_id, portal_id, module_key, installed_version,
                           enabled, source, installed_at
                    FROM tenant_modules
                    WHERE tenant_id = :tid
                    ORDER BY module_key
                    """
                ),
                {"tid": TENANT_ID},
            ).mappings().all()
        ]
        keys = [r["module_key"] for r in out["source_tenant_modules"]]
        out["platform_modules_rows"] = [
            dict(r)
            for r in c.execute(
                text(
                    """
                    SELECT module_key, title, status, created_at, updated_at, id
                    FROM platform_modules
                    WHERE module_key = ANY(:keys)
                    ORDER BY module_key
                    """
                ),
                {"keys": keys},
            ).mappings().all()
        ]

        catalog_audit: list[dict] = []
        for mk in keys:
            for table in CATALOG_TABLES:
                cnt = count_for_module_key(c, table, mk)
                if cnt is None:
                    continue
                needed_fk = table == "platform_modules" and cnt > 0
                needed_runtime = table in {
                    "platform_modules",
                    "platform_module_manifests",
                    "platform_module_versions",
                }
                catalog_audit.append(
                    {
                        "module_key": mk,
                        "table": table,
                        "records": cnt,
                        "needed_for_fk": needed_fk,
                        "needed_for_runtime": needed_runtime,
                        "recommendation": (
                            "REQUIRED seed (FK parent)"
                            if table == "platform_modules" and cnt > 0
                            else (
                                "evaluate if runtime needs manifest/version"
                                if cnt > 0
                                else "not present"
                            )
                        ),
                    }
                )
        out["platform_catalog_tables_audit"] = catalog_audit

        catalog_child_tables = (
            "platform_modules",
            "platform_module_manifests",
            "platform_module_versions",
        )
        out["platform_catalog_fk_graph"] = fk_edges(c, catalog_child_tables)

        # tenant_module_configurations FK context
        out["tenant_module_configurations_sample"] = [
            dict(r)
            for r in c.execute(
                text(
                    """
                    SELECT tmc.id, tmc.tenant_id, tmc.module_key, tmc.module_version,
                           tmc.config_version, tmc.source
                    FROM tenant_module_configurations tmc
                    WHERE tmc.tenant_id = :tid
                    ORDER BY tmc.module_key
                    """
                ),
                {"tid": TENANT_ID},
            ).mappings().all()
        ]

        out["global_catalog_totals"] = {
            t: int(c.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar() or 0)
            for t in CATALOG_TABLES
            if table_exists(c, t)
        }

        out["cleanup_source"] = {
            "test_cleanup_runs": int(c.execute(text("SELECT COUNT(*) FROM test_cleanup_runs")).scalar() or 0),
            "test_cleanup_records": int(
                c.execute(text("SELECT COUNT(*) FROM test_cleanup_records")).scalar() or 0
            ),
        }

    out_path = Path(__file__).resolve().parent / "audit_platform_modules_dependency_1894_out.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
