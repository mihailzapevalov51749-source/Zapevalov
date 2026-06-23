"""Read-only CLI for Digest Bridge verification (WI-IMPL-003)."""

from __future__ import annotations

import argparse
import json
import sys

from app.db.session import SessionLocal
from app.modules.platform_build_registry.models import PlatformCodeBuild
from app.modules.platform_release_package_registry.models import PlatformReleasePackage
from app.modules.platform_release_provenance.bridge import detect_release_drift, verify_release_provenance
from app.modules.platform_release_provenance.runtime_artifacts import (
    get_suite_root,
    load_physical_manifest,
    resolve_release_dir,
)
from app.modules.platform_release_provenance.snapshots import (
    build_snapshot_from_orm,
    package_snapshot_from_orm,
)


def _load_package_build(db, package_id: int):
    package = db.query(PlatformReleasePackage).filter(PlatformReleasePackage.id == package_id).one_or_none()
    if package is None:
        raise SystemExit(f"Release package {package_id} not found")
    build = db.query(PlatformCodeBuild).filter(PlatformCodeBuild.id == package.build_id).one_or_none()
    if build is None:
        raise SystemExit(f"Build for package {package_id} not found")
    return package_snapshot_from_orm(package), build_snapshot_from_orm(build)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Digest Bridge read-only provenance verification")
    parser.add_argument("--package-id", type=int, help="platform_release_packages.id")
    parser.add_argument("--manifest-path", type=str, help="Path to physical manifest.json")
    parser.add_argument("--runtime-slot", type=str, help="template | client | company/{code}")
    parser.add_argument("--release-id", type=str, help="release-NNN (default: current junction)")
    parser.add_argument("--no-artifacts", action="store_true", help="Skip artifact fingerprint recompute")
    parser.add_argument("--drift-only", action="store_true", help="Use detect_release_drift wrapper")
    args = parser.parse_args(argv)

    if args.package_id is None and args.manifest_path is None:
        parser.error("Provide --package-id and/or --manifest-path")

    package_snapshot = None
    build_snapshot = None
    if args.package_id is not None:
        db = SessionLocal()
        try:
            package_snapshot, build_snapshot = _load_package_build(db, args.package_id)
        finally:
            db.close()

    manifest = None
    release_dir = None
    if args.manifest_path:
        manifest_path = __import__("pathlib").Path(args.manifest_path)
        manifest = load_physical_manifest(manifest_path)
        release_dir = manifest_path.parent
    elif args.runtime_slot:
        release_dir = resolve_release_dir(
            suite_root=get_suite_root(),
            runtime_slot_key=args.runtime_slot,
            release_id=args.release_id,
            use_current=not args.release_id,
        )
        manifest = load_physical_manifest(release_dir / "manifest.json")

    verify_fn = detect_release_drift if args.drift_only else verify_release_provenance
    result = verify_fn(
        package=package_snapshot,
        build=build_snapshot,
        manifest=manifest,
        release_dir=release_dir,
        runtime_slot_key=args.runtime_slot,
        verify_artifacts=not args.no_artifacts,
    )
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
    return 0 if result.status == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
