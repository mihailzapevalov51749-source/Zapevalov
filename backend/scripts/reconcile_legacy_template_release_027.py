#!/usr/bin/env python3
"""Backfill CP registry for legacy physical TEMPLATE release-027 (WI-RELEASE-REGISTRY-003).

Creates build + published package + succeeded deployment without touching runtime.

Usage (from backend/):
  python scripts/reconcile_legacy_template_release_027.py --dry-run
  YASNOPRO_ALLOW_PLATFORM_DATA_WRITE=1 python scripts/reconcile_legacy_template_release_027.py --execute
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.modules.platform_build_registry.constants import PlatformBuildStatus
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_deployment_registry.constants import (
    PlatformDeploymentKind,
    PlatformDeploymentStatus,
    PlatformDeploymentTargetEnvironmentType,
)
from app.modules.platform_deployment_registry.models import PlatformDeployment
from app.modules.platform_event_journal.audit_constants import (
    PlatformEventCategory,
    PlatformEventCode,
)
from app.modules.platform_event_journal.audit_service import record_platform_event
from app.modules.platform_publish_orchestrator.template_runtime_activation import (
    resolve_active_template_release_id,
)
from app.modules.platform_release.constants import PlatformReleaseStatus
from app.modules.platform_release_package_registry.constants import PlatformReleasePackageStatus
from app.modules.platform_release_package_registry.governance import default_governance
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_release_provenance.digest import compute_package_digest
from app.modules.platform_release_provenance.manifest import (
    attach_package_provenance_to_manifest,
    build_code_layer_manifest,
)
from app.modules.platform_release_provenance.runtime_artifacts import get_suite_root
from app.modules.platform_version_registry.crud import get_current_version_for_tenant
from app.modules.platform_version_registry.models import PlatformVersionHistory
from app.modules.tenant_bootstrap.constants import PLATFORM_TEMPLATE_TENANT_ID
from app.modules.tenant_environment.resolver import get_template_tenant, resolve_template_tenant_id
from app.db.session import SessionLocal
from scripts.platform_data_write_guard import require_platform_data_write_approval

PHYSICAL_RELEASE_ID = "release-027"
BUILD_KEY = "BLD-20260619-0027"
PACKAGE_KEY = "PKG-20260619-0027"
DEPLOYMENT_KEY = "DPL-20260619-0027"
RECONCILIATION_SOURCE = "legacy_reconstructed"


def _manifest_path() -> Path:
    return (
        get_suite_root()
        / "runtime"
        / "template"
        / "releases"
        / PHYSICAL_RELEASE_ID
        / "manifest.json"
    )


def _load_physical_manifest() -> dict[str, Any]:
    path = _manifest_path()
    if not path.is_file():
        raise FileNotFoundError(f"Physical manifest not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _parse_manifest_datetime(raw: str) -> datetime:
    text = str(raw).strip()
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    return datetime.fromisoformat(text).replace(tzinfo=None)


def _find_existing_reconciliation(db: Session) -> PlatformDeployment | None:
    deployments = db.query(PlatformDeployment).all()
    for deployment in deployments:
        manifest = deployment.deployment_manifest_json
        if not isinstance(manifest, dict):
            continue
        if manifest.get("materialized_release_id") == PHYSICAL_RELEASE_ID:
            return deployment
        if manifest.get("created_via") == RECONCILIATION_SOURCE:
            return deployment
    packages = db.query(PlatformReleasePackage).all()
    for package in packages:
        manifest = package.package_manifest_json
        if not isinstance(manifest, dict):
            continue
        physical = manifest.get("physical_runtime")
        if isinstance(physical, dict) and physical.get("release_id") == PHYSICAL_RELEASE_ID:
            if package.status == PlatformReleasePackageStatus.PUBLISHED.value:
                dep = (
                    db.query(PlatformDeployment)
                    .filter(PlatformDeployment.release_package_id == package.id)
                    .order_by(PlatformDeployment.id.desc())
                    .first()
                )
                return dep
    return None


def _resolve_platform_version(db: Session, physical: dict[str, Any]) -> str:
    template = get_template_tenant(db)
    if template is not None and str(template.template_version or "").strip():
        return str(template.template_version).strip()
    raise RuntimeError("TEMPLATE portal or template_version missing in CP DB")


def _build_module_bom() -> dict[str, Any]:
    return {
        "modules": [],
        "provenance": {
            "source": RECONCILIATION_SOURCE,
            "physical_release_id": PHYSICAL_RELEASE_ID,
        },
    }


def _build_package_manifest(
    *,
    physical: dict[str, Any],
    platform_version: str,
    build: PlatformCodeBuild,
    module_bom_json: dict[str, Any],
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "title": f"Legacy TEMPLATE runtime {PHYSICAL_RELEASE_ID}",
        "description": (
            "Registry backfill for pre-orchestrator physical release. "
            "Runtime manifest on disk unchanged (WI-RELEASE-REGISTRY-003)."
        ),
        "created_via": RECONCILIATION_SOURCE,
        "physical_runtime": {
            "release_id": physical.get("release_id"),
            "git_commit": physical.get("git_commit"),
            "created_at": physical.get("created_at"),
            "frontend_digest": physical.get("frontend_digest"),
            "backend_fingerprint": physical.get("backend_fingerprint"),
            "manifest_schema_version": physical.get("manifest_schema_version"),
            "runtime_slot_key": physical.get("runtime_slot_key"),
            "registry_link_status": "sidecar_only",
        },
        "release_scope": {
            "scope_status": RECONCILIATION_SOURCE,
            "included_artifacts": ["frontend", "backend"],
            "physical_release_id": PHYSICAL_RELEASE_ID,
            "known_limitations": [
                "Physical manifest.json lacks registry linkage fields until WI-RELEASE-REGISTRY-004",
            ],
        },
    }
    code_layer = build_code_layer_manifest(build)
    package_digest = compute_package_digest(
        package_key=PACKAGE_KEY,
        platform_version=platform_version,
        code_layer=code_layer,
        module_bom_json=module_bom_json,
    )
    manifest = attach_package_provenance_to_manifest(
        base,
        package_key=PACKAGE_KEY,
        platform_version=platform_version,
        code_layer=code_layer,
        module_bom_json=module_bom_json,
        package_digest=package_digest,
    )
    governance = default_governance()
    governance.update(
        {
            "review_status": PlatformReleaseStatus.PUBLISHED_TO_TEMPLATE.value,
            "approved_at": physical.get("created_at"),
            "legacy_release_bridge_id": PHYSICAL_RELEASE_ID,
        }
    )
    manifest["governance"] = governance
    return manifest


def _build_deployment_manifest(
    *,
    physical: dict[str, Any],
    platform_version: str,
    release_package_id: int,
    package_key: str,
    build_id: int,
    build_key: str,
) -> dict[str, Any]:
    return {
        "created_via": RECONCILIATION_SOURCE,
        "runtime_slot_key": physical.get("runtime_slot_key") or "template",
        "materialized_release_id": PHYSICAL_RELEASE_ID,
        "activated_release_id": PHYSICAL_RELEASE_ID,
        "orchestrator_status": "succeeded",
        "orchestrator_phase": "version_pinned",
        "release_package_id": release_package_id,
        "package_key": package_key,
        "build_id": build_id,
        "build_key": build_key,
        "git_commit": physical.get("git_commit"),
        "verify_proof": {
            "status": "legacy_reconciled",
            "legacy_missing_linkage": True,
            "note": (
                "Backfill without re-verify gate; digests copied from physical manifest. "
                "Physical manifest registry fields pending WI-RELEASE-REGISTRY-004."
            ),
        },
        "version_pin_proof": {
            "status": "legacy_reconciled",
            "platform_version": platform_version,
            "activated_release_id": PHYSICAL_RELEASE_ID,
            "release_package_id": release_package_id,
            "environment_key": "TEMPLATE",
        },
    }


def _environment_notes(
    *,
    platform_version: str,
    release_package_id: int,
    package_key: str,
    deployment_id: int,
    deployment_key: str,
    build_id: int,
    git_commit: str,
) -> str:
    return (
        f"WI-RELEASE-REGISTRY-003 legacy reconciliation; "
        f"physical_active_release_id={PHYSICAL_RELEASE_ID}; "
        f"platform_version={platform_version}; "
        f"release_package_id={release_package_id}; "
        f"package_key={package_key}; "
        f"deployment_id={deployment_id}; "
        f"deployment_key={deployment_key}; "
        f"build_id={build_id}; "
        f"git_commit={git_commit}"
    )


def dry_run(db: Session) -> dict[str, Any]:
    physical = _load_physical_manifest()
    active = resolve_active_template_release_id(get_suite_root())
    existing = _find_existing_reconciliation(db)
    platform_version = _resolve_platform_version(db, physical)
    return {
        "physical_release_id": PHYSICAL_RELEASE_ID,
        "active_template_release_id": active,
        "physical_manifest": physical,
        "platform_version": platform_version,
        "template_tenant_id": resolve_template_tenant_id(db),
        "existing_reconciliation_deployment_id": existing.id if existing else None,
        "planned_build_key": BUILD_KEY,
        "planned_package_key": PACKAGE_KEY,
        "planned_deployment_key": DEPLOYMENT_KEY,
        "action": "skip" if existing else "create",
    }


def execute(db: Session) -> dict[str, Any]:
    require_platform_data_write_approval(
        script_name="reconcile_legacy_template_release_027.py"
    )

    physical = _load_physical_manifest()
    active = resolve_active_template_release_id(get_suite_root())
    if active != PHYSICAL_RELEASE_ID:
        raise RuntimeError(
            f"Active template release is {active!r}, expected {PHYSICAL_RELEASE_ID}"
        )

    existing = _find_existing_reconciliation(db)
    if existing is not None:
        package = db.query(PlatformReleasePackage).filter(
            PlatformReleasePackage.id == existing.release_package_id
        ).one()
        build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == package.build_id).one()
        env = get_current_version_for_tenant(db, PLATFORM_TEMPLATE_TENANT_ID)
        return {
            "action": "skip",
            "deployment_id": existing.id,
            "deployment_key": existing.deployment_key,
            "release_package_id": package.id,
            "package_key": package.package_key,
            "build_id": build.id,
            "build_key": build.build_key,
            "git_commit": build.commit_sha,
            "environment_version_id": env.id if env else None,
        }

    materialized_at = _parse_manifest_datetime(str(physical["created_at"]))
    platform_version = _resolve_platform_version(db, physical)
    backend_hash = (
        physical.get("backend_fingerprint", {}).get("hash")
        if isinstance(physical.get("backend_fingerprint"), dict)
        else None
    )
    frontend_digest = physical.get("frontend_digest")

    build = PlatformCodeBuild(
        build_key=BUILD_KEY,
        commit_sha=str(physical["git_commit"]).strip().lower(),
        status=PlatformBuildStatus.SUCCEEDED.value,
        backend_digest=str(backend_hash) if backend_hash else None,
        frontend_digest=str(frontend_digest) if frontend_digest else None,
        schema_revision=f"legacy-{PHYSICAL_RELEASE_ID}",
        build_manifest_json={
            "created_via": RECONCILIATION_SOURCE,
            "physical_release_id": PHYSICAL_RELEASE_ID,
            "git_commit": physical.get("git_commit"),
            "manifest_schema_version": physical.get("manifest_schema_version"),
        },
        created_at=materialized_at,
        started_at=materialized_at,
        finished_at=materialized_at,
    )
    db.add(build)
    db.flush()

    module_bom_json = _build_module_bom()
    package_manifest_json = _build_package_manifest(
        physical=physical,
        platform_version=platform_version,
        build=build,
        module_bom_json=module_bom_json,
    )
    package = PlatformReleasePackage(
        package_key=PACKAGE_KEY,
        build_id=build.id,
        platform_version=platform_version,
        status=PlatformReleasePackageStatus.PUBLISHED.value,
        package_manifest_json=package_manifest_json,
        module_bom_json=module_bom_json,
        release_notes=package_manifest_json.get("description"),
        created_at=materialized_at,
        ready_at=materialized_at,
        published_at=materialized_at,
    )
    db.add(package)
    db.flush()

    deployment_manifest = _build_deployment_manifest(
        physical=physical,
        platform_version=platform_version,
        release_package_id=package.id,
        package_key=package.package_key,
        build_id=build.id,
        build_key=build.build_key,
    )
    deployment = PlatformDeployment(
        deployment_key=DEPLOYMENT_KEY,
        release_package_id=package.id,
        target_environment_type=PlatformDeploymentTargetEnvironmentType.TEMPLATE.value,
        deployment_kind=PlatformDeploymentKind.TEMPLATE_PUBLISH.value,
        target_tenant_id=PLATFORM_TEMPLATE_TENANT_ID,
        status=PlatformDeploymentStatus.SUCCEEDED.value,
        target_platform_version=platform_version,
        target_schema_revision=build.schema_revision,
        deployment_manifest_json=deployment_manifest,
        created_at=materialized_at,
        started_at=materialized_at,
        finished_at=materialized_at,
    )
    db.add(deployment)
    db.flush()

    env = get_current_version_for_tenant(db, PLATFORM_TEMPLATE_TENANT_ID)
    if env is None:
        raise RuntimeError("TEMPLATE environment version missing; run WI-RELEASE-REGISTRY-002 first")

    env.notes = _environment_notes(
        platform_version=platform_version,
        release_package_id=package.id,
        package_key=package.package_key,
        deployment_id=deployment.id,
        deployment_key=deployment.deployment_key,
        build_id=build.id,
        git_commit=build.commit_sha,
    )
    env.change_description = (
        "Legacy runtime reconciliation linked environment version to package/deployment"
    )
    env.updated_at = datetime.utcnow()

    db.add(
        PlatformVersionHistory(
            tenant_id=PLATFORM_TEMPLATE_TENANT_ID,
            environment_key=env.environment_key,
            platform_version=platform_version,
            status=env.status,
            installed_at=env.installed_at,
            installed_by_id=env.installed_by_id,
            notes=env.notes,
            change_description="WI-RELEASE-REGISTRY-003 legacy runtime reconciliation audit row",
            recorded_at=datetime.utcnow(),
        )
    )

    record_platform_event(
        db,
        event_code=PlatformEventCode.TEMPLATE_PUBLISH_SUCCEEDED.value,
        event_category=PlatformEventCategory.TEMPLATE.value,
        title=f"Legacy reconciliation: {PHYSICAL_RELEASE_ID} registered in CP",
        description=(
            f"Backfilled build {build.build_key}, package {package.package_key}, "
            f"deployment {deployment.deployment_key} for active physical release "
            f"{PHYSICAL_RELEASE_ID} without runtime mutation."
        ),
        actor_user=None,
        target_type="platform_deployment",
        target_id=deployment.id,
        target_name=deployment.deployment_key,
        metadata={
            "source": RECONCILIATION_SOURCE,
            "physical_release_id": PHYSICAL_RELEASE_ID,
            "release_package_id": package.id,
            "package_key": package.package_key,
            "build_id": build.id,
            "build_key": build.build_key,
            "git_commit": build.commit_sha,
            "platform_version": platform_version,
        },
        slug=f"legacy-runtime-reconciliation-{PHYSICAL_RELEASE_ID}",
        commit=False,
    )

    db.commit()

    return {
        "action": "create",
        "deployment_id": deployment.id,
        "deployment_key": deployment.deployment_key,
        "release_package_id": package.id,
        "package_key": package.package_key,
        "build_id": build.id,
        "build_key": build.build_key,
        "git_commit": build.commit_sha,
        "platform_version": platform_version,
        "environment_version_id": env.id,
        "active_template_release_id": active,
    }


def provenance_report(db: Session) -> dict[str, Any]:
    deployment = _find_existing_reconciliation(db)
    if deployment is None:
        return {"ready": False, "reason": "deployment missing"}

    package = db.query(PlatformReleasePackage).filter(
        PlatformReleasePackage.id == deployment.release_package_id
    ).one()
    build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == package.build_id).one()
    env = get_current_version_for_tenant(db, PLATFORM_TEMPLATE_TENANT_ID)
    physical = _load_physical_manifest()
    active = resolve_active_template_release_id(get_suite_root())

    return {
        "ready": True,
        "what_is_running": f"TEMPLATE physical {active}",
        "platform_version": env.platform_version if env else None,
        "deployment_id": deployment.id,
        "deployment_key": deployment.deployment_key,
        "release_package_id": package.id,
        "package_key": package.package_key,
        "build_id": build.id,
        "build_key": build.build_key,
        "git_commit": build.commit_sha,
        "physical_git_commit": physical.get("git_commit"),
        "commits_match": build.commit_sha == str(physical.get("git_commit", "")).lower(),
        "registry_matches_active_runtime": active == PHYSICAL_RELEASE_ID,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill CP registry for legacy template release-027"
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--verify", action="store_true", help="Print provenance report only")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.verify:
            print(json.dumps(provenance_report(db), ensure_ascii=False, indent=2, default=str))
            return 0

        if args.execute == args.dry_run:
            parser.error("Specify exactly one of --dry-run or --execute")

        if args.dry_run:
            print(json.dumps(dry_run(db), ensure_ascii=False, indent=2, default=str))
            return 0

        result = execute(db)
        result["provenance"] = provenance_report(db)
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
        if not result.get("provenance", {}).get("ready"):
            return 1
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
