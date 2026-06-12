"""Audit platform_event_journal_entries scope distribution."""

from sqlalchemy import text

from app.db.session import SessionLocal


def main() -> None:
    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
                SELECT scope, source, tenant_id, event_category, COUNT(*) AS cnt
                FROM platform_event_journal_entries
                GROUP BY scope, source, tenant_id, event_category
                ORDER BY scope, source, tenant_id, event_category
                """
            )
        ).fetchall()
        print("=== GROUP BY stats ===")
        for row in rows:
            print(dict(row._mapping))

        total = db.execute(text("SELECT COUNT(*) FROM platform_event_journal_entries")).scalar()
        print("total", total)

        legacy = db.execute(
            text(
                """
                SELECT id, title, slug, source, scope, tenant_id
                FROM platform_event_journal_entries
                WHERE scope = 'legacy'
                ORDER BY id
                LIMIT 15
                """
            )
        ).fetchall()
        print("=== legacy sample ===")
        for row in legacy:
            print(dict(row._mapping))

        platform = db.execute(
            text(
                """
                SELECT id, title, slug, tenant_id, event_type
                FROM platform_event_journal_entries
                WHERE scope = 'platform'
                ORDER BY id
                """
            )
        ).fetchall()
        print("=== platform entries ===")
        for row in platform:
            print(dict(row._mapping))

        tenant_count = db.execute(
            text("SELECT COUNT(*) FROM platform_event_journal_entries WHERE scope = 'tenant'")
        ).scalar()
        print("tenant count", tenant_count)

        portals = db.execute(
            text("SELECT id, code, name FROM portals ORDER BY id LIMIT 20")
        ).fetchall()
        print("=== portals ===")
        for row in portals:
            print(dict(row._mapping))
    finally:
        db.close()


if __name__ == "__main__":
    main()
