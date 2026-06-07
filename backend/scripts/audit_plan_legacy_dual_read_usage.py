#!/usr/bin/env python3
"""Read-only CLI: audit Plan legacy dual-read tier usage (stage 5D.1)."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.platform.designer.publish.plan_legacy_dual_read_audit import (
    audit_catalog_payload,
    audit_draft_plan_view,
    plan_legacy_dual_read_audit_to_dict,
    summarize_plan_legacy_dual_read_audit,
)


def _load_latest_catalog_payloads(db) -> list[tuple[int, int, dict]]:
    rows = db.execute(
        text(
            """
            SELECT DISTINCT ON (tenant_id)
                tenant_id,
                catalog_version,
                payload
            FROM designer_metadata_snapshots
            ORDER BY tenant_id, catalog_version DESC
            """
        )
    ).fetchall()

    result: list[tuple[int, int, dict]] = []
    for tenant_id, catalog_version, payload in rows:
        if isinstance(payload, dict):
            result.append((tenant_id, catalog_version, payload))
    return result


def _load_workspace_by_view_id(db) -> dict[str, str]:
    rows = db.execute(
        text(
            """
            SELECT t.object_view_id::text AS view_id, w.title AS workspace_title
            FROM designer_workspace_tabs t
            JOIN designer_workspaces w ON w.id = t.workspace_id
            WHERE t.object_view_id IS NOT NULL
              AND t.deleted_at IS NULL
              AND w.deleted_at IS NULL
            """
        )
    ).fetchall()

    mapping: dict[str, str] = {}
    for view_id, workspace_title in rows:
        if view_id and workspace_title:
            mapping[str(view_id)] = str(workspace_title)
    return mapping


def _load_draft_plan_views(db) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT v.id::text AS view_id,
                   v.key AS view_key,
                   v.name AS view_name,
                   v.view_type,
                   v.tenant_id,
                   v.settings_json,
                   ot.key AS object_type_key
            FROM designer_view_definitions v
            JOIN designer_object_types ot ON ot.id = v.object_type_id
            WHERE v.view_type = 'plan'
              AND v.deleted_at IS NULL
            """
        )
    ).fetchall()

    result: list[dict] = []
    for row in rows:
        result.append(
            {
                "view_id": row.view_id,
                "view_key": row.view_key,
                "view_name": row.view_name,
                "view_type": row.view_type,
                "tenant_id": row.tenant_id,
                "object_type_key": row.object_type_key,
                "settings_json": row.settings_json if isinstance(row.settings_json, dict) else {},
            }
        )
    return result


def main() -> int:
    db = SessionLocal()
    try:
        workspace_by_view_id = _load_workspace_by_view_id(db)
        catalogs = _load_latest_catalog_payloads(db)

        all_published_entries = []
        catalog_version = None

        for tenant_id, version, payload in catalogs:
            summary = audit_catalog_payload(
                payload,
                tenant_id=tenant_id,
                workspace_by_view_id=workspace_by_view_id,
            )
            summary.catalog_version = version
            summary.audited_at = datetime.now(timezone.utc).isoformat()
            all_published_entries.extend(summary.entries)
            catalog_version = version

        from app.modules.platform.designer.publish.plan_legacy_usage_audit import (
            summarize_plan_legacy_usage,
        )

        published_summary = summarize_plan_legacy_usage(all_published_entries)
        published_summary.catalog_version = catalog_version
        published_summary.audited_at = datetime.now(timezone.utc).isoformat()

        draft_entries = []
        for row in _load_draft_plan_views(db):
            entry = audit_draft_plan_view(
                view_id=row["view_id"],
                view_key=row["view_key"],
                view_name=row["view_name"],
                view_type=row["view_type"],
                tenant_id=row["tenant_id"],
                object_type_key=row["object_type_key"],
                settings_json=row["settings_json"],
            )
            if entry is not None:
                draft_entries.append(entry)

        audit_summary = summarize_plan_legacy_dual_read_audit(
            published_summary=published_summary,
            draft_entries=draft_entries,
        )
        audit_summary.catalog_version = catalog_version
        audit_summary.audited_at = datetime.now(timezone.utc).isoformat()

        output = plan_legacy_dual_read_audit_to_dict(audit_summary)
        sys.stdout.buffer.write(
            json.dumps(output, ensure_ascii=False, indent=2).encode("utf-8")
        )
        sys.stdout.buffer.write(b"\n")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
