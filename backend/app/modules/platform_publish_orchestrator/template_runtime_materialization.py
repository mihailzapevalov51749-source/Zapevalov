"""TEMPLATE runtime materialization for Publish Orchestrator (WI-IMPL-007, ADR-RUN-001).

Creates immutable ``runtime/template/releases/release-NNN/`` without switching
``current/`` junction (activation is WI-IMPL-008).
"""

from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.runtime_paths import try_dev_monorepo_root
from app.modules.platform_release_provenance.runtime_artifacts import (
    compute_backend_fingerprint,
    compute_frontend_bundle_digest,
    get_suite_root,
    runtime_root_for_slot,
)

RELEASE_ID_PATTERN = re.compile(r"^release-(\d+)$")
RUNTIME_SLOT_TEMPLATE = "template"


class TemplateMaterializationError(RuntimeError):
    """Raised when TEMPLATE release artifacts cannot be materialized."""


@dataclass(frozen=True)
class TemplateMaterializationResult:
    release_id: str
    release_dir: Path
    manifest_path: Path


def get_next_template_release_id(releases_dir: Path) -> str:
    """Mirror ``Get-NextPhysicalReleaseId`` from ``_physical_runtime_common.ps1``."""
    max_serial = 0
    if releases_dir.is_dir():
        for item in releases_dir.iterdir():
            if not item.is_dir():
                continue
            match = RELEASE_ID_PATTERN.match(item.name)
            if match:
                max_serial = max(max_serial, int(match.group(1)))
    return f"release-{max_serial + 1:03d}"


def ensure_template_releases_layout(suite_root: Path) -> Path:
    """Ensure ``runtime/template/releases`` exists; return releases directory."""
    releases_dir = runtime_root_for_slot(suite_root, RUNTIME_SLOT_TEMPLATE) / "releases"
    releases_dir.mkdir(parents=True, exist_ok=True)
    mounts_root = runtime_root_for_slot(suite_root, RUNTIME_SLOT_TEMPLATE) / "mounts"
    for mount_name in ("uploads", "data", "logs"):
        (mounts_root / mount_name).mkdir(parents=True, exist_ok=True)
    return releases_dir


def copy_filtered_backend_app(source_app: Path, destination_app: Path) -> None:
    """Mirror ``Copy-FilteredBackendApp`` — production ``*.py`` only, no tests."""
    if destination_app.exists():
        shutil.rmtree(destination_app)
    destination_app.mkdir(parents=True, exist_ok=True)
    if not source_app.is_dir():
        raise TemplateMaterializationError(f"backend/app not found: {source_app}")
    for path in sorted(source_app.rglob("*.py")):
        if path.name.startswith("test_"):
            continue
        if "__pycache__" in path.parts:
            continue
        rel = path.relative_to(source_app)
        target = destination_app / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)


def copy_artifact_tree(source_dir: Path, destination_dir: Path) -> None:
    """Mirror ``Copy-PhysicalArtifactTree``."""
    if not source_dir.is_dir():
        raise TemplateMaterializationError(f"Source artifact missing: {source_dir}")
    if destination_dir.exists():
        shutil.rmtree(destination_dir)
    shutil.copytree(source_dir, destination_dir)


def stage_backend_runtime(repo_root: Path, destination_backend: Path) -> None:
    """Mirror ``Build-BackendRuntimeStaging`` output into destination_backend."""
    source_app = repo_root / "backend" / "app"
    requirements = repo_root / "backend" / "requirements.txt"
    if not requirements.is_file():
        raise TemplateMaterializationError(f"requirements.txt not found: {requirements}")
    if destination_backend.exists():
        shutil.rmtree(destination_backend)
    destination_backend.mkdir(parents=True, exist_ok=True)
    copy_filtered_backend_app(source_app, destination_backend / "app")
    shutil.copy2(requirements, destination_backend / "requirements.txt")


def resolve_frontend_source_dir(repo_root: Path, suite_root: Path) -> Path:
    """Prefer vite staging; fall back to current release frontend (read-only copy)."""
    staging_frontend = repo_root / "frontend" / ".build-staging" / "template"
    if (staging_frontend / "index.html").is_file():
        return staging_frontend

    current_frontend = (
        runtime_root_for_slot(suite_root, RUNTIME_SLOT_TEMPLATE) / "current" / "frontend"
    )
    if (current_frontend / "index.html").is_file():
        return current_frontend.resolve()

    raise TemplateMaterializationError(
        "Frontend artifact missing. Build template frontend staging first "
        "(frontend/.build-staging/template) or ensure current release has frontend."
    )


