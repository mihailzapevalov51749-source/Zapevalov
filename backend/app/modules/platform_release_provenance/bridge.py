"""Digest Bridge verification service (WI-IMPL-003)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.modules.platform_release_provenance.constants import PHYSICAL_MANIFEST_PROVENANCE_FIELDS
from app.modules.platform_release_provenance.digest import compute_package_digest
from app.modules.platform_release_provenance.manifest import validate_physical_manifest
from app.modules.platform_release_provenance.runtime_artifacts import (
    compute_backend_fingerprint,
    compute_frontend_bundle_digest,
    load_physical_manifest,
)
from app.modules.platform_release_provenance.snapshots import BuildSnapshot, PackageSnapshot
from app.modules.platform_release_provenance.types import VerifyIssue, VerifyResult


def _norm_key(value: str | None) -> str:
    return str(value or "").strip().upper()


def _issue(code: str, message: str, layer: str) -> VerifyIssue:
    return VerifyIssue(code=code, message=message, layer=layer)


def _finalize_result(result: VerifyResult) -> VerifyResult:
    if result.issues:
        has_hard_fail = any(
            issue.code
            not in {
                "MISSING_LINKAGE",
                "MANIFEST_MISSING",
                "RELEASE_MISSING",
                "PACKAGE_NOT_FOUND",
                "BUILD_NOT_FOUND",
                "PACKAGE_DIGEST_MISSING",
            }
            for issue in result.issues
        )
        only_linkage = all(
            issue.code in {"MISSING_LINKAGE", "PACKAGE_DIGEST_MISSING"} for issue in result.issues
        )
        if has_hard_fail:
            result.status = "failed"
        elif only_linkage:
            result.status = "partial"
        else:
            result.status = "failed"
        result.drift_detected = True
    else:
        result.status = "passed"
        result.drift_detected = False
    return result


def verify_package_against_build(
    package: PackageSnapshot | None,
    build: BuildSnapshot | None,
) -> VerifyResult:
    result = VerifyResult(status="failed")
    if package is None:
        result.issues.append(_issue("PACKAGE_NOT_FOUND", "Release package snapshot is missing", "package"))
        return _finalize_result(result)
    if build is None:
        result.issues.append(_issue("BUILD_NOT_FOUND", "Build snapshot is missing", "build"))
        return _finalize_result(result)

    manifest = package.package_manifest_json or {}
    code_layer = manifest.get("code_layer") if isinstance(manifest.get("code_layer"), dict) else {}

    if package.build_id != build.id:
        result.issues.append(
            _issue(
                "BUILD_ID_MISMATCH",
                f"package.build_id={package.build_id} != build.id={build.id}",
                "package",
            )
        )
    else:
        result.checks.append({"name": "package.build_id", "ok": True})

    manifest_build_key = _norm_key(str(code_layer.get("build_key") or ""))
    if manifest_build_key and manifest_build_key != _norm_key(build.build_key):
        result.issues.append(
            _issue(
                "BUILD_KEY_MISMATCH",
                f"code_layer.build_key={manifest_build_key} != build.build_key={build.build_key}",
                "package",
            )
        )
    elif manifest_build_key:
        result.checks.append({"name": "code_layer.build_key", "ok": True})

    if code_layer.get("commit_sha") and code_layer.get("commit_sha") != build.commit_sha:
        result.issues.append(
            _issue(
                "COMMIT_SHA_MISMATCH",
                "code_layer.commit_sha does not match build.commit_sha",
                "package",
            )
        )
    elif code_layer.get("commit_sha"):
        result.checks.append({"name": "code_layer.commit_sha", "ok": True})

    for field, build_value in (
        ("backend_digest", build.backend_digest),
        ("frontend_digest", build.frontend_digest),
    ):
        layer_value = code_layer.get(field)
        if layer_value and build_value and layer_value != build_value:
            result.issues.append(
                _issue(
                    f"{field.upper()}_MISMATCH",
                    f"code_layer.{field} does not match build.{field}",
                    "package",
                )
            )
        elif layer_value and build_value:
            result.checks.append({"name": f"code_layer.{field}", "ok": True})

    stored_digest = manifest.get("package_digest")
    if isinstance(stored_digest, str) and len(stored_digest) == 64:
        expected_digest = compute_package_digest(
            package_key=package.package_key,
            platform_version=package.platform_version,
            code_layer=code_layer,
            module_bom_json=package.module_bom_json,
        )
        if stored_digest != expected_digest:
            result.issues.append(
                _issue(
                    "PACKAGE_DIGEST_MISMATCH",
                    "package_manifest_json.package_digest does not match recomputed digest",
                    "package",
                )
            )
        else:
            result.checks.append({"name": "package_digest", "ok": True})
    else:
        result.issues.append(
            _issue("PACKAGE_DIGEST_MISSING", "package_digest is missing or invalid", "package")
        )

    result.package_match = not any(issue.layer == "package" for issue in result.issues)
    result.build_match = result.package_match and package.build_id == build.id
    return _finalize_result(result)


def verify_manifest_against_package(
    manifest: dict[str, Any] | None,
    package: PackageSnapshot | None,
    *,
    build: BuildSnapshot | None = None,
) -> VerifyResult:
    result = VerifyResult(status="failed")
    if manifest is None:
        result.issues.append(_issue("MANIFEST_MISSING", "Physical manifest is missing", "manifest"))
        return _finalize_result(result)
    if package is None:
        result.issues.append(_issue("PACKAGE_NOT_FOUND", "Release package snapshot is missing", "package"))
        return _finalize_result(result)

    schema_errors = validate_physical_manifest(manifest)
    if schema_errors:
        if any("incomplete provenance" in err for err in schema_errors):
            result.issues.append(
                _issue("MISSING_LINKAGE", "; ".join(schema_errors), "manifest")
            )
        else:
            for err in schema_errors:
                result.issues.append(_issue("MANIFEST_SCHEMA_INVALID", err, "manifest"))

    linkage_present = all(manifest.get(field) not in (None, "") for field in PHYSICAL_MANIFEST_PROVENANCE_FIELDS)
    if linkage_present:
        if manifest.get("release_package_id") != package.id:
            result.issues.append(
                _issue(
                    "RELEASE_PACKAGE_ID_MISMATCH",
                    f"manifest.release_package_id={manifest.get('release_package_id')} != package.id={package.id}",
                    "manifest",
                )
            )
        else:
            result.checks.append({"name": "manifest.release_package_id", "ok": True})

        if _norm_key(str(manifest.get("package_key") or "")) != _norm_key(package.package_key):
            result.issues.append(
                _issue(
                    "PACKAGE_KEY_MISMATCH",
                    "manifest.package_key does not match package.package_key",
                    "manifest",
                )
            )
        else:
            result.checks.append({"name": "manifest.package_key", "ok": True})

        if manifest.get("build_id") != package.build_id:
            result.issues.append(
                _issue(
                    "BUILD_ID_MISMATCH",
                    f"manifest.build_id={manifest.get('build_id')} != package.build_id={package.build_id}",
                    "manifest",
                )
            )
        else:
            result.checks.append({"name": "manifest.build_id", "ok": True})

        code_layer = package.package_manifest_json.get("code_layer", {})
        if isinstance(code_layer, dict) and code_layer.get("build_key"):
            if _norm_key(str(manifest.get("build_key") or "")) != _norm_key(str(code_layer.get("build_key"))):
                result.issues.append(
                    _issue(
                        "BUILD_KEY_MISMATCH",
                        "manifest.build_key does not match package code_layer.build_key",
                        "manifest",
                    )
                )
            else:
                result.checks.append({"name": "manifest.build_key", "ok": True})

    if build is not None:
        if manifest.get("git_commit") and manifest.get("git_commit") != build.commit_sha:
            result.issues.append(
                _issue(
                    "COMMIT_SHA_MISMATCH",
                    "manifest.git_commit does not match build.commit_sha",
                    "manifest",
                )
            )
        elif manifest.get("git_commit"):
            result.checks.append({"name": "manifest.git_commit", "ok": True})

        backend_fp = manifest.get("backend_fingerprint")
        backend_hash = backend_fp.get("hash") if isinstance(backend_fp, dict) else None
        if backend_hash and build.backend_digest and backend_hash != build.backend_digest:
            result.issues.append(
                _issue(
                    "BACKEND_DIGEST_MISMATCH",
                    "manifest.backend_fingerprint.hash does not match build.backend_digest",
                    "manifest",
                )
            )
        elif backend_hash and build.backend_digest:
            result.checks.append({"name": "manifest.backend_fingerprint", "ok": True})

        if manifest.get("frontend_digest") and build.frontend_digest:
            if manifest.get("frontend_digest") != build.frontend_digest:
                result.issues.append(
                    _issue(
                        "FRONTEND_DIGEST_MISMATCH",
                        "manifest.frontend_digest does not match build.frontend_digest",
                        "manifest",
                    )
                )
            else:
                result.checks.append({"name": "manifest.frontend_digest", "ok": True})

    manifest_issues = [
        issue
        for issue in result.issues
        if issue.layer == "manifest" and issue.code not in {"MISSING_LINKAGE"}
    ]
    result.manifest_match = not manifest_issues
    result.package_match = result.manifest_match
    return _finalize_result(result)


def verify_runtime_against_manifest(
    *,
    release_dir: Path | None,
    manifest: dict[str, Any] | None,
    runtime_slot_key: str | None = None,
    verify_artifacts: bool = True,
) -> VerifyResult:
    result = VerifyResult(status="failed")
    if release_dir is None or not release_dir.exists():
        result.issues.append(
            _issue("RELEASE_MISSING", "Runtime release directory is missing", "runtime")
        )
        return _finalize_result(result)

    manifest_path = release_dir / "manifest.json"
    if manifest is None:
        if not manifest_path.is_file():
            result.issues.append(
                _issue("MANIFEST_MISSING", f"manifest.json not found: {manifest_path}", "runtime")
            )
            return _finalize_result(result)
        try:
            manifest = load_physical_manifest(manifest_path)
        except (OSError, ValueError, json.JSONDecodeError) as exc:
            result.issues.append(
                _issue("MANIFEST_MISSING", f"Cannot read manifest.json: {exc}", "runtime")
            )
            return _finalize_result(result)

    release_name = release_dir.name
    if manifest.get("release_id") and manifest.get("release_id") != release_name and release_name != "current":
        result.issues.append(
            _issue(
                "RELEASE_ID_MISMATCH",
                f"manifest.release_id={manifest.get('release_id')} != directory {release_name}",
                "runtime",
            )
        )
    else:
        result.checks.append({"name": "manifest.release_id", "ok": True})

    if runtime_slot_key and manifest.get("runtime_slot_key"):
        if str(manifest.get("runtime_slot_key")).strip() != str(runtime_slot_key).strip():
            result.issues.append(
                _issue(
                    "RUNTIME_SLOT_MISMATCH",
                    "manifest.runtime_slot_key does not match requested slot",
                    "runtime",
                )
            )
        else:
            result.checks.append({"name": "manifest.runtime_slot_key", "ok": True})

    if verify_artifacts:
        required = [
            ("frontend/index.html", release_dir / "frontend" / "index.html"),
            ("backend/app/main.py", release_dir / "backend" / "app" / "main.py"),
            ("backend/requirements.txt", release_dir / "backend" / "requirements.txt"),
        ]
        for label, path in required:
            if not path.is_file():
                result.issues.append(
                    _issue("ARTIFACT_MISSING", f"Missing {label} at {path}", "runtime")
                )
            else:
                result.checks.append({"name": label, "ok": True})

        backend_root = release_dir / "backend"
        backend_fp = manifest.get("backend_fingerprint")
        backend_hash = backend_fp.get("hash") if isinstance(backend_fp, dict) else None
        if backend_root.is_dir() and backend_hash:
            try:
                actual = compute_backend_fingerprint(backend_root)
                if actual.get("hash") != backend_hash:
                    result.issues.append(
                        _issue(
                            "FINGERPRINT_MISMATCH",
                            "Recomputed backend fingerprint does not match manifest",
                            "runtime",
                        )
                    )
                else:
                    result.checks.append({"name": "backend_fingerprint_recompute", "ok": True})
            except OSError as exc:
                result.issues.append(
                    _issue("FINGERPRINT_MISMATCH", f"Cannot compute backend fingerprint: {exc}", "runtime")
                )

        frontend_dir = release_dir / "frontend"
        if frontend_dir.is_dir() and manifest.get("frontend_digest"):
            try:
                actual_frontend = compute_frontend_bundle_digest(frontend_dir)
                if actual_frontend != manifest.get("frontend_digest"):
                    result.issues.append(
                        _issue(
                            "FRONTEND_DIGEST_MISMATCH",
                            "Recomputed frontend digest does not match manifest",
                            "runtime",
                        )
                    )
                else:
                    result.checks.append({"name": "frontend_digest_recompute", "ok": True})
            except OSError as exc:
                result.issues.append(
                    _issue("FRONTEND_DIGEST_MISMATCH", f"Cannot compute frontend digest: {exc}", "runtime")
                )

    runtime_issues = [issue for issue in result.issues if issue.layer == "runtime"]
    result.runtime_match = not runtime_issues
    result.manifest_match = result.runtime_match
    return _finalize_result(result)


def verify_release_provenance(
    *,
    package: PackageSnapshot | None,
    build: BuildSnapshot | None,
    manifest: dict[str, Any] | None = None,
    release_dir: Path | None = None,
    runtime_slot_key: str | None = None,
    verify_artifacts: bool = True,
) -> VerifyResult:
    """Full chain: Build → Package → Manifest → Runtime."""
    package_build = verify_package_against_build(package, build)
    manifest_result = verify_manifest_against_package(manifest, package, build=build)
    runtime_result = verify_runtime_against_manifest(
        release_dir=release_dir,
        manifest=manifest,
        runtime_slot_key=runtime_slot_key,
        verify_artifacts=verify_artifacts,
    )

    merged = VerifyResult(status="failed")
    merged.issues = package_build.issues + manifest_result.issues + runtime_result.issues
    merged.checks = package_build.checks + manifest_result.checks + runtime_result.checks
    merged.build_match = package_build.build_match
    merged.package_match = package_build.package_match and manifest_result.package_match
    merged.manifest_match = manifest_result.manifest_match and runtime_result.manifest_match
    merged.runtime_match = runtime_result.runtime_match
    return _finalize_result(merged)


def detect_release_drift(
    *,
    package: PackageSnapshot | None,
    build: BuildSnapshot | None,
    manifest: dict[str, Any] | None = None,
    release_dir: Path | None = None,
    runtime_slot_key: str | None = None,
    verify_artifacts: bool = True,
) -> VerifyResult:
    """Detect drift across registry and filesystem provenance layers."""
    result = verify_release_provenance(
        package=package,
        build=build,
        manifest=manifest,
        release_dir=release_dir,
        runtime_slot_key=runtime_slot_key,
        verify_artifacts=verify_artifacts,
    )
    result.drift_detected = result.status != "passed"
    return result
