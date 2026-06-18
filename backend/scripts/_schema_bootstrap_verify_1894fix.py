#!/usr/bin/env python3
"""Read-only verification for yasnopro_template schema bootstrap."""
from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
parsed = urlparse(os.environ["DATABASE_URL"])
TARGET_DB = "yasnopro_template"
EXPECTED_TABLES = 94
EXPECTED_ALEMBIC = "20260616_0076"

DATA_TABLES = (
    "portals",
    "users",
    "pages",
    "navigation_items",
    "designer_object_types",
    "runtime_entities",
    "runtime_entity_values",
    "platform_event_journal_entries",
)


def main() -> None:
    eng = create_engine(
        urlunparse(parsed._replace(path="/" + TARGET_DB)),
        isolation_level="AUTOCOMMIT",
    )
    out: dict = {"database": TARGET_DB}
    with eng.connect() as c:
        out["table_count"] = int(
            c.execute(
                text(
                    "SELECT COUNT(*) FROM information_schema.tables "
                    "WHERE table_schema='public' AND table_type='BASE TABLE'"
                )
            ).scalar()
            or 0
        )
        try:
            out["alembic_version"] = c.execute(
                text("SELECT version_num FROM alembic_version LIMIT 1")
            ).scalar()
        except Exception as exc:
            out["alembic_version"] = None
            out["alembic_error"] = str(exc)[:200]

        out["sequence_count"] = int(
            c.execute(
                text("SELECT COUNT(*) FROM pg_sequences WHERE schemaname='public'")
            ).scalar()
            or 0
        )
        out["constraint_count"] = int(
            c.execute(
                text(
                    """
                    SELECT COUNT(*) FROM information_schema.table_constraints
                    WHERE constraint_schema='public'
                    """
                )
            ).scalar()
            or 0
        )

        data_counts: dict[str, int | str] = {}
        for table in DATA_TABLES:
            try:
                data_counts[table] = int(c.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0)
            except Exception as exc:
                data_counts[table] = f"error: {exc.__class__.__name__}"
        out["data_counts"] = data_counts

        if out["table_count"] >= 1:
            out["test_cleanup_runs"] = int(
                c.execute(text("SELECT COUNT(*) FROM test_cleanup_runs")).scalar() or 0
            )
            out["test_cleanup_records"] = int(
                c.execute(text("SELECT COUNT(*) FROM test_cleanup_records")).scalar() or 0
            )
        else:
            out["test_cleanup_runs"] = None
            out["test_cleanup_records"] = None

    out["schema_ready"] = (
        out["table_count"] == EXPECTED_TABLES and out.get("alembic_version") == EXPECTED_ALEMBIC
    )
    out["data_empty"] = all(
        isinstance(v, int) and v == 0 for v in out["data_counts"].values()
    )
    out["ready_for_template_import"] = out["schema_ready"] and out["data_empty"]
    print(json.dumps(out, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
