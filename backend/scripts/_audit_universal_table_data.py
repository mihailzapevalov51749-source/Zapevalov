"""Read-only audit: Universal Table data inventory (PR-3)."""

from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import text

from app.db.session import SessionLocal

LEGACY_BLOCK_TYPES = ("universal_table", "table", "tableBlock", "table_block")


def main() -> None:
    db = SessionLocal()
    try:
        counts: dict[str, object] = {}
        for table in (
            "universal_tables",
            "universal_table_rows",
            "universal_table_columns",
            "universal_views",
        ):
            counts[table] = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()

        counts["legacy_blocks"] = db.execute(
            text(
                "SELECT COUNT(*) FROM blocks WHERE type = ANY(:types)"
            ),
            {"types": list(LEGACY_BLOCK_TYPES)},
        ).scalar()

        pages = db.execute(
            text(
                """
                SELECT DISTINCT p.id, p.portal_id, p.title
                FROM pages p
                JOIN sections s ON s.page_id = p.id
                JOIN blocks b ON b.section_id = s.id
                WHERE b.type = ANY(:types)
                  AND (p.deleted_at IS NULL)
                ORDER BY p.portal_id, p.id
                """
            ),
            {"types": list(LEGACY_BLOCK_TYPES)},
        ).fetchall()

        nav = db.execute(
            text(
                """
                SELECT id, portal_id, title, page_id, is_visible
                FROM navigation_items
                WHERE type = 'universal_table'
                ORDER BY id
                """
            )
        ).fetchall()

        comments_ut = db.execute(
            text(
                "SELECT COUNT(*) FROM comments WHERE entity_type LIKE 'universal_table:%'"
            )
        ).scalar()

        orphan_tables = db.execute(
            text(
                """
                SELECT COUNT(*) FROM universal_tables ut
                WHERE ut.block_id IS NULL
                   OR ut.block_id NOT IN (SELECT id FROM blocks)
                """
            )
        ).scalar()

        tables_without_block = db.execute(
            text(
                """
                SELECT ut.id, ut.block_id, ut.title
                FROM universal_tables ut
                LEFT JOIN blocks b ON b.id = ut.block_id
                WHERE b.id IS NULL
                ORDER BY ut.id
                LIMIT 10
                """
            )
        ).fetchall()

        print("=== DB COUNTS ===")
        for key, value in counts.items():
            print(f"{key}: {value}")
        print(f"pages_with_legacy_blocks: {len(pages)}")
        print(f"comments_universal_table: {comments_ut}")
        print(f"orphan_universal_tables: {orphan_tables}")

        print("\n=== NAV universal_table ===")
        for row in nav:
            print(row)
        print(f"nav_count: {len(nav)}")

        print("\n=== PAGES WITH LEGACY BLOCKS ===")
        for row in pages:
            print(row)

        workspaces = db.execute(
            text(
                """
                SELECT w.id, w.tenant_id, w.title, w.home_page_id,
                       p.title AS page_title,
                       p.deleted_at IS NOT NULL AS page_deleted
                FROM designer_workspaces w
                LEFT JOIN pages p ON p.id = w.home_page_id
                WHERE w.home_page_id IN (
                    SELECT DISTINCT s.page_id
                    FROM blocks b
                    JOIN sections s ON s.id = b.section_id
                    WHERE b.type = ANY(:types)
                )
                ORDER BY w.tenant_id, w.id
                """
            ),
            {"types": list(LEGACY_BLOCK_TYPES)},
        ).fetchall()

        ut_page_ids = [r[0] for r in pages]
        pub_bindings = None
        for pub_table in (
            "designer_publication_page_bindings",
            "designer_publications",
            "publication_bindings",
        ):
            try:
                if ut_page_ids:
                    pub_bindings = db.execute(
                        text(
                            f"SELECT COUNT(*) FROM {pub_table} WHERE page_id = ANY(:page_ids)"
                        ),
                        {"page_ids": ut_page_ids},
                    ).scalar()
                    break
            except Exception:
                db.rollback()
                continue

        runtime_refs = db.execute(
            text(
                """
                SELECT COUNT(*) FROM runtime_entities
                WHERE object_type_key LIKE '%universal%'
                   OR id::text LIKE '%universal%'
                """
            )
        ).scalar()

        notes_ut = db.execute(
            text(
                "SELECT COUNT(*) FROM notes WHERE entity_type LIKE 'universal_table:%'"
            )
        ).scalar()

        checklist_ut = db.execute(
            text(
                "SELECT COUNT(*) FROM checklist_items WHERE entity_type LIKE 'universal_table:%'"
            )
        ).scalar()

        if tables_without_block:
            print("\n=== SAMPLE orphan tables (no block) ===")
            for row in tables_without_block:
                print(row)

        print(f"\nworkspaces_with_ut_home_page: {len(workspaces)}")
        print(f"publication_bindings_on_ut_pages: {pub_bindings}")
        for row in workspaces:
            print("workspace:", row)
        print(f"runtime_entity_universal_refs: {runtime_refs}")
        print(f"notes_universal_table: {notes_ut}")
        print(f"checklist_universal_table: {checklist_ut}")

        out = {
            "counts": counts,
            "pages_with_legacy_blocks": len(pages),
            "comments_universal_table": comments_ut,
            "orphan_universal_tables": orphan_tables,
            "pages": [
                {"page_id": r[0], "portal_id": r[1], "title": r[2]} for r in pages
            ],
            "navigation": [
                {
                    "nav_id": r[0],
                    "portal_id": r[1],
                    "title": r[2],
                    "page_id": r[3],
                    "is_visible": r[4],
                }
                for r in nav
            ],
            "publication_bindings_on_ut_pages": pub_bindings,
            "workspaces_on_ut_pages": [
                {
                    "workspace_id": r[0],
                    "tenant_id": r[1],
                    "title": r[2],
                    "home_page_id": r[3],
                    "page_title": r[4],
                    "page_deleted": r[5],
                }
                for r in workspaces
            ],
            "orphan_table_samples": [
                {"table_id": r[0], "block_id": r[1], "title": r[2]}
                for r in tables_without_block
            ],
        }
        out_path = Path(__file__).with_name("_audit_ut_data.json")
        out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nJSON written: {out_path}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
