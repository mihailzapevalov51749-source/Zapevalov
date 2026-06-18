"""Audit test cleanup registry — gate before declaring Cleanup PASSED."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.test_cleanup_registry.service import (
    assert_cleanup_registry_empty,
    count_active_cleanup_runs,
    count_undeleted_cleanup_records,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit test cleanup registry state")
    parser.parse_args()

    db = SessionLocal()
    try:
        active_runs = count_active_cleanup_runs(db)
        undeleted = count_undeleted_cleanup_records(db)
        report = {
            "active_cleanup_runs": active_runs,
            "undeleted_cleanup_records": undeleted,
            "cleanup_status": "PASSED" if active_runs == 0 and undeleted == 0 else "FAILED",
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        assert_cleanup_registry_empty(db)
        return 0
    except AssertionError:
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
