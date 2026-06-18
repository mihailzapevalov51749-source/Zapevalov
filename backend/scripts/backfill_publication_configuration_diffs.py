"""Backfill missing configuration diffs for publication offers.

Usage (from backend/):
  python scripts/backfill_publication_configuration_diffs.py
  python scripts/backfill_publication_configuration_diffs.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.tenant_module_configuration_diffs.generator import backfill_publication_configuration_diffs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill publication offer configuration diffs")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    db = SessionLocal()
    try:
        if args.dry_run:
            totals = backfill_publication_configuration_diffs(db, commit=False)
            db.rollback()
            print(json.dumps({"dry_run": True, **totals}, ensure_ascii=False, indent=2))
            return

        totals = backfill_publication_configuration_diffs(db, commit=True)
        print(json.dumps(totals, ensure_ascii=False, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