def write_unified_release_manifest(
    *,
    release_dir: Path,
    release_id: str,
    git_commit: str,
    frontend_digest: str,
    backend_fingerprint: dict[str, Any],
    release_package_id: int,
    package_key: str,
    build_id: int,
    build_key: str,
    runtime_slot_key: str = RUNTIME_SLOT_TEMPLATE,
) -> Path:
    """Mirror ``Write-UnifiedReleaseManifest`` with registry provenance."""
    if release_package_id <= 0 or not package_key or build_id <= 0 or not build_key:
        raise TemplateMaterializationError(
            "Registry provenance requires release_package_id, package_key, build_id, build_key"
        )
    manifest: dict[str, Any] = {
        "release_id": release_id,
        "git_commit": git_commit.strip().lower(),
        "created_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
            "+00:00", "Z"
        ),
        "frontend_digest": frontend_digest,
        "backend_fingerprint": backend_fingerprint,
        "artifacts": {"frontend": "frontend/", "backend": "backend/"},
        "manifest_schema_version": "1.1",
        "runtime_slot_key": runtime_slot_key,
        "release_package_id": int(release_package_id),
        "package_key": str(package_key).strip().upper(),
        "build_id": int(build_id),
        "build_key": str(build_key).strip().upper(),
    }
    manifest_path = release_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return manifest_path


def assert_materialized_release_artifacts(release_dir: Path) -> None:
    """Subset of ``Assert-UnifiedReleaseArtifacts`` — no ``current/`` junction check."""
    manifest_path = release_dir / "manifest.json"
    frontend_index = release_dir / "frontend" / "index.html"
    backend_main = release_dir / "backend" / "app" / "main.py"
    backend_requirements = release_dir / "backend" / "requirements.txt"
    for label, path in (
        ("manifest.json", manifest_path),
        ("frontend/index.html", frontend_index),
        ("backend/app/main.py", backend_main),
        ("backend/requirements.txt", backend_requirements),
    ):
        if not path.is_file():
            raise TemplateMaterializationError(f"Verification failed: {label} missing ({path})")

    payload = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    backend_fp = payload.get("backend_fingerprint")
    if not isinstance(backend_fp, dict) or not backend_fp.get("hash"):
        raise TemplateMaterializationError(
            "Verification failed: manifest backend_fingerprint.hash is missing"
        )
    if not payload.get("frontend_digest"):
        raise TemplateMaterializationError("Verification failed: manifest frontend_digest is missing")


def materialize_template_release(
    *,
    release_package_id: int,
    package_key: str,
    build_id: int,
    build_key: str,
    git_commit: str,
    suite_root: Path | None = None,
    repo_root: Path | None = None,
) -> TemplateMaterializationResult:
    """
    Create ``runtime/template/releases/release-NNN/`` with frontend, backend, manifest.

    Does **not** switch ``runtime/template/current`` (ADR-RUN-001 activation phase).
    """
    resolved_suite = (suite_root or get_suite_root()).resolve()
    resolved_repo = (repo_root or try_dev_monorepo_root() or resolved_suite).resolve()
    releases_dir = ensure_template_releases_layout(resolved_suite)
    release_id = get_next_template_release_id(releases_dir)
    release_dir = releases_dir / release_id
    if release_dir.exists():
        raise TemplateMaterializationError(f"Release directory already exists: {release_dir}")

    release_dir.mkdir(parents=True, exist_ok=False)
    release_backend = release_dir / "backend"
    release_frontend = release_dir / "frontend"

    stage_backend_runtime(resolved_repo, release_backend)
    frontend_source = resolve_frontend_source_dir(resolved_repo, resolved_suite)
    copy_artifact_tree(frontend_source, release_frontend)

    backend_fingerprint = compute_backend_fingerprint(release_backend)
    frontend_digest = compute_frontend_bundle_digest(release_frontend)
    manifest_path = write_unified_release_manifest(
        release_dir=release_dir,
        release_id=release_id,
        git_commit=git_commit,
        frontend_digest=frontend_digest,
        backend_fingerprint=backend_fingerprint,
        release_package_id=release_package_id,
        package_key=package_key,
        build_id=build_id,
        build_key=build_key,
    )
    assert_materialized_release_artifacts(release_dir)
    return TemplateMaterializationResult(
        release_id=release_id,
        release_dir=release_dir.resolve(),
        manifest_path=manifest_path.resolve(),
    )
