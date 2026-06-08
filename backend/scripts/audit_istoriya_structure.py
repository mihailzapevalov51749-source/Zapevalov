#!/usr/bin/env python3
"""Deep audit of История object structure vs runtime data."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import text

from app.db.session import SessionLocal

TENANT_ID = 1
OBJECT_TYPE_KEY = "istoriya"


def main() -> int:
    db = SessionLocal()
    try:
        ot = db.execute(
            text(
                """
                SELECT id::text, key, name FROM designer_object_types
                WHERE tenant_id = :tenant_id AND key = :key AND deleted_at IS NULL
                """
            ),
            {"tenant_id": TENANT_ID, "key": OBJECT_TYPE_KEY},
        ).mappings().first()

        print("OBJECT TYPE:", dict(ot) if ot else "NOT FOUND")

        print("\n--- ACTIVE field_definitions ---")
        for row in db.execute(
            text(
                """
                SELECT key, name, field_type, sort_order, created_at
                FROM designer_field_definitions
                WHERE tenant_id = :tenant_id
                  AND object_type_id = CAST(:ot_id AS uuid)
                  AND deleted_at IS NULL
                ORDER BY sort_order, key
                """
            ),
            {"tenant_id": TENANT_ID, "ot_id": ot["id"]},
        ).mappings():
            print(f"  {row['key']}: {row['name']} ({row['field_type']})")

        print("\n--- DELETED field_definitions ---")
        deleted = db.execute(
            text(
                """
                SELECT key, name, field_type, deleted_at
                FROM designer_field_definitions
                WHERE tenant_id = :tenant_id
                  AND object_type_id = CAST(:ot_id AS uuid)
                  AND deleted_at IS NOT NULL
                ORDER BY deleted_at DESC, key
                """
            ),
            {"tenant_id": TENANT_ID, "ot_id": ot["id"]},
        ).mappings().all()
        if not deleted:
            print("  (none)")
        else:
            for row in deleted:
                print(f"  {row['key']}: {row['name']} deleted_at={row['deleted_at']}")

        print("\n--- ALL runtime field_keys (active entities) ---")
        for row in db.execute(
            text(
                """
                SELECT v.field_key, COUNT(*) AS cnt, COUNT(DISTINCT v.entity_id) AS entities
                FROM runtime_entity_values v
                JOIN runtime_entities e ON e.id = v.entity_id
                WHERE v.tenant_id = :tenant_id
                  AND e.object_type_key = :key
                  AND e.deleted_at IS NULL
                GROUP BY v.field_key
                ORDER BY v.field_key
                """
            ),
            {"tenant_id": TENANT_ID, "key": OBJECT_TYPE_KEY},
        ).mappings():
            print(f"  {row['field_key']}: values={row['cnt']}, entities={row['entities']}")

        print("\n--- Values for DELETED field keys ---")
        deleted_keys = [str(r["key"]) for r in deleted]
        if deleted_keys:
            for row in db.execute(
                text(
                    """
                    SELECT v.field_key, COUNT(*) AS cnt
                    FROM runtime_entity_values v
                    JOIN runtime_entities e ON e.id = v.entity_id
                    WHERE v.tenant_id = :tenant_id
                      AND e.object_type_key = :key
                      AND e.deleted_at IS NULL
                      AND v.field_key = ANY(:keys)
                    GROUP BY v.field_key
                    """
                ),
                {"tenant_id": TENANT_ID, "key": OBJECT_TYPE_KEY, "keys": deleted_keys},
            ).mappings():
                print(f"  {row['field_key']}: values={row['cnt']}")
        else:
            print("  (none)")

        print("\n--- Entity count ---")
        cnt = db.execute(
            text(
                """
                SELECT COUNT(*) FROM runtime_entities
                WHERE tenant_id = :tenant_id AND object_type_key = :key AND deleted_at IS NULL
                """
            ),
            {"tenant_id": TENANT_ID, "key": OBJECT_TYPE_KEY},
        ).scalar()
        print(f"  active entities: {cnt}")

        print("\n--- Recent entities (title) ---")
        for row in db.execute(
            text(
                """
                SELECT e.id::text, v.value_json #>> '{}' AS title, e.created_at
                FROM runtime_entities e
                LEFT JOIN runtime_entity_values v
                  ON v.entity_id = e.id AND v.field_key = 'nazvanie_sobytiya'
                WHERE e.tenant_id = :tenant_id
                  AND e.object_type_key = :key
                  AND e.deleted_at IS NULL
                ORDER BY e.created_at DESC
                LIMIT 20
                """
            ),
            {"tenant_id": TENANT_ID, "key": OBJECT_TYPE_KEY},
        ).mappings():
            print(f"  {row['created_at']}: {row['title']} ({row['id']})")

        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
