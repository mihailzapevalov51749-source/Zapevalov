#!/usr/bin/env python3
"""Read-only CLI: audit published Plan views for legacy vs roleMapping usage."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.platform.designer.publish.plan_legacy_usage_audit import (
    audit_catalog_payload,
    plan_legacy_usage_to_dict,
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


def main() -> int:
    db = SessionLocal()
    try:
        workspace_by_view_id = _load_workspace_by_view_id(db)
        catalogs = _load_latest_catalog_payloads(db)

        all_entries = []
        catalog_version = None

        for tenant_id, version, payload in catalogs:
            summary = audit_catalog_payload(
                payload,
                tenant_id=tenant_id,
                workspace_by_view_id=workspace_by_view_id,
            )
            summary.catalog_version = version
            summary.audited_at = datetime.now(timezone.utc).isoformat()
            all_entries.extend(summary.entries)
            catalog_version = version

        from app.modules.platform.designer.publish.plan_legacy_usage_audit import (
            summarize_plan_legacy_usage,
        )

        combined = summarize_plan_legacy_usage(all_entries)
        combined.catalog_version = catalog_version
        combined.audited_at = datetime.now(timezone.utc).isoformat()

        output = plan_legacy_usage_to_dict(combined)
        sys.stdout.buffer.write(
            json.dumps(output, ensure_ascii=False, indent=2).encode("utf-8")
        )
        sys.stdout.buffer.write(b"\n")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
