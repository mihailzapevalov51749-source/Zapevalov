#!/usr/bin/env python3
"""Read-only Step 18.10.1 — CLIENT environment bootstrap strategy and boundary audit."""
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
TARGET_DB = "yasnopro_client"
CLIENT_TENANT_ID = 21
CLIENT_PORTAL_ID = 21

CATALOG_TABLES = (
    "platform_modules",
    "platform_module_manifests",
    "platform_module_versions",
    "platform_module_publications",
    "platform_releases",
)

TENANT_CATALOG_QUERIES: dict[str, str] = {
    "portals": "SELECT COUNT(*) FROM portals WHERE id = :tid",
    "pages": "SELECT COUNT(*) FROM pages WHERE portal_id = :tid",
    "sections": """
        SELECT COUNT(*) FROM sections s
        JOIN pages p ON p.id = s.page_id
        WHERE p.portal_id = :tid
    """,
    "blocks": """
        SELECT COUNT(*) FROM blocks b
        JOIN sections s ON s.id = b.section_id
        JOIN pages p ON p.id = s.page_id
        WHERE p.portal_id = :tid
    """,
    "navigation_items": "SELECT COUNT(*) FROM navigation_items WHERE portal_id = :tid",
    "designer_object_types": "SELECT COUNT(*) FROM designer_object_types WHERE tenant_id = :tid",
    "designer_field_definitions": "SELECT COUNT(*) FROM designer_field_definitions WHERE tenant_id = :tid",
    "designer_relation_definitions": "SELECT COUNT(*) FROM designer_relation_definitions WHERE tenant_id = :tid",
    "designer_view_definitions": "SELECT COUNT(*) FROM designer_view_definitions WHERE tenant_id = :tid",
    "tenant_modules": "SELECT COUNT(*) FROM tenant_modules WHERE tenant_id = :tid",
    "tenant_module_configurations": "SELECT COUNT(*) FROM tenant_module_configurations WHERE tenant_id = :tid",
    "runtime_entities": "SELECT COUNT(*) FROM runtime_entities WHERE tenant_id = :tid AND deleted_at IS NULL",
    "runtime_entity_values": """
        SELECT COUNT(*) FROM runtime_entity_values rev
        JOIN runtime_entities re ON re.id = rev.entity_id
        WHERE re.tenant_id = :tid AND re.deleted_at IS NULL
    """,
    "runtime_relation_instances": "SELECT COUNT(*) FROM runtime_relation_instances WHERE tenant_id = :tid",
    "document_libraries": """
        SELECT COUNT(DISTINCT dl.id) FROM document_libraries dl
        JOIN navigation_items ni ON ni.library_id = dl.id
        WHERE ni.portal_id = :tid
    """,
    "library_documents": """
        SELECT COUNT(*) FROM library_documents ld
        WHERE ld.library_id IN (
            SELECT DISTINCT ni.library_id FROM navigation_items ni
            WHERE ni.portal_id = :tid AND ni.library_id IS NOT NULL
        )
    """,
    "comments": """
        SELECT COUNT(*) FROM comments c
        WHERE (
            c.entity_type = 'runtime_entity'
            AND EXISTS (
                SELECT 1 FROM runtime_entities re
                WHERE re.id::text = c.entity_id AND re.tenant_id = :tid
            )
        ) OR (
            c.entity_type = 'file'
            AND EXISTS (
                SELECT 1 FROM library_documents ld
                JOIN navigation_items ni ON ni.library_id = ld.library_id
                WHERE ni.portal_id = :tid AND ld.id::text = c.entity_id
            )
        )
    """,
    "notes": """
        SELECT COUNT(*) FROM notes n
        WHERE n.entity_type = 'runtime_entity'
          AND EXISTS (
            SELECT 1 FROM runtime_entities re
            WHERE re.id::text = n.entity_id AND re.tenant_id = :tid
          )
    """,
    "notifications": """
        SELECT COUNT(*) FROM notifications n
        WHERE n.context::jsonb @> jsonb_build_object('tenant_id', :tid)
           OR n.context::jsonb @> jsonb_build_object('portal_id', :tid)
    """,
    "users": """
        SELECT COUNT(DISTINCT u.id) FROM users u
        JOIN tenant_user_memberships m ON m.user_id = u.id
        WHERE m.tenant_id = :tid
    """,
    "tenant_user_memberships": "SELECT COUNT(*) FROM tenant_user_memberships WHERE tenant_id = :tid",
    "tenant_user_profiles": "SELECT COUNT(*) FROM tenant_user_profiles WHERE tenant_id = :tid",
}


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


