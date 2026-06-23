"""Tests for Digest Bridge service (WI-IMPL-003)."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from app.modules.platform_release_provenance.bridge import (
    detect_release_drift,
    verify_manifest_against_package,
    verify_package_against_build,
    verify_release_provenance,
    verify_runtime_against_manifest,
)
from app.modules.platform_release_provenance.digest import compute_package_digest
from app.modules.platform_release_provenance.manifest import build_physical_manifest_provenance
from app.modules.platform_release_provenance.snapshots import BuildSnapshot, PackageSnapshot


def _code_layer() -> dict:
    return {
        "build_id": 10,
        "build_key": "BLD-20260619-0010",
        "commit_sha": "a" * 40,
        "backend_digest": "b" * 64,
        "frontend_digest": "c" * 64,
        "schema_revision": "api-adapter-v1",
    }


def _build() -> BuildSnapshot:
    layer = _code_layer()
    return BuildSnapshot(
        id=layer["build_id"],
        build_key=layer["build_key"],
        commit_sha=layer["commit_sha"],
        backend_digest=layer["backend_digest"],
        frontend_digest=layer["frontend_digest"],
        schema_revision=layer["schema_revision"],
    )


def _package() -> PackageSnapshot:
    code_layer = _code_layer()
    module_bom = {"modules": [{"module_key": "core"}]}
    manifest = {
        "code_layer": code_layer,
        "package_digest": compute_package_digest(
            package_key="PKG-20260619-0099",
            platform_version="v9.9.9",
            code_layer=code_layer,
            module_bom_json=module_bom,
        ),
    }
    return PackageSnapshot(
        id=99,
        package_key="PKG-20260619-0099",
        platform_version="v9.9.9",
        build_id=10,
        package_manifest_json=manifest,
        module_bom_json=module_bom,
    )


def _physical_manifest(package: PackageSnapshot, build: BuildSnapshot) -> dict:
    return {
        "release_id": "release-099",
        "git_commit": build.commit_sha,
        "frontend_digest": build.frontend_digest,
        "backend_fingerprint": {"hash": build.backend_digest, "version": "1"},
        **build_physical_manifest_provenance(
            release_package_id=package.id,
            package_key=package.package_key,
            build_id=build.id,
            build_key=build.build_key,
            runtime_slot_key="template",
        ),
    }


def _write_min_runtime(release_dir: Path, manifest: dict) -> dict:
    (release_dir / "frontend" / "assets").mkdir(parents=True)
    (release_dir / "backend" / "app" / "core").mkdir(parents=True)
    (release_dir / "frontend" / "assets" / "index-test.js").write_bytes(b"bundle")
    (release_dir / "frontend" / "index.html").write_text("<html></html>", encoding="utf-8")
    (release_dir / "backend" / "requirements.txt").write_text("fastapi\n", encoding="utf-8")
    (release_dir / "backend" / "app" / "main.py").write_text("def app(): pass\n", encoding="utf-8")
    manifest = dict(manifest)
    manifest["frontend_digest"] = __import__("hashlib").sha256(b"bundle").hexdigest()
    from app.modules.platform_release_provenance.runtime_artifacts import compute_backend_fingerprint

    manifest["backend_fingerprint"] = compute_backend_fingerprint(release_dir / "backend")
    (release_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return manifest


def _sync_snapshots_from_manifest(
    package: PackageSnapshot,
    build: BuildSnapshot,
    manifest: dict,
) -> tuple[PackageSnapshot, BuildSnapshot]:
    backend_fp = manifest.get("backend_fingerprint") if isinstance(manifest.get("backend_fingerprint"), dict) else {}
    synced_build = BuildSnapshot(
        id=build.id,
        build_key=build.build_key,
        commit_sha=build.commit_sha,
        backend_digest=str(backend_fp.get("hash") or build.backend_digest),
        frontend_digest=str(manifest.get("frontend_digest") or build.frontend_digest),
        schema_revision=build.schema_revision,
    )
    code_layer = dict(package.package_manifest_json.get("code_layer", {}))
    code_layer["backend_digest"] = synced_build.backend_digest
    code_layer["frontend_digest"] = synced_build.frontend_digest
    module_bom = package.module_bom_json
    manifest_json = dict(package.package_manifest_json)
    manifest_json["code_layer"] = code_layer
    manifest_json["package_digest"] = compute_package_digest(
        package_key=package.package_key,
        platform_version=package.platform_version,
        code_layer=code_layer,
        module_bom_json=module_bom,
    )
    synced_package = PackageSnapshot(
        id=package.id,
        package_key=package.package_key,
        platform_version=package.platform_version,
        build_id=package.build_id,
        package_manifest_json=manifest_json,
        module_bom_json=module_bom,
    )
    return synced_package, synced_build


def test_full_match_chain() -> None:
    package = _package()
    build = _build()
    manifest = _physical_manifest(package, build)
    with tempfile.TemporaryDirectory() as tmp:
        release_dir = Path(tmp) / "release-099"
        release_dir.mkdir()
        manifest = _write_min_runtime(release_dir, manifest)
        package, build = _sync_snapshots_from_manifest(package, build, manifest)
        result = verify_release_provenance(
            package=package,
            build=build,
            manifest=manifest,
            release_dir=release_dir,
            runtime_slot_key="template",
        )
    assert result.status == "passed"
    assert result.drift_detected is False
    assert result.build_match and result.package_match and result.manifest_match and result.runtime_match


def test_package_mismatch() -> None:
    package = _package()
    build = _build()
    manifest = _physical_manifest(package, build)
    manifest["package_key"] = "PKG-OTHER-0001"
    result = verify_manifest_against_package(manifest, package, build=build)
    assert result.status == "failed"
    assert any(issue.code == "PACKAGE_KEY_MISMATCH" for issue in result.issues)


def test_build_mismatch() -> None:
    package = _package()
    build = _build()
    bad_build = BuildSnapshot(
        id=build.id,
        build_key=build.build_key,
        commit_sha="f" * 40,
        backend_digest=build.backend_digest,
        frontend_digest=build.frontend_digest,
    )
    result = verify_package_against_build(package, bad_build)
    assert result.status == "failed"
    assert any(issue.code == "COMMIT_SHA_MISMATCH" for issue in result.issues)


def test_manifest_mismatch() -> None:
    package = _package()
    build = _build()
    manifest = _physical_manifest(package, build)
    manifest["git_commit"] = "0" * 40
    result = verify_manifest_against_package(manifest, package, build=build)
    assert result.status == "failed"
    assert any(issue.code == "COMMIT_SHA_MISMATCH" for issue in result.issues)


def test_missing_runtime() -> None:
    package = _package()
    build = _build()
    manifest = _physical_manifest(package, build)
    result = verify_runtime_against_manifest(
        release_dir=Path("/nonexistent/runtime/release-404"),
        manifest=manifest,
        runtime_slot_key="template",
        verify_artifacts=False,
    )
    assert result.status == "failed"
    assert any(issue.code == "RELEASE_MISSING" for issue in result.issues)


def test_missing_manifest() -> None:
    result = verify_manifest_against_package(None, _package())
    assert result.status == "failed"
    assert any(issue.code == "MANIFEST_MISSING" for issue in result.issues)


def test_missing_package() -> None:
    result = verify_package_against_build(None, _build())
    assert result.status == "failed"
    assert any(issue.code == "PACKAGE_NOT_FOUND" for issue in result.issues)


def test_detect_release_drift_flags_partial_legacy() -> None:
    package = _package()
    build = _build()
    legacy_manifest = {
        "release_id": "release-019",
        "git_commit": build.commit_sha,
        "frontend_digest": build.frontend_digest,
        "backend_fingerprint": {"hash": build.backend_digest},
        "runtime_slot_key": "template",
    }
    result = detect_release_drift(
        package=package,
        build=build,
        manifest=legacy_manifest,
        release_dir=None,
        verify_artifacts=False,
    )
    assert result.drift_detected is True
    assert result.status in {"partial", "failed"}
