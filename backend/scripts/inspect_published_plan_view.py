#!/usr/bin/env python3
"""Inspect published Plan view in latest catalog snapshot."""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import text

from app.db.session import SessionLocal


def main() -> int:
    tenant_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    view_key = sys.argv[2] if len(sys.argv) > 2 else "arhitektura"

    db = SessionLocal()
    try:
        row = db.execute(
            text(
                """
                SELECT catalog_version, payload
                FROM designer_metadata_snapshots
                WHERE tenant_id = :tenant_id
                ORDER BY catalog_version DESC
                LIMIT 1
                """
            ),
            {"tenant_id": tenant_id},
        ).fetchone()

        if not row:
            print("No snapshot", file=sys.stderr)
            return 1

        payload = row.payload or {}
        found = None
        for ot in payload.get("object_types") or []:
            for view in ot.get("views") or []:
                if str(view.get("key") or "") == view_key:
                    settings = view.get("settings_json") or {}
                    ov = settings.get("objectView") or {}
                    plan = (ov.get("presentation") or {}).get("plan") or {}
                    found = {
                        "catalog_version": row.catalog_version,
                        "object_type": ot.get("key"),
                        "view_key": view.get("key"),
                        "roleMapping": ov.get("roleMapping"),
                        "usesLegacyPlanFields": plan.get("usesLegacyPlanFields"),
                        "legacy": {
                            k: plan.get(k)
                            for k in (
                                "titleFieldKey",
                                "statusFieldKey",
                                "descriptionFieldKey",
                                "nextStepsFieldKey",
                            )
                            if plan.get(k)
                        },
                    }
                    break

        if not found:
            print(f"View {view_key} not found", file=sys.stderr)
            return 1

        sys.stdout.buffer.write(
            json.dumps(found, ensure_ascii=False, indent=2).encode("utf-8")
        )
        sys.stdout.buffer.write(b"\n")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
