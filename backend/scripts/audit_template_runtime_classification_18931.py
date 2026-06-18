#!/usr/bin/env python3
"""Step 18.9.3.1 — read-only runtime/document classification for tenant_id=2."""
from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

TENANT_ID = 2
load_dotenv(Path(__file__).resolve().parents[2] / ".env")
parsed = urlparse(os.environ["DATABASE_URL"])
url = urlunparse(parsed._replace(path="/portal_constructor_v2"))
eng = create_engine(url, isolation_level="AUTOCOMMIT")


def qall(sql: str, **params):
    with eng.connect() as c:
        return [dict(r) for r in c.execute(text(sql), params).mappings().all()]


def q1(sql: str, **params) -> int:
    with eng.connect() as c:
        return int(c.execute(text(sql), params).scalar() or 0)


runtime_entities = qall(
    """
    SELECT
        re.id,
        re.object_type_id,
        re.object_type_key,
        dot.name AS object_type_name,
        re.created_at,
        re.updated_at,
        re.created_by,
        re.updated_by,
        re.deleted_at,
        re.status,
        re.is_system,
        re.record_number
    FROM runtime_entities re
    LEFT JOIN designer_object_types dot ON dot.id = re.object_type_id
    WHERE re.tenant_id = :tid
    ORDER BY re.id
    """,
    tid=TENANT_ID,
)

for ent in runtime_entities:
    vals = qall(
        """
        SELECT rev.id, rev.field_key, rev.field_type, rev.value_json, rev.created_at, rev.updated_at
        FROM runtime_entity_values rev
        WHERE rev.entity_id = :eid AND rev.tenant_id = :tid
        ORDER BY rev.field_key
        """,
        eid=ent["id"],
        tid=TENANT_ID,
    )
    ent["values"] = vals
    title = None
    for v in vals:
        fk = (v.get("field_key") or "").lower()
        vj = v.get("value_json")
        text_val = None
        if isinstance(vj, str):
            text_val = vj
        elif isinstance(vj, dict):
            text_val = vj.get("text") or vj.get("value") or vj.get("title") or vj.get("name")
        if fk in ("title", "name", "nazvanie", "nazvaniye", "zagolovok") or "title" in fk:
            title = text_val
            break
    if not title:
        for v in vals:
            vj = v.get("value_json")
            if isinstance(vj, str) and vj.strip():
                title = vj
                break
            if isinstance(vj, dict):
                for k in ("text", "value", "title", "name"):
                    if vj.get(k):
                        title = str(vj[k])
                        break
            if title:
                break
    ent["title"] = title

# document libraries — no portal_id on table; link via navigation
libraries = qall(
    """
    SELECT dl.id, dl.title, dl.description, dl.created_at, dl.updated_at
    FROM document_libraries dl
    ORDER BY dl.id
    """
)
for lib in libraries:
    nav = qall(
        """
        SELECT ni.id AS navigation_item_id, ni.portal_id, ni.title AS nav_title, ni.type, ni.is_visible
        FROM navigation_items ni
        WHERE ni.library_id = :lid AND ni.deleted_at IS NULL
        ORDER BY ni.portal_id, ni.id
        """,
        lid=lib["id"],
    )
    lib["navigation_links"] = nav
    lib["linked_portal_ids"] = sorted({r["portal_id"] for r in nav})
    lib["linked_to_tenant_2"] = TENANT_ID in lib["linked_portal_ids"]

documents = qall(
    """
    SELECT id, library_id, title,
           COALESCE(original_filename, file_path) AS file_name,
           original_filename, file_path, document_type, is_folder,
           created_at, updated_at, parent_id, created_by
    FROM library_documents
    ORDER BY library_id, id
    """
)

out = {
    "tenant_id": TENANT_ID,
    "runtime_entities": runtime_entities,
    "document_libraries": libraries,
    "library_documents": documents,
    "cleanup": {
        "test_cleanup_runs": q1("SELECT COUNT(*) FROM test_cleanup_runs"),
        "test_cleanup_records": q1("SELECT COUNT(*) FROM test_cleanup_records"),
    },
}
out_path = Path(__file__).resolve().parent / "audit_template_runtime_classification_18931_out.json"
out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
print(json.dumps(out, ensure_ascii=False, indent=2, default=str))
