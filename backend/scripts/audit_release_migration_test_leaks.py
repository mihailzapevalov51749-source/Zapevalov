"""Audit test artifacts from Steps 3-7 release migration tests.

Usage (from backend/):
  python scripts/audit_release_migration_test_leaks.py
  python scripts/audit_release_migration_test_leaks.py --json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import or_

from app.db.session import SessionLocal
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_event_journal.models import PlatformEventJournalEntry
from app.modules.platform_release.models import PlatformRelease, ReleaseChange, TenantUpdateOffer
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_version_registry.models import (
    PlatformEnvironmentVersion,
    PlatformVersionHistory,
)
from app.modules.portals.models import Portal
from app.modules.tenant_users.models import TenantUserMembership
from app.modules.users.models import User

PROTECTED_PORTAL_IDS = frozenset({1, 2, 21})

PACKAGE_TITLE_PATTERNS = (
    re.compile(r"^Review flow\b", re.I),
    re.compile(r"^Count\b", re.I),
    re.compile(r"^Step\d", re.I),
    re.compile(r"^Step3\b", re.I),
    re.compile(r"^Step4\b", re.I),
    re.compile(r"^Step5\b", re.I),
    re.compile(r"^Step6\b", re.I),
)

PORTAL_NAME_PATTERNS = (
    re.compile(r"^Test\s+(DEV|TEMPLATE|CLIENT)\b", re.I),
    re.compile(r"^test_", re.I),
)

USER_EMAIL_SUFFIX = "@test.local"
USER_EMAIL_PREFIXES = (
    "step3_release_",
    "step4_",
    "step5_",
    "step6_",
    "release_test",
    "dev_create_",
    "dev_submit_",
    "dev_only_",
    "reviewer_",
)


def _package_title_matches(title: str) -> bool:
    return any(p.search(str(title or "")) for p in PACKAGE_TITLE_PATTERNS)


def _portal_name_matches(name: str, code: str) -> bool:
    for p in PORTAL_NAME_PATTERNS:
        if p.search(str(name or "")):
            return True
    if str(code or "").startswith("test_"):
        return True
    return False


def _user_is_leak(user: User) -> bool:
    email = str(user.email or "").lower()
    if not email.endswith(USER_EMAIL_SUFFIX):
        return False
    return any(email.startswith(prefix) for prefix in USER_EMAIL_PREFIXES) or "release" in email


def audit() -> dict:
    db = SessionLocal()
    try:
        packages = db.query(PlatformReleasePackage).order_by(PlatformReleasePackage.id).all()
        leaked_packages = []
        for pkg in packages:
            manifest = pkg.package_manifest_json or {}
            title = manifest.get("title") or manifest.get("name") or ""
            if _package_title_matches(str(title)):
                leaked_packages.append(
                    {
                        "type": "package",
                        "id": pkg.id,
                        "name": title,
                        "version": pkg.platform_version,
                        "build_id": pkg.build_id,
                        "source": "package_manifest_json.title",
                    }
                )

        builds = []
        build_ids_needed = {p["build_id"] for p in leaked_packages if p.get("build_id")}
        if build_ids_needed:
            for b in db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id.in_(build_ids_needed)).all():
                builds.append({"type": "build", "id": b.id, "build_key": b.build_key})

        package_ids = [p["id"] for p in leaked_packages]
        deployments = []
        if package_ids:
            for d in (
                db.query(PlatformDeployment)
                .filter(PlatformDeployment.release_package_id.in_(package_ids))
                .all()
            ):
                deployments.append(
                    {
                        "type": "deployment",
                        "id": d.id,
                        "release_package_id": d.release_package_id,
                        "target_tenant_id": d.target_tenant_id,
                    }
                )

        offers = []
        if package_ids:
            for o in db.query(TenantUpdateOffer).filter(TenantUpdateOffer.release_id.in_(package_ids)).all():
                offers.append({"type": "offer", "id": o.id, "release_id": o.release_id, "tenant_id": o.tenant_id})

        env_versions = []
        deployment_tenant_ids = [d["target_tenant_id"] for d in deployments if d.get("target_tenant_id")]
        portal_ids_from_deploy = sorted(set(deployment_tenant_ids))
        if portal_ids_from_deploy:
            for ev in (
                db.query(PlatformEnvironmentVersion)
                .filter(PlatformEnvironmentVersion.tenant_id.in_(portal_ids_from_deploy))
                .all()
            ):
                env_versions.append({"type": "env_version", "id": ev.id, "tenant_id": ev.tenant_id})

        version_history = []
        if portal_ids_from_deploy:
            for vh in (
                db.query(PlatformVersionHistory)
                .filter(PlatformVersionHistory.tenant_id.in_(portal_ids_from_deploy))
                .all()
            ):
                version_history.append({"type": "version_history", "id": vh.id, "tenant_id": vh.tenant_id})

        portals = []
        for portal in db.query(Portal).order_by(Portal.id).all():
            if portal.id in PROTECTED_PORTAL_IDS:
                continue
            if _portal_name_matches(portal.name, portal.code):
                portals.append(
                    {
                        "type": "portal",
                        "id": portal.id,
                        "name": portal.name,
                        "code": portal.code,
                        "tenant_type": portal.tenant_type,
                    }
                )

        portal_id_set = {p["id"] for p in portals} | set(portal_ids_from_deploy)
        users = []
        for user in db.query(User).all():
            if _user_is_leak(user):
                users.append({"type": "user", "id": user.id, "email": user.email, "tenant_id": user.tenant_id})
            elif user.tenant_id is not None and int(user.tenant_id) in portal_id_set:
                users.append(
                    {
                        "type": "user",
                        "id": user.id,
                        "email": user.email,
                        "tenant_id": user.tenant_id,
                        "reason": "tenant_leak_portal",
                    }
                )

        memberships = []
        if portal_id_set:
            for m in db.query(TenantUserMembership).filter(TenantUserMembership.tenant_id.in_(portal_id_set)).all():
                memberships.append({"type": "membership", "id": m.id, "tenant_id": m.tenant_id, "user_id": m.user_id})

        legacy_releases = []
        for r in db.query(PlatformRelease).all():
            if _package_title_matches(r.title or ""):
                legacy_releases.append({"type": "legacy_release", "id": r.id, "title": r.title, "version": r.version})

        journal_slugs = []
        if package_ids:
            for entry in (
                db.query(PlatformEventJournalEntry)
                .filter(
                    or_(
                        *[
                            PlatformEventJournalEntry.slug.like(f"%{pid}%")
                            for pid in package_ids[:50]
                        ]
                    )
                )
                .all()
            ):
                journal_slugs.append({"type": "journal", "id": entry.id, "slug": entry.slug})

        counts = {
            "packages": len(leaked_packages),
            "builds": len(builds),
            "deployments": len(deployments),
            "offers": len(offers),
            "env_versions": len(env_versions),
            "version_history": len(version_history),
            "portals": len(portals),
            "users": len(users),
            "memberships": len(memberships),
            "legacy_releases": len(legacy_releases),
            "journal_entries": len(journal_slugs),
        }

        return {
            "counts": counts,
            "packages": leaked_packages,
            "builds": builds,
            "deployments": deployments,
            "offers": offers,
            "env_versions": env_versions,
            "version_history": version_history,
            "portals": portals,
            "users": users,
            "memberships": memberships,
            "legacy_releases": legacy_releases,
            "journal_entries": journal_slugs,
        }
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = audit()
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("=== Release migration test leak audit ===")
        print(json.dumps(result["counts"], ensure_ascii=False, indent=2))
        for key in (
            "packages",
            "builds",
            "deployments",
            "offers",
            "portals",
            "users",
            "legacy_releases",
        ):
            items = result[key]
            if items:
                print(f"\n--- {key} ({len(items)}) ---")
                for item in items:
                    print(item)
    total = sum(result["counts"].values())
    return 0 if total == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
