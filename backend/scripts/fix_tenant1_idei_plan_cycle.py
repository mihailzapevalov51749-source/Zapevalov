"""Fix corrupt plan-tree relation cycle for tenant 1 / idei / ierarhiya_idey."""

from __future__ import annotations

from sqlalchemy import text

from app.db.session import SessionLocal

TENANT_ID = 1
OBJECT_TYPE_KEY = "idei"
RELATION_KEY = "ierarhiya_idey"


def main() -> None:
    db = SessionLocal()

    try:
        anchor_rows = db.execute(
            text(
                """
                SELECT re.id::text
                FROM runtime_entities re
                JOIN runtime_entity_values rev
                  ON rev.entity_id = re.id
                 AND rev.field_key = 'nazvanie_idei'
                WHERE re.tenant_id = :tenant_id
                  AND re.object_type_key = :object_type_key
                  AND re.deleted_at IS NULL
                  AND re.is_system = TRUE
                  AND rev.value_json #>> '{}' = '__plan_tree_root__#ierarhiya_idey'
                ORDER BY re.created_at ASC
                """
            ),
            {"tenant_id": TENANT_ID, "object_type_key": OBJECT_TYPE_KEY},
        ).fetchall()

        anchor_ids = [str(row[0]) for row in anchor_rows]
        if not anchor_ids:
            print("No active plan root anchors found; nothing to fix.")
            return

        canonical_anchor_id = anchor_ids[0]
        duplicate_anchor_ids = anchor_ids[1:]

        removed_instances = db.execute(
            text(
                """
                UPDATE runtime_relation_instances
                SET deleted_at = NOW(), updated_at = NOW()
                WHERE tenant_id = :tenant_id
                  AND relation_key = :relation_key
                  AND deleted_at IS NULL
                  AND (
                    source_entity_id = target_entity_id
                    OR (
                      source_entity_id::text = ANY(:anchor_ids)
                      AND target_entity_id::text = ANY(:anchor_ids)
                    )
                  )
                RETURNING id::text
                """
            ),
            {
                "tenant_id": TENANT_ID,
                "relation_key": RELATION_KEY,
                "anchor_ids": anchor_ids,
            },
        ).fetchall()

        removed_entities = []
        if duplicate_anchor_ids:
            removed_entities = db.execute(
                text(
                    """
                    UPDATE runtime_entities
                    SET deleted_at = NOW(), updated_at = NOW()
                    WHERE tenant_id = :tenant_id
                      AND object_type_key = :object_type_key
                      AND deleted_at IS NULL
                      AND id::text = ANY(:duplicate_anchor_ids)
                    RETURNING id::text
                    """
                ),
                {
                    "tenant_id": TENANT_ID,
                    "object_type_key": OBJECT_TYPE_KEY,
                    "duplicate_anchor_ids": duplicate_anchor_ids,
                },
            ).fetchall()

        db.commit()

        print("canonical_anchor_id", canonical_anchor_id)
        print(
            "removed_relation_instances",
            [str(row[0]) for row in removed_instances],
        )
        print(
            "soft_deleted_duplicate_anchors",
            [str(row[0]) for row in removed_entities],
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
