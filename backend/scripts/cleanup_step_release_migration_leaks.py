"""Delete Step3–Step6 release migration test artifacts by explicit IDs.

Usage (from backend/):
  python scripts/cleanup_step_release_migration_leaks.py --dry-run
  python scripts/cleanup_step_release_migration_leaks.py --execute
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release.models import PlatformRelease, ReleaseChange, TenantUpdateOffer
from app.modules.platform_release_package_registry.models import PlatformReleasePackage

# Leaked from integration tests Step3 / Step5 / review-flow (identified 2026-06-16).
PACKAGE_IDS = [9, 19, 40, 42, 43, 44, 48]
BUILD_IDS = [9, 19, 40, 42, 43, 44, 48]
DEPLOYMENT_IDS = [3, 4, 5, 10]
LEGACY_RELEASE_IDS = [
    19,
    45,
    49,
    50,
    51,
    52,
    53,
    54,
    56,
    57,
    58,
    67,
    69,
    70,
    71,
    583,
    584,
    585,
    586,
]


def _count_existing(db, model, ids: list[int]) -> list[int]:
    if not ids:
        return []
    found = [row.id for row in db.query(model).filter(model.id.in_(ids)).all()]
    return sorted(found)


def run(*, execute: bool) -> dict[str, list[int]]:
    db = SessionLocal()
    try:
        package_ids = _count_existing(db, PlatformReleasePackage, PACKAGE_IDS)
        build_ids = _count_existing(db, PlatformCodeBuild, BUILD_IDS)
        deployment_ids = _count_existing(db, PlatformDeployment, DEPLOYMENT_IDS)
        legacy_release_ids = _count_existing(db, PlatformRelease, LEGACY_RELEASE_IDS)

        tenant_ids = sorted(
            {
                row.target_tenant_id
                for row in db.query(PlatformDeployment)
                .filter(PlatformDeployment.id.in_(deployment_ids))
                .all()
                if row.target_tenant_id is not None
            }
        )

        plan = {
            "package_ids": package_ids,
            "build_ids": build_ids,
            "deployment_ids": deployment_ids,
            "legacy_release_ids": legacy_release_ids,
            "tenant_ids": tenant_ids,
        }

        if not execute:
            return plan

        if deployment_ids:
            db.query(PlatformDeployment).filter(PlatformDeployment.id.in_(deployment_ids)).delete(
                synchronize_session=False
            )

        all_release_ids = sorted(set(package_ids + legacy_release_ids))
        if all_release_ids:
            db.query(TenantUpdateOffer).filter(
                TenantUpdateOffer.release_id.in_(all_release_ids)
            ).delete(synchronize_session=False)
            db.query(ReleaseChange).filter(ReleaseChange.release_id.in_(legacy_release_ids)).delete(
                synchronize_session=False
            )
            db.query(PlatformRelease).filter(PlatformRelease.id.in_(legacy_release_ids)).delete(
                synchronize_session=False
            )
            db.query(PlatformReleasePackage).filter(
                PlatformReleasePackage.id.in_(package_ids)
            ).delete(synchronize_session=False)

        if build_ids:
            db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id.in_(build_ids)).delete(
                synchronize_session=False
            )

        db.commit()
        return plan
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.execute == args.dry_run:
        parser.error("Specify exactly one of --dry-run or --execute")

    plan = run(execute=args.execute)
    mode = "EXECUTE" if args.execute else "DRY-RUN"
    print(f"[{mode}] cleanup_step_release_migration_leaks")
    for key, value in plan.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
