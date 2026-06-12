"""Read-only audit: Universal Table schema dependencies (PR-3C)."""

from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import text

from app.db.session import SessionLocal

TABLES = (
    "universal_tables",
    "universal_table_rows",
    "universal_table_columns",
    "universal_views",
)


def main() -> None:
    db = SessionLocal()
    try:
        table_exists = {
            table: bool(
                db.execute(
                    text(
                        """
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = 'public' AND table_name = :table
                        )
                        """
                    ),
                    {"table": table},
                ).scalar()
            )
            for table in TABLES
        }
        counts = {
            table: (
                int(db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar())
                if table_exists[table]
                else None
            )
            for table in TABLES
        }

        fks = db.execute(
            text(
                """
                SELECT
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name,
                    tc.constraint_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                 AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND (
                    tc.table_name = ANY(:tables)
                    OR ccu.table_name = ANY(:tables)
                  )
                  AND tc.table_schema = 'public'
                ORDER BY tc.table_name, kcu.column_name
                """
            ),
            {"tables": list(TABLES)},
        ).fetchall()

        indexes = db.execute(
            text(
                """
                SELECT tablename, indexname, indexdef
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND tablename = ANY(:tables)
                ORDER BY tablename, indexname
                """
            ),
            {"tables": list(TABLES)},
        ).fetchall()

        views = db.execute(
            text(
                """
                SELECT schemaname, viewname, definition
                FROM pg_views
                WHERE schemaname = 'public'
                  AND (
                    definition ILIKE '%universal_tables%'
                    OR definition ILIKE '%universal_table_rows%'
                    OR definition ILIKE '%universal_table_columns%'
                    OR definition ILIKE '%universal_views%'
                  )
                ORDER BY viewname
                """
            )
        ).fetchall()

        matviews = db.execute(
            text(
                """
                SELECT schemaname, matviewname, definition
                FROM pg_matviews
                WHERE schemaname = 'public'
                  AND (
                    definition ILIKE '%universal_tables%'
                    OR definition ILIKE '%universal_table_rows%'
                    OR definition ILIKE '%universal_table_columns%'
                    OR definition ILIKE '%universal_views%'
                  )
                ORDER BY matviewname
                """
            )
        ).fetchall()

        triggers = db.execute(
            text(
                """
                SELECT event_object_table, trigger_name, action_timing, event_manipulation
                FROM information_schema.triggers
                WHERE event_object_schema = 'public'
                  AND event_object_table = ANY(:tables)
                ORDER BY event_object_table, trigger_name
                """
            ),
            {"tables": list(TABLES)},
        ).fetchall()

        routines = db.execute(
            text(
                """
                SELECT routine_name, routine_type
                FROM information_schema.routines
                WHERE routine_schema = 'public'
                  AND (
                    routine_definition ILIKE '%universal_tables%'
                    OR routine_definition ILIKE '%universal_table_rows%'
                    OR routine_definition ILIKE '%universal_table_columns%'
                    OR routine_definition ILIKE '%universal_views%'
                  )
                ORDER BY routine_name
                """
            )
        ).fetchall()

        out = {
            "counts": counts,
            "table_exists": table_exists,
            "foreign_keys": [
                {
                    "table": r[0],
                    "column": r[1],
                    "references": f"{r[2]}.{r[3]}",
                    "constraint": r[4],
                }
                for r in fks
            ],
            "indexes": [
                {"table": r[0], "name": r[1], "definition": r[2]} for r in indexes
            ],
            "views": [{"name": r[1], "definition": r[2][:200]} for r in views],
            "materialized_views": [
                {"name": r[1], "definition": r[2][:200]} for r in matviews
            ],
            "triggers": [
                {
                    "table": r[0],
                    "name": r[1],
                    "timing": r[2],
                    "event": r[3],
                }
                for r in triggers
            ],
            "routines": [{"name": r[0], "type": r[1]} for r in routines],
        }

        out_path = Path(__file__).with_name("_audit_ut_schema.json")
        out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(out, ensure_ascii=False, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
