"""Backfill tenant module configuration diffs for available offers."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.tenant_module_configuration_diffs.generator import (
    backfill_configuration_diffs_for_offers,
)


def main() -> None:
    db = SessionLocal()
    try:
        totals = backfill_configuration_diffs_for_offers(db, commit=True)
        print(totals)
    finally:
        db.close()


if __name__ == "__main__":
    main()
