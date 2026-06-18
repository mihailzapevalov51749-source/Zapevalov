"""Delete legacy demo_tehzak (portal_id=14) from yasnopro_dev only (WI-16).

Usage (from backend/):
  python scripts/cleanup_legacy_demo_tehzak.py --dry-run
  YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 python scripts/cleanup_legacy_demo_tehzak.py --execute --confirm
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv

load_dotenv(BACKEND_ROOT.parent / ".env")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.modules.company_database_provisioning.database_urls import build_database_url
from app.modules.control_plane.customer_companies.legacy_cleanup import (
    LEGACY_DATABASE_NAME,
    LEGACY_PORTAL_ID,
    LegacyCleanupError,
    build_legacy_cleanup_snapshot,
    delete_legacy_demo_tehzak,
    verify_legacy_demo_tehzak_removed,
)


def _open_dev_session():
    engine = create_engine(build_database_url(LEGACY_DATABASE_NAME))
    session = sessionmaker(bind=engine)()
    return engine, session


def main() -> int:
    parser = argparse.ArgumentParser(description="Cleanup legacy demo_tehzak from yasnopro_dev")
    parser.add_argument("--dry-run", action="store_true", help="Snapshot only, no deletes")
    parser.add_argument("--execute", action="store_true", help="Execute cleanup")
    parser.add_argument("--confirm", action="store_true", help="Required with --execute")
    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        parser.error("Specify --dry-run or --execute")

    if args.execute and not args.confirm:
        parser.error("--execute requires --confirm")

    if args.execute and os.environ.get("YASNOPRO_ALLOW_PLATFORM_DATA_WRITE") != "1":
        print("Refusing execute: set YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1")
        return 2

    engine, db = _open_dev_session()
    try:
        snapshot = build_legacy_cleanup_snapshot(db, portal_id=LEGACY_PORTAL_ID)
        print("=== Pre-Delete Snapshot ===")
        print(json.dumps(snapshot.to_dict(), ensure_ascii=False, indent=2))

        if args.dry_run:
            print("\nDry-run complete. No changes committed.")
            return 0

        deleted = delete_legacy_demo_tehzak(db, portal_id=LEGACY_PORTAL_ID)
        db.commit()
        print("\n=== Deleted Records ===")
        print(
            json.dumps(
                [
                    {
                        "entity": item.entity,
                        "id": item.record_id,
                        "portal_id": item.portal_id,
                        **item.extra,
                    }
                    for item in deleted
                ],
                ensure_ascii=False,
                indent=2,
            ),
        )

        verification = verify_legacy_demo_tehzak_removed(db, portal_id=LEGACY_PORTAL_ID)
        print("\n=== Post-Delete Verification ===")
        print(json.dumps(verification, ensure_ascii=False, indent=2))
        if not verification["cleanup_passed"]:
            print("Cleanup verification FAILED")
            return 1

        print("\nCleanup verification PASSED")
        return 0
    except LegacyCleanupError as exc:
        db.rollback()
        print(f"Cleanup blocked: {exc}")
        return 1
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
        engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())