def main() -> None:
    out: dict = {
        "source_db": SOURCE_DB,
        "target_db": TARGET_DB,
        "client_tenant_id": CLIENT_TENANT_ID,
    }
    params = {"tid": CLIENT_TENANT_ID}

    with eng(SOURCE_DB).connect() as c:
        out["portal_summary"] = [
            dict(r)
            for r in c.execute(
                text(
                    """
                    SELECT id, name, tenant_type, environment_role, is_protected, code
                    FROM portals WHERE id = :tid
                    """
                ),
                params,
            ).mappings().all()
        ]
        out["tenant_21_catalog"] = {
            table: int(c.execute(text(sql), params).scalar() or 0)
            for table, sql in TENANT_CATALOG_QUERIES.items()
        }

        module_keys = [
            r["module_key"]
            for r in c.execute(
                text("SELECT module_key FROM tenant_modules WHERE tenant_id = :tid ORDER BY module_key"),
                params,
            ).mappings().all()
        ]
        out["client_module_keys"] = module_keys

        out["fk_dependency_audit"] = {
            "tenant_modules": fk_edges(c, ("tenant_modules", "tenant_module_configurations")),
            "runtime": fk_edges(
                c,
                ("runtime_entities", "runtime_entity_values", "runtime_relation_instances"),
            ),
            "documents": fk_edges(c, ("document_libraries", "library_documents")),
            "comments": fk_edges(c, ("comments", "comment_attachments", "notes", "notifications")),
            "users": fk_edges(
                c,
                ("users", "tenant_user_memberships", "tenant_user_profiles", "platform_users"),
            ),
        }

        catalog_audit: list[dict] = []
        for mk in module_keys:
            for table in CATALOG_TABLES:
                if table == "platform_modules":
                    cnt = int(
                        c.execute(
                            text("SELECT COUNT(*) FROM platform_modules WHERE module_key = :mk"),
                            {"mk": mk},
                        ).scalar()
                        or 0
                    )
                elif table == "platform_module_manifests":
                    cnt = int(
                        c.execute(
                            text("SELECT COUNT(*) FROM platform_module_manifests WHERE module_key = :mk"),
                            {"mk": mk},
                        ).scalar()
                        or 0
                    )
                elif table == "platform_module_versions":
                    cnt = int(
                        c.execute(
                            text(
                                """
                                SELECT COUNT(*) FROM platform_module_versions v
                                JOIN platform_modules pm ON pm.module_key = v.module_key
                                WHERE pm.module_key = :mk
                                """
                            ),
                            {"mk": mk},
                        ).scalar()
                        or 0
                    )
                else:
                    cnt = 0
                catalog_audit.append({"module_key": mk, "table": table, "records": cnt})
        out["platform_catalog_dependency"] = catalog_audit
        out["platform_catalog_totals"] = {
            t: int(c.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar() or 0)
            for t in CATALOG_TABLES
        }

        out["cleanup_source"] = {
            "test_cleanup_runs": int(c.execute(text("SELECT COUNT(*) FROM test_cleanup_runs")).scalar() or 0),
            "test_cleanup_records": int(
                c.execute(text("SELECT COUNT(*) FROM test_cleanup_records")).scalar() or 0
            ),
        }

        # Compare with TEMPLATE and DEV for boundary context
        out["boundary_comparison"] = {}
        for tid in (1, 2, 21):
            p = {"tid": tid}
            out["boundary_comparison"][f"tenant_{tid}"] = {
                "pages": int(c.execute(text("SELECT COUNT(*) FROM pages WHERE portal_id = :tid"), p).scalar() or 0),
                "object_types": int(
                    c.execute(
                        text(
                            "SELECT COUNT(*) FROM designer_object_types WHERE tenant_id = :tid AND deleted_at IS NULL"
                        ),
                        p,
                    ).scalar()
                    or 0
                ),
                "runtime_entities": int(
                    c.execute(
                        text("SELECT COUNT(*) FROM runtime_entities WHERE tenant_id = :tid AND deleted_at IS NULL"),
                        p,
                    ).scalar()
                    or 0
                ),
                "users": int(
                    c.execute(
                        text("SELECT COUNT(*) FROM tenant_user_memberships WHERE tenant_id = :tid"),
                        p,
                    ).scalar()
                    or 0
                ),
            }

    with eng(TARGET_DB).connect() as c:
        out["target_readiness"] = {
            "table_count": int(
                c.execute(
                    text(
                        "SELECT COUNT(*) FROM information_schema.tables "
                        "WHERE table_schema='public' AND table_type='BASE TABLE'"
                    )
                ).scalar()
                or 0
            ),
            "alembic_version": None,
            "portals": None,
            "data_empty": None,
        }
        if out["target_readiness"]["table_count"]:
            try:
                out["target_readiness"]["alembic_version"] = c.execute(
                    text("SELECT version_num FROM alembic_version LIMIT 1")
                ).scalar()
            except Exception:
                out["target_readiness"]["alembic_version"] = None
            out["target_readiness"]["portals"] = int(
                c.execute(text("SELECT COUNT(*) FROM portals")).scalar() or 0
            )
            out["target_readiness"]["data_empty"] = out["target_readiness"]["portals"] == 0
        else:
            out["target_readiness"]["data_empty"] = True

    out_path = Path(__file__).resolve().parent / "audit_client_environment_18101_out.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
