"""Remove test tenants, keep canonical protected demo tenants.

Usage (from backend/):
  python scripts/tenant_cleanup_for_demo.py --dry-run
  python scripts/tenant_cleanup_for_demo.py --execute
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import func

from app.db.session import SessionLocal
from app.modules.platform_module_publications.models import PlatformModulePublication
from app.modules.platform_release.models import PlatformRelease, TenantUpdateOffer
from app.modules.portals.models import Portal
from app.modules.tenant_management.demo_tenant_inventory import (
    archive_non_protected_tenants,
    assert_demo_tenant_inventory,
    list_non_protected_active_portal_ids,
    resolve_protected_tenant_ids,
)
from app.modules.tenant_module_configuration_applies.models import TenantModuleConfigurationApply
from app.modules.tenant_module_configuration_diffs.models import TenantModuleConfigurationDiff
from app.modules.tenant_module_configuration_rollbacks.models import TenantModuleConfigurationRollback
from app.modules.tenant_module_configurations.models import (
    TenantModuleConfigSnapshot,
    TenantModuleConfiguration,
)
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews.models import TenantModuleUpdatePreview
from app.modules.tenant_modules.models import TenantModule
from app.modules.pages.models import Page
from app.modules.platform.designer.object_types.models import DesignerObjectType
from app.modules.platform.runtime.entities.models import RuntimeEntity


def dependency_counts(db, tenant_ids: list[int]) -> dict[str, int]:
    if not tenant_ids:
        return {}

    def count(model, column):
        return db.query(func.count()).filter(column.in_(tenant_ids)).scalar() or 0

    return {
        "tenant_modules": count(TenantModule, TenantModule.tenant_id),
        "tenant_module_configurations": count(
            TenantModuleConfiguration,
            TenantModuleConfiguration.tenant_id,
        ),
        "tenant_module_update_offers": count(
            TenantModuleUpdateOffer,
            TenantModuleUpdateOffer.tenant_id,
        ),
        "tenant_module_update_previews": count(
            TenantModuleUpdatePreview,
            TenantModuleUpdatePreview.tenant_id,
        ),
        "tenant_module_configuration_diffs": count(
            TenantModuleConfigurationDiff,
            TenantModuleConfigurationDiff.tenant_id,
        ),
        "tenant_module_configuration_applies": count(
            TenantModuleConfigurationApply,
            TenantModuleConfigurationApply.tenant_id,
        ),
        "tenant_module_configuration_rollbacks": count(
            TenantModuleConfigurationRollback,
            TenantModuleConfigurationRollback.tenant_id,
        ),
        "tenant_module_config_snapshots": count(
            TenantModuleConfigSnapshot,
            TenantModuleConfigSnapshot.tenant_id,
        ),
        "tenant_update_offers": count(TenantUpdateOffer, TenantUpdateOffer.tenant_id),
        "platform_releases_source": db.query(func.count())
        .select_from(PlatformRelease)
        .filter(PlatformRelease.source_tenant_id.in_(tenant_ids))
        .scalar()
        or 0,
        "platform_module_publications_source": db.query(func.count())
        .select_from(PlatformModulePublication)
        .filter(PlatformModulePublication.source_tenant_id.in_(tenant_ids))
        .scalar()
        or 0,
        "pages": count(Page, Page.portal_id),
        "object_types": count(DesignerObjectType, DesignerObjectType.tenant_id),
        "runtime_entities": count(RuntimeEntity, RuntimeEntity.tenant_id),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Cleanup test tenants for demo environment")
    parser.add_argument("--dry-run", action="store_true", help="Audit only, no deletes")
    parser.add_argument("--execute", action="store_true", help="Delete candidate tenants")
    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        parser.error("Specify --dry-run or --execute")

    db = SessionLocal()
    try:
        protected = resolve_protected_tenant_ids(db)
        portals = db.query(Portal).order_by(Portal.id.asc()).all()
        candidates = list_non_protected_active_portal_ids(db)
        print("PROTECTED TENANTS")
        for portal in portals:
            if portal.id in protected:
                print(
                    f"  id={portal.id} name={portal.name!r} type={portal.tenant_type} "
                    f"code={portal.code} protected={portal.is_protected} "
                    f"environment_role={portal.environment_role} reason={protected[portal.id]}"
                )

        print(f"\nINVENTORY total={len(portals)} protected={len(protected)} archive_candidates={len(candidates)}")

        candidate_ids = list(candidates)
        deps = dependency_counts(db, candidate_ids)
        print("\nAGGREGATE CANDIDATE DEPENDENCIES")
        for key, value in deps.items():
            print(f"  {key}: {value}")

        print("\nDRY RUN SAMPLE (first 5 archive candidates)")
        for portal_id in candidates[:5]:
            portal = db.query(Portal).filter(Portal.id == portal_id).one()
            row_deps = dependency_counts(db, [portal.id])
            release_refs = (
                db.query(func.count())
                .select_from(PlatformRelease)
                .filter(PlatformRelease.source_tenant_id == portal.id)
                .scalar()
                or 0
            )
            print(
                f"  id={portal.id} name={portal.name!r} "
                f"offers={row_deps['tenant_module_update_offers']} "
                f"release_source={release_refs} "
                f"pages={row_deps['pages']}"
            )
        print("  ... archive_tenant will mark tenant_status=ARCHIVED and is_active=false")

        if args.dry_run:
            print("\nData Impact Audit")
            print(f"Tables affected: portals")
            print(f"Rows before: {{'portals': {len(portals)}}}")
            print(f"Rows after: {{'portals': {len(portals)}}}")
            print(f"Rows to create: {{'portals': 0}}")
            print(f"Rows to update: {{'portals': {len(candidates)}}}")
            print(f"Rows to delete: {{'portals': 0}}")
            print(f"Protected rows touched: []")
            print("Destructive operation: none (archive only)")
            return 0

        archived = archive_non_protected_tenants(db)
        for item in archived:
            print(
                f"archived id={item.tenant_id} name={item.tenant_name!r} "
                f"status={item.tenant_status}"
            )

        remaining = db.query(Portal).order_by(Portal.id.asc()).all()
        print(f"\nEXECUTE archived={len(archived)} remaining={len(remaining)}")
        for portal in remaining:
            print(
                f"  remaining id={portal.id} name={portal.name!r} "
                f"type={portal.tenant_type} code={portal.code}"
            )

        try:
            assert_demo_tenant_inventory(db)
        except AssertionError as exc:
            print(f"INVENTORY CHECK FAILED: {exc}")
            return 1

        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
