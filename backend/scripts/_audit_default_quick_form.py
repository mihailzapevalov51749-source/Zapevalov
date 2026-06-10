"""One-off audit: default_quick_form views per tenant/object type."""

from __future__ import annotations

from sqlalchemy import text

from app.db.session import SessionLocal
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.portals.models import Portal  # noqa: F401 — ORM metadata for FK resolution
from app.modules.platform.designer.view_definitions.service import (
    ensure_default_quick_form_view,
)


def main() -> None:
    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
                SELECT
                    ot.tenant_id,
                    ot.key AS object_type_key,
                    COUNT(v.id) FILTER (
                        WHERE v.key = 'default_quick_form' AND v.deleted_at IS NULL
                    ) AS quick_form_count
                FROM designer_object_types ot
                LEFT JOIN designer_view_definitions v
                    ON v.object_type_id = ot.id
                WHERE ot.deleted_at IS NULL
                GROUP BY ot.tenant_id, ot.key, ot.id
                ORDER BY ot.tenant_id, ot.key
                """
            )
        ).mappings().all()

        dups = db.execute(
            text(
                """
                SELECT tenant_id, object_type_id::text, key, COUNT(*) AS cnt
                FROM designer_view_definitions
                WHERE key = 'default_quick_form' AND deleted_at IS NULL
                GROUP BY tenant_id, object_type_id, key
                HAVING COUNT(*) > 1
                """
            )
        ).mappings().all()

        missing = [r for r in rows if int(r["quick_form_count"] or 0) == 0]
        print("TOTAL_OBJECT_TYPES", len(rows))
        print("MISSING_QUICK_FORM", len(missing))
        for r in missing:
            print("MISSING", r["tenant_id"], r["object_type_key"])
        print("DUPLICATES", len(dups))
        for r in dups:
            print("DUP", dict(r))
        with_qc = db.execute(
            text(
                """
                SELECT ot.tenant_id, ot.key AS object_type_key,
                       COUNT(f.id) FILTER (WHERE f.quick_create IS TRUE) AS quick_create_fields
                FROM designer_object_types ot
                LEFT JOIN designer_field_definitions f
                    ON f.object_type_id = ot.id AND f.deleted_at IS NULL
                WHERE ot.deleted_at IS NULL
                GROUP BY ot.tenant_id, ot.key, ot.id
                HAVING COUNT(f.id) FILTER (WHERE f.quick_create IS TRUE) > 0
                   AND NOT EXISTS (
                       SELECT 1 FROM designer_view_definitions v
                       WHERE v.object_type_id = ot.id
                         AND v.key = 'default_quick_form'
                         AND v.deleted_at IS NULL
                   )
                ORDER BY ot.tenant_id, ot.key
                """
            )
        ).mappings().all()
        print("MISSING_BUT_HAS_QUICK_CREATE", len(with_qc))
        for r in with_qc:
            print("NEEDS_ENSURE", r["tenant_id"], r["object_type_key"], r["quick_create_fields"])

        print("---TABLE---")
        for r in rows:
            print(f"{r['tenant_id']}\t{r['object_type_key']}\t{r['quick_form_count']}")

        created = 0
        for object_type in (
            db.query(DesignerObjectType)
            .filter(DesignerObjectType.deleted_at.is_(None))
            .order_by(DesignerObjectType.tenant_id, DesignerObjectType.key)
            .all()
        ):
            before = db.execute(
                text(
                    """
                    SELECT COUNT(*) FROM designer_view_definitions
                    WHERE object_type_id = :object_type_id
                      AND key = 'default_quick_form'
                      AND deleted_at IS NULL
                    """
                ),
                {"object_type_id": object_type.id},
            ).scalar()
            result = ensure_default_quick_form_view(
                db,
                object_type.tenant_id,
                object_type.id,
            )
            if result is not None and int(before or 0) == 0:
                created += 1
        if created:
            db.commit()
            print("ENSURE_CREATED", created)

        post_rows = db.execute(
            text(
                """
                SELECT
                    ot.tenant_id,
                    ot.key AS object_type_key,
                    COUNT(v.id) FILTER (
                        WHERE v.key = 'default_quick_form' AND v.deleted_at IS NULL
                    ) AS quick_form_count
                FROM designer_object_types ot
                LEFT JOIN designer_view_definitions v
                    ON v.object_type_id = ot.id
                WHERE ot.deleted_at IS NULL
                GROUP BY ot.tenant_id, ot.key, ot.id
                ORDER BY ot.tenant_id, ot.key
                """
            )
        ).mappings().all()
        post_dups = db.execute(
            text(
                """
                SELECT COUNT(*) FROM (
                    SELECT tenant_id, object_type_id
                    FROM designer_view_definitions
                    WHERE key = 'default_quick_form' AND deleted_at IS NULL
                    GROUP BY tenant_id, object_type_id
                    HAVING COUNT(*) > 1
                ) t
                """
            )
        ).scalar()
        print("POST_DUPLICATES", int(post_dups or 0))
        print("---POST_TABLE---")
        for r in post_rows:
            print(f"{r['tenant_id']}\t{r['object_type_key']}\t{r['quick_form_count']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
