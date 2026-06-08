#!/usr/bin/env python3
"""Remove runtime_entity_values for field_keys not in designer_field_definitions for История."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
sys.path.insert(0, str(SCRIPTS_ROOT))

from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.portals.models import Portal  # noqa: F401
from app.modules.users.models import User  # noqa: F401
from app.modules.platform.runtime.entities.models import RuntimeEntity  # noqa: F401
from platform_data_write_guard import require_platform_data_write_approval

TENANT_ID = 1
OBJECT_TYPE_KEY = "istoriya"


def fetch_object_type(db) -> dict | None:
    row = db.execute(
        text(
            """
            SELECT id::text, key, name
            FROM designer_object_types
            WHERE tenant_id = :tenant_id
              AND key = :object_type_key
              AND deleted_at IS NULL
            LIMIT 1
            """
        ),
        {"tenant_id": TENANT_ID, "object_type_key": OBJECT_TYPE_KEY},
    ).mappings().first()
    return dict(row) if row else None


def fetch_official_fields(db, object_type_id: str) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT key, name, field_type, sort_order
            FROM designer_field_definitions
            WHERE tenant_id = :tenant_id
              AND object_type_id = CAST(:object_type_id AS uuid)
              AND deleted_at IS NULL
            ORDER BY sort_order, key
            """
        ),
        {"tenant_id": TENANT_ID, "object_type_id": object_type_id},
    ).mappings().all()
    return [dict(row) for row in rows]


def fetch_orphan_stats(db, official_keys: set[str]) -> list[dict]:
    rows = db.execute(
        text(
            """
            SELECT
              v.field_key,
              COUNT(*) AS value_count,
              COUNT(DISTINCT v.entity_id) AS entity_count
            FROM runtime_entity_values v
            JOIN runtime_entities e ON e.id = v.entity_id
            WHERE v.tenant_id = :tenant_id
              AND e.tenant_id = :tenant_id
              AND e.object_type_key = :object_type_key
              AND e.deleted_at IS NULL
              AND v.field_key <> ALL(:official_keys)
            GROUP BY v.field_key
            ORDER BY v.field_key
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "object_type_key": OBJECT_TYPE_KEY,
            "official_keys": list(official_keys) if official_keys else [""],
        },
    ).mappings().all()
    return [dict(row) for row in rows]


def delete_orphan_values(db, official_keys: set[str]) -> int:
    result = db.execute(
        text(
            """
            DELETE FROM runtime_entity_values v
            USING runtime_entities e
            WHERE v.entity_id = e.id
              AND v.tenant_id = :tenant_id
              AND e.tenant_id = :tenant_id
              AND e.object_type_key = :object_type_key
              AND e.deleted_at IS NULL
              AND v.field_key <> ALL(:official_keys)
            """
        ),
        {
            "tenant_id": TENANT_ID,
            "object_type_key": OBJECT_TYPE_KEY,
            "official_keys": list(official_keys) if official_keys else [""],
        },
    )
    return int(result.rowcount or 0)


def verify_clean(db, official_keys: set[str]) -> list[dict]:
    return fetch_orphan_stats(db, official_keys)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Delete orphan values (requires YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1)",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        object_type = fetch_object_type(db)
        if not object_type:
            print(f"ERROR: object type '{OBJECT_TYPE_KEY}' not found", file=sys.stderr)
            return 1

        official_fields = fetch_official_fields(db, object_type["id"])
        official_keys = {str(row["key"]) for row in official_fields}

        if not official_keys:
            print("ERROR: no official fields found — aborting to avoid mass delete", file=sys.stderr)
            return 1

        print("=== OBJECT TYPE ===")
        print(json.dumps(object_type, ensure_ascii=False, indent=2))

        print("\n=== OFFICIAL FIELDS ===")
        for field in official_fields:
            print(
                f"  - {field['key']}: {field['name']} ({field['field_type']})"
            )

        orphans = fetch_orphan_stats(db, official_keys)
        total_values = sum(int(row["value_count"]) for row in orphans)
        total_entities = len(
            {
                entity_id
                for row in orphans
                for entity_id in []  # computed via SQL below
            }
        )

        entity_rows = db.execute(
            text(
                """
                SELECT COUNT(DISTINCT v.entity_id) AS entity_count
                FROM runtime_entity_values v
                JOIN runtime_entities e ON e.id = v.entity_id
                WHERE v.tenant_id = :tenant_id
                  AND e.object_type_key = :object_type_key
                  AND e.deleted_at IS NULL
                  AND v.field_key <> ALL(:official_keys)
                """
            ),
            {
                "tenant_id": TENANT_ID,
                "object_type_key": OBJECT_TYPE_KEY,
                "official_keys": list(official_keys) if official_keys else [""],
            },
        ).mappings().first()
        total_entities = int(entity_rows["entity_count"] if entity_rows else 0)

        print("\n=== ORPHAN FIELD KEYS ===")
        if not orphans:
            print("  (none)")
        else:
            for row in orphans:
                print(
                    f"  - {row['field_key']}: "
                    f"values={row['value_count']}, entities={row['entity_count']}"
                )

        print(f"\nTotal orphan values: {total_values}")
        print(f"Total affected entities: {total_entities}")

        if not args.execute:
            print("\nDry run only. Pass --execute to delete orphan values.")
            return 0

        require_platform_data_write_approval(script_name=Path(__file__).name)

        deleted = delete_orphan_values(db, official_keys)
        db.commit()

        print(f"\nDeleted orphan values: {deleted}")

        remaining = verify_clean(db, official_keys)
        if remaining:
            print("ERROR: orphan values still present:", file=sys.stderr)
            for row in remaining:
                print(f"  {row}", file=sys.stderr)
            return 1

        print("Verification OK: no orphan field_key values remain.")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
