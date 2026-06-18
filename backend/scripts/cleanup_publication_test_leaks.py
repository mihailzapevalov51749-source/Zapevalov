"""Dry-run / execute cleanup of leaked publication/module/provisioning test data.

Usage (from backend/):
  python scripts/cleanup_publication_test_leaks.py --dry-run
  YASNOPRO_ALLOW_TENANT_HARD_DELETE=1 python scripts/cleanup_publication_test_leaks.py --execute --confirm
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.platform_module_publications.models import PlatformModulePublication
from app.modules.platform_release.models import PlatformRelease, ReleaseChange, TenantUpdateOffer
from app.modules.platform_modules.version_models import PlatformModuleVersion, PlatformReleaseModule
from app.modules.portals.models import Portal
from app.modules.tenant_module_configuration_applies.models import TenantModuleConfigurationApply
from app.modules.tenant_module_configuration_diffs.models import TenantModuleConfigurationDiff
from app.modules.tenant_module_configuration_rollbacks.models import TenantModuleConfigurationRollback
from app.modules.tenant_module_configurations.models import (
    TenantModuleConfigSnapshot,
    TenantModuleConfiguration,
)
from app.modules.tenant_module_update_offers.models import TenantModuleUpdateOffer
from app.modules.tenant_module_update_previews.models import TenantModuleUpdatePreview
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)
from app.modules.tenant_modules.models import TenantModule
from app.modules.tenant_users.models import TenantUserMembership, TenantUserProfile
from app.modules.users.models import User

PROTECTED_PORTAL_IDS = frozenset({1, 2, 21})
PLATFORM_OWNER_EMAIL = "zmn8@ya.ru"

PORTAL_NAME_PATTERNS = (
    r"^Publication\s",
    r"^PubGuard(\s+P1)?\s",
    r"^PubGuard CompanyCtor\s",
    r"^Provisioning test\s",
    r"^Module config apply\s",
    r"^Module config diff\s",
    r"^Module config rollback\s",
    r"^Module offers\s",
    r"^Module previews\s",
    r"^Module versions\s",
    r"^Portal modules\s",
    r"^Portal configs\s",
    r"^Company modules\s",
    r"^Company configs\s",
    r"^Tenant modules\s",
    r"^Pages registry\s",
    r"^Nav edit\s",
    r"^Trash purge\s",
    r"^Protected backfill\s",
    r"^Protected dup\s",
    r"^Menu settings key resolution\s",
    r"^Write Policy\s",
    r"^DocLib ISO\s",
    r"\sISO\s[0-9a-f]{6,8}$",
    r"^Test\s+(DEV|TEMPLATE|CLIENT)\s",
)

PORTAL_CODE_PREFIXES = (
    "pub-",
    "pub-guard-",
    "pub-guard-company-ctor-",
    "prov-",
    "module-config-apply-",
    "module-config-diff-",
    "module-config-rollback-",
    "module-offers-",
    "module-previews-",
    "module-versions-",
    "write-policy-",
    "tenant-modules-",
    "doclib_iso_",
    "pages-registry-",
    "nav-edit-",
    "trash-",
    "prot-",
    "prot-dup-",
    "menu-settings-",
    "login-brand-",
)

TEST_USER_EMAIL_SUFFIX = "@test.local"
TEST_RELEASE_VERSION_PREFIX = "test-release"
TEST_VERSION_NUMERIC_SEGMENT_LIMIT = 99_999

RELEASE_PACKAGE_TITLE_PATTERNS = (
    re.compile(r"^Review flow\b", re.I),
    re.compile(r"^Count\b", re.I),
    re.compile(r"^Step\d", re.I),
    re.compile(r"^Step3\b", re.I),
    re.compile(r"^Step4\b", re.I),
    re.compile(r"^Step5\b", re.I),
    re.compile(r"^Step6\b", re.I),
)


def _version_is_test_pollution(version: str) -> bool:
    parts = str(version or "").split(".")
    if len(parts) != 3:
        return False
    for part in parts:
        try:
            if int(part) > TEST_VERSION_NUMERIC_SEGMENT_LIMIT:
                return True
        except ValueError:
            return False
    return False


@dataclass
class CleanupPlan:
    portal_ids: list[int] = field(default_factory=list)
    user_ids: list[int] = field(default_factory=list)
    release_ids: list[int] = field(default_factory=list)
    publication_ids: list[int] = field(default_factory=list)
    module_version_ids: list[int] = field(default_factory=list)
    package_ids: list[int] = field(default_factory=list)
    build_ids: list[int] = field(default_factory=list)
    deployment_ids: list[int] = field(default_factory=list)
    counts_by_table: dict[str, int] = field(default_factory=dict)
    portal_samples: list[dict] = field(default_factory=list)
    protected_checks: dict[str, object] = field(default_factory=dict)


def _portal_is_test_candidate(portal: Portal) -> bool:
    if portal.id in PROTECTED_PORTAL_IDS:
        return False
    name = str(portal.name or "")
    code = str(portal.code or "")
    for pattern in PORTAL_NAME_PATTERNS:
        if re.search(pattern, name):
            return True
    for prefix in PORTAL_CODE_PREFIXES:
        if code.startswith(prefix):
            return True
    if name.startswith("Publication "):
        return True
    return False


def _user_is_test_candidate(user: User) -> bool:
    email = str(user.email or "").strip().lower()
    if email == PLATFORM_OWNER_EMAIL.lower():
        return False
    if email.endswith(TEST_USER_EMAIL_SUFFIX):
        return True
    if email.startswith("module_config_apply_"):
        return True
    if email.startswith("module_config_diff_"):
        return True
    if email.startswith("module_offers_"):
        return True
    if email.startswith("module_previews_"):
        return True
    if email.startswith("module_versions_"):
        return True
    if email.startswith("tenant_modules_"):
        return True
    if email.startswith("doclib_iso_"):
        return True
    return False


def _package_title_is_test_leak(title: str) -> bool:
    return any(pattern.search(str(title or "")) for pattern in RELEASE_PACKAGE_TITLE_PATTERNS)


def _build_is_test_leak(build: PlatformCodeBuild) -> bool:
    manifest = build.build_manifest_json or {}
    return manifest.get("created_via") == "platform_releases_api_adapter"


def _release_is_test_candidate(release: PlatformRelease) -> bool:
    version = str(release.version or "")
    title = str(release.title or "")
    if version.startswith(TEST_RELEASE_VERSION_PREFIX):
        return True
    if title == "Module config apply release":
        return True
    if title == "Module config diff release":
        return True
    if title.startswith("Module config "):
        return True
    return False


def build_cleanup_plan(db: Session) -> CleanupPlan:
    plan = CleanupPlan()

    portals = db.query(Portal).order_by(Portal.id.asc()).all()
    for portal in portals:
        if _portal_is_test_candidate(portal):
            plan.portal_ids.append(int(portal.id))
            if len(plan.portal_samples) < 20:
                plan.portal_samples.append(
                    {
                        "id": portal.id,
                        "name": portal.name,
                        "code": portal.code,
                        "tenant_type": portal.tenant_type,
                        "reason": "name/code test pattern",
                    }
                )

    portal_id_set = set(plan.portal_ids)

    users = db.query(User).all()
    for user in users:
        if _user_is_test_candidate(user):
            if user.tenant_id is None or int(user.tenant_id) not in PROTECTED_PORTAL_IDS:
                plan.user_ids.append(int(user.id))

    releases = db.query(PlatformRelease).all()
    for release in releases:
        if _release_is_test_candidate(release):
            plan.release_ids.append(int(release.id))
        elif release.source_tenant_id in portal_id_set or release.target_template_tenant_id in portal_id_set:
            plan.release_ids.append(int(release.id))

    plan.release_ids = sorted(set(plan.release_ids))

    publications = db.query(PlatformModulePublication).all()
    for publication in publications:
        if (
            int(publication.source_tenant_id) in portal_id_set
            or int(publication.target_tenant_id) in portal_id_set
        ):
            plan.publication_ids.append(int(publication.id))
    plan.publication_ids = sorted(set(plan.publication_ids))

    release_id_set = set(plan.release_ids)
    for row in db.query(PlatformModuleVersion).all():
        version = str(row.version or "")
        if _version_is_test_pollution(version):
            plan.module_version_ids.append(int(row.id))
        elif row.release_id is not None and int(row.release_id) in release_id_set:
            plan.module_version_ids.append(int(row.id))
    plan.module_version_ids = sorted(set(plan.module_version_ids))

    package_build_ids: set[int] = set()
    for package in db.query(PlatformReleasePackage).all():
        manifest = package.package_manifest_json or {}
        title = str(manifest.get("title") or "")
        if _package_title_is_test_leak(title):
            plan.package_ids.append(int(package.id))
            if package.build_id is not None:
                package_build_ids.add(int(package.build_id))
    plan.package_ids = sorted(set(plan.package_ids))

    linked_build_ids = {
        int(row.build_id)
        for row in db.query(PlatformReleasePackage.build_id)
        .filter(PlatformReleasePackage.build_id.isnot(None))
        .all()
        if row.build_id is not None
    }
    for build in db.query(PlatformCodeBuild).all():
        if int(build.id) in package_build_ids:
            plan.build_ids.append(int(build.id))
        elif _build_is_test_leak(build) and int(build.id) not in linked_build_ids:
            plan.build_ids.append(int(build.id))
    plan.build_ids = sorted(set(plan.build_ids))

    if plan.package_ids:
        plan.deployment_ids = sorted(
            {
                int(row.id)
                for row in db.query(PlatformDeployment.id)
                .filter(PlatformDeployment.release_package_id.in_(plan.package_ids))
                .all()
            }
        )

    # count related rows
    tenant_ids = sorted(portal_id_set)
    if tenant_ids:
        plan.counts_by_table = {
            "portals": len(tenant_ids),
            "tenant_modules": db.query(TenantModule).filter(TenantModule.tenant_id.in_(tenant_ids)).count(),
            "tenant_module_configurations": db.query(TenantModuleConfiguration)
            .filter(TenantModuleConfiguration.tenant_id.in_(tenant_ids))
            .count(),
            "tenant_module_update_offers": db.query(TenantModuleUpdateOffer)
            .filter(TenantModuleUpdateOffer.tenant_id.in_(tenant_ids))
            .count(),
            "tenant_module_configuration_diffs": db.query(TenantModuleConfigurationDiff)
            .filter(TenantModuleConfigurationDiff.tenant_id.in_(tenant_ids))
            .count(),
            "tenant_module_update_previews": db.query(TenantModuleUpdatePreview)
            .filter(TenantModuleUpdatePreview.tenant_id.in_(tenant_ids))
            .count(),
            "tenant_module_configuration_applies": db.query(TenantModuleConfigurationApply)
            .filter(TenantModuleConfigurationApply.tenant_id.in_(tenant_ids))
            .count(),
            "tenant_module_configuration_rollbacks": db.query(TenantModuleConfigurationRollback)
            .filter(TenantModuleConfigurationRollback.tenant_id.in_(tenant_ids))
            .count(),
            "tenant_module_config_snapshots": db.query(TenantModuleConfigSnapshot)
            .filter(TenantModuleConfigSnapshot.tenant_id.in_(tenant_ids))
            .count(),
            "tenant_user_memberships": db.query(TenantUserMembership)
            .filter(TenantUserMembership.tenant_id.in_(tenant_ids))
            .count(),
            "tenant_user_profiles": db.query(TenantUserProfile)
            .filter(TenantUserProfile.tenant_id.in_(tenant_ids))
            .count(),
            "platform_module_publications": len(plan.publication_ids),
            "platform_releases": len(plan.release_ids),
            "platform_module_versions": len(plan.module_version_ids),
            "tenant_update_offers": db.query(TenantUpdateOffer)
            .filter(TenantUpdateOffer.tenant_id.in_(tenant_ids))
            .count(),
            "test_users": len(plan.user_ids),
            "platform_release_packages": len(plan.package_ids),
            "platform_code_builds": len(plan.build_ids),
            "platform_deployments": len(plan.deployment_ids),
        }

    dev = db.query(Portal).filter(Portal.id == 1).one_or_none()
    template = db.query(Portal).filter(Portal.id == 2).one_or_none()
    rozetka = db.query(Portal).filter(Portal.id == 21).one_or_none()
    owner = db.query(User).filter(User.email == PLATFORM_OWNER_EMAIL).one_or_none()
    plan.protected_checks = {
        "DEV_exists": dev is not None,
        "Template_exists": template is not None,
        "Rozetka_exists": rozetka is not None,
        "Platform_Owner_exists": owner is not None,
        "Platform_Owner_tenant_id": owner.tenant_id if owner is not None else None,
        "protected_portal_ids_in_delete_set": sorted(set(plan.portal_ids) & PROTECTED_PORTAL_IDS),
    }
    return plan


def _delete_module_publication_chain(db: Session, publication_ids: list[int]) -> None:
    if not publication_ids:
        return
    offer_ids = [
        row.id
        for row in db.query(TenantModuleUpdateOffer.id)
        .filter(TenantModuleUpdateOffer.publication_id.in_(publication_ids))
        .all()
    ]
    if offer_ids:
        db.query(TenantModuleUpdatePreview).filter(
            TenantModuleUpdatePreview.offer_id.in_(offer_ids)
        ).delete(synchronize_session=False)
        db.query(TenantModuleConfigurationDiff).filter(
            TenantModuleConfigurationDiff.offer_id.in_(offer_ids)
        ).delete(synchronize_session=False)
        db.query(TenantModuleUpdateOffer).filter(
            TenantModuleUpdateOffer.id.in_(offer_ids)
        ).delete(synchronize_session=False)
    db.query(PlatformModulePublication).filter(
        PlatformModulePublication.id.in_(publication_ids)
    ).delete(synchronize_session=False)


def _delete_module_versions(db: Session, version_ids: list[int]) -> None:
    if not version_ids:
        return
    db.query(PlatformModuleVersion).filter(PlatformModuleVersion.id.in_(version_ids)).delete(
        synchronize_session=False
    )


def _delete_platform_version_registry_for_tenant(db: Session, tenant_id: int) -> None:
    db.query(PlatformVersionHistory).filter(PlatformVersionHistory.tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    db.query(PlatformEnvironmentVersion).filter(
        PlatformEnvironmentVersion.tenant_id == tenant_id
    ).delete(synchronize_session=False)


def _delete_package_release_chain(db: Session, package_ids: list[int]) -> None:
    if not package_ids:
        return
    from app.modules.platform_event_journal.models import PlatformEventJournalEntry

    db.query(TenantUpdateOffer).filter(TenantUpdateOffer.release_id.in_(package_ids)).delete(
        synchronize_session=False
    )
    deployment_tenant_ids = sorted(
        {
            int(row.target_tenant_id)
            for row in db.query(PlatformDeployment.target_tenant_id)
            .filter(PlatformDeployment.release_package_id.in_(package_ids))
            .all()
            if row.target_tenant_id is not None
        }
    )
    db.query(PlatformDeployment).filter(
        PlatformDeployment.release_package_id.in_(package_ids)
    ).delete(synchronize_session=False)
    for tenant_id in deployment_tenant_ids:
        _delete_platform_version_registry_for_tenant(db, tenant_id)
    for package_id in package_ids:
        db.query(PlatformEventJournalEntry).filter(
            PlatformEventJournalEntry.slug.like(f"%{package_id}%")
        ).delete(synchronize_session=False)
    db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id.in_(package_ids)).delete(
        synchronize_session=False
    )


def _delete_orphan_test_builds(db: Session, build_ids: list[int]) -> None:
    if not build_ids:
        return
    db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id.in_(build_ids)).delete(
        synchronize_session=False
    )


def _delete_releases(db: Session, release_ids: list[int]) -> None:
    if not release_ids:
        return
    db.query(TenantUpdateOffer).filter(TenantUpdateOffer.release_id.in_(release_ids)).delete(
        synchronize_session=False
    )
    db.query(PlatformModuleVersion).filter(
        PlatformModuleVersion.release_id.in_(release_ids)
    ).delete(synchronize_session=False)
    db.query(ReleaseChange).filter(ReleaseChange.release_id.in_(release_ids)).delete(
        synchronize_session=False
    )
    db.query(PlatformReleaseModule).filter(
        PlatformReleaseModule.release_id.in_(release_ids)
    ).delete(synchronize_session=False)
    db.query(PlatformRelease).filter(PlatformRelease.id.in_(release_ids)).delete(
        synchronize_session=False
    )


def _delete_test_users(db: Session, user_ids: list[int]) -> None:
    if not user_ids:
        return
    owner = db.query(User).filter(User.email == PLATFORM_OWNER_EMAIL).one_or_none()
    safe_ids = [uid for uid in user_ids if owner is None or uid != owner.id]
    if not safe_ids:
        return
    db.query(TenantUserMembership).filter(
        TenantUserMembership.user_id.in_(safe_ids)
    ).delete(synchronize_session=False)
    db.query(TenantUserProfile).filter(TenantUserProfile.user_id.in_(safe_ids)).delete(
        synchronize_session=False
    )
    db.query(User).filter(User.id.in_(safe_ids)).delete(synchronize_session=False)


def _purge_leaked_test_tenant(db: Session, tenant_id: int, *, portal: Portal) -> None:
    """Hard purge for verified test-pattern tenants (bypasses protected-type guard)."""
    if tenant_id in PROTECTED_PORTAL_IDS:
        raise RuntimeError(f"Refusing to purge protected portal id={tenant_id}")
    if not _portal_is_test_candidate(portal):
        raise RuntimeError(f"Refusing to purge non-test portal id={tenant_id} name={portal.name!r}")

    from app.modules.tenant_management.delete_tenant import (
        _delete_platform_release_tenant_refs,
        _delete_tenant_data,
    )

    _delete_platform_release_tenant_refs(db, tenant_id)
    _delete_platform_version_registry_for_tenant(db, tenant_id)
    db.query(PlatformDeployment).filter(PlatformDeployment.target_tenant_id == tenant_id).delete(
        synchronize_session=False
    )
    _delete_tenant_data(db, tenant_id)

    db.query(TenantModuleConfigurationRollback).filter(
        TenantModuleConfigurationRollback.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModuleConfigurationApply).filter(
        TenantModuleConfigurationApply.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModuleConfigurationDiff).filter(
        TenantModuleConfigurationDiff.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModuleUpdatePreview).filter(
        TenantModuleUpdatePreview.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModuleUpdateOffer).filter(
        TenantModuleUpdateOffer.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModuleConfigSnapshot).filter(
        TenantModuleConfigSnapshot.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModuleConfiguration).filter(
        TenantModuleConfiguration.tenant_id == tenant_id
    ).delete(synchronize_session=False)
    db.query(TenantModule).filter(TenantModule.tenant_id == tenant_id).delete(
        synchronize_session=False
    )

    db.query(Portal).filter(Portal.id == tenant_id).delete(synchronize_session=False)


def execute_cleanup(db: Session, plan: CleanupPlan) -> None:
    if plan.protected_checks.get("protected_portal_ids_in_delete_set"):
        raise RuntimeError(
            f"Refusing cleanup: protected portal ids in plan: {plan.protected_checks['protected_portal_ids_in_delete_set']}"
        )

    _delete_module_publication_chain(db, plan.publication_ids)
    _delete_module_versions(db, plan.module_version_ids)
    _delete_package_release_chain(db, plan.package_ids)
    _delete_orphan_test_builds(db, plan.build_ids)
    _delete_releases(db, plan.release_ids)
    db.flush()

    portal_by_id = {
        int(portal.id): portal
        for portal in db.query(Portal).filter(Portal.id.in_(plan.portal_ids)).all()
    }

    for tenant_id in sorted(plan.portal_ids, reverse=True):
        portal = portal_by_id.get(tenant_id)
        if portal is None:
            continue
        _purge_leaked_test_tenant(db, tenant_id, portal=portal)

    _delete_test_users(db, plan.user_ids)
    db.commit()


def audit_companies_via_tenant_registry(db: Session) -> dict[str, object]:
    """Same data path as Control Plane → Компании (GET /control-plane/tenants)."""
    from app.modules.control_plane.tenant_registry.service import list_tenant_registry

    items = list_tenant_registry(db)
    approved = [item for item in items if int(item.id) in PROTECTED_PORTAL_IDS]
    test_companies = [item for item in items if int(item.id) not in PROTECTED_PORTAL_IDS]

    module_offers = [item for item in test_companies if str(item.name).startswith("Module offers ")]
    module_previews = [item for item in test_companies if str(item.name).startswith("Module previews ")]

    return {
        "total_companies": len(items),
        "approved_companies": [
            {
                "id": item.id,
                "name": item.name,
                "tenant_type": item.tenant_type.value,
                "tenant_status": item.tenant_status.value,
            }
            for item in approved
        ],
        "visible_test_companies": [
            {
                "id": item.id,
                "name": item.name,
                "tenant_type": item.tenant_type.value,
                "tenant_status": item.tenant_status.value,
                "reason": "not in protected set (id 1/2/21)",
            }
            for item in test_companies
        ],
        "visible_test_companies_count": len(test_companies),
        "module_offers_count": len(module_offers),
        "module_previews_count": len(module_previews),
        "cleanup_status": "PASSED" if len(test_companies) == 0 else "FAILED",
    }


def count_visible_test_records(db: Session) -> dict[str, int]:
    plan = build_cleanup_plan(db)
    registry_audit = audit_companies_via_tenant_registry(db)
    return {
        "test_portals": len(plan.portal_ids),
        "test_releases": len(plan.release_ids),
        "test_publications": len(plan.publication_ids),
        "test_users": len(plan.user_ids),
        "test_module_offers": plan.counts_by_table.get("tenant_module_update_offers", 0),
        "visible_test_companies_count": int(registry_audit["visible_test_companies_count"]),
        "module_offers_companies": int(registry_audit["module_offers_count"]),
        "module_previews_companies": int(registry_audit["module_previews_count"]),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cleanup publication test data leaks")
    parser.add_argument("--dry-run", action="store_true", help="Audit only (default)")
    parser.add_argument("--execute", action="store_true", help="Perform hard delete")
    parser.add_argument("--confirm", action="store_true", help="Required with --execute")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dry_run = not args.execute

    db = SessionLocal()
    try:
        plan = build_cleanup_plan(db)
        registry_audit = audit_companies_via_tenant_registry(db)
        print("=== Companies Registry Audit (UI source: GET /control-plane/tenants) ===")
        print(json.dumps(registry_audit, ensure_ascii=False, indent=2))
        print("\n=== Data Impact Audit (dry-run) ===")
        print(json.dumps(plan.counts_by_table, ensure_ascii=False, indent=2))
        print("\n=== Portal samples ===")
        print(json.dumps(plan.portal_samples, ensure_ascii=False, indent=2))
        print(f"\nportal_ids ({len(plan.portal_ids)}): {plan.portal_ids[:30]}{'...' if len(plan.portal_ids) > 30 else ''}")
        print(f"release_ids ({len(plan.release_ids)}): {plan.release_ids[:30]}{'...' if len(plan.release_ids) > 30 else ''}")
        print(f"package_ids ({len(plan.package_ids)}): {plan.package_ids}")
        print(f"build_ids ({len(plan.build_ids)}): {plan.build_ids[:30]}{'...' if len(plan.build_ids) > 30 else ''}")
        print(f"deployment_ids ({len(plan.deployment_ids)}): {plan.deployment_ids}")
        print(f"publication_ids ({len(plan.publication_ids)}): {plan.publication_ids}")
        print(f"user_ids ({len(plan.user_ids)}): {plan.user_ids[:30]}{'...' if len(plan.user_ids) > 30 else ''}")
        print("\n=== Protected checks ===")
        print(json.dumps(plan.protected_checks, ensure_ascii=False, indent=2))

        if dry_run:
            print("\nDRY-RUN complete. No data deleted.")
            if registry_audit["visible_test_companies_count"]:
                print(
                    f"\nWARNING: {registry_audit['visible_test_companies_count']} test companies "
                    "still visible in tenant registry (Companies UI)."
                )
            return 0

        if not args.confirm:
            print("\nRefusing execute without --confirm")
            return 2

        execute_cleanup(db, plan)
        post = count_visible_test_records(db)
        post_registry = audit_companies_via_tenant_registry(db)
        print("\n=== Post cleanup ===")
        print(json.dumps(post, ensure_ascii=False, indent=2))
        print("\n=== Post cleanup Companies Registry Audit ===")
        print(json.dumps(post_registry, ensure_ascii=False, indent=2))
        print(json.dumps(plan.protected_checks, ensure_ascii=False, indent=2))
        return 0 if post_registry["visible_test_companies_count"] == 0 else 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
