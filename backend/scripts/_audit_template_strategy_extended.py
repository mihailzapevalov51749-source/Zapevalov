#!/usr/bin/env python3
"""Extended read-only audit for Step 18.9.1."""
from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
parsed = urlparse(os.environ["DATABASE_URL"])


def eng(db: str):
    return create_engine(urlunparse(parsed._replace(path="/" + db)))


def q(conn, sql, **params):
    return conn.execute(text(sql), params).mappings().all()


out: dict = {}

with eng("yasnopro_dev").connect() as c:
    out["dev_portal"] = [dict(r) for r in q(c, "SELECT * FROM portals LIMIT 5")]
    out["dev_journal"] = [dict(r) for r in q(
        c,
        """
        SELECT journal_kind, scope, COUNT(*) AS cnt
        FROM platform_event_journal_entries
        GROUP BY journal_kind, scope
        ORDER BY cnt DESC
        """,
    )]
    out["runtime_by_object"] = [dict(r) for r in q(
        c,
        """
        SELECT dot.key, dot.name, COUNT(re.id) AS entities
        FROM designer_object_types dot
        LEFT JOIN runtime_entities re ON re.object_type_id = dot.id AND re.deleted_at IS NULL
        WHERE dot.tenant_id = 1 AND dot.deleted_at IS NULL
        GROUP BY dot.key, dot.name
        ORDER BY entities DESC, dot.key
        """,
    )]
    out["structure_counts_t1"] = {
        "pages": q(c, "SELECT COUNT(*) AS c FROM pages WHERE portal_id=1 AND deleted_at IS NULL")[0]["c"],
        "navigation": q(c, "SELECT COUNT(*) AS c FROM navigation_items WHERE portal_id=1 AND deleted_at IS NULL")[0]["c"],
        "object_types": q(c, "SELECT COUNT(*) AS c FROM designer_object_types WHERE tenant_id=1 AND deleted_at IS NULL")[0]["c"],
        "fields": q(c, "SELECT COUNT(*) AS c FROM designer_field_definitions WHERE tenant_id=1 AND deleted_at IS NULL")[0]["c"],
        "views": q(c, "SELECT COUNT(*) AS c FROM designer_view_definitions WHERE tenant_id=1 AND deleted_at IS NULL")[0]["c"],
        "workspaces": q(c, "SELECT COUNT(*) AS c FROM designer_workspaces WHERE tenant_id=1 AND deleted_at IS NULL")[0]["c"],
        "runtime_entities": q(c, "SELECT COUNT(*) AS c FROM runtime_entities WHERE tenant_id=1 AND deleted_at IS NULL")[0]["c"],
        "comments": q(c, "SELECT COUNT(*) AS c FROM comments")[0]["c"],
        "notifications": q(c, "SELECT COUNT(*) AS c FROM notifications")[0]["c"],
        "library_documents": q(c, "SELECT COUNT(*) AS c FROM library_documents")[0]["c"],
        "document_libraries": q(c, "SELECT COUNT(*) AS c FROM document_libraries")[0]["c"],
        "designer_publish_records": q(c, "SELECT COUNT(*) AS c FROM designer_publish_records")[0]["c"],
        "designer_metadata_snapshots": q(c, "SELECT COUNT(*) AS c FROM designer_metadata_snapshots")[0]["c"],
    }
    out["users"] = [dict(r) for r in q(c, "SELECT id, email, full_name, is_active FROM users ORDER BY id")]
    out["memberships"] = [dict(r) for r in q(c, "SELECT * FROM tenant_user_memberships ORDER BY id")]

for dbname in ("yasnopro_template", "yasnopro_client"):
    try:
        with eng(dbname).connect() as c:
            tables = q(
                c,
                "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
            )[0]["c"]
            out[f"{dbname}_tables"] = tables
    except Exception as e:
        out[f"{dbname}_tables"] = str(e)

print(json.dumps(out, ensure_ascii=False, indent=2, default=str))
