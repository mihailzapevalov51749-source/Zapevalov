"""Tests for TEMPLATE runtime materialization (WI-IMPL-007)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.modules.platform_publish_orchestrator.template_runtime_materialization import (
    TemplateMaterializationError,
    assert_materialized_release_artifacts,
    get_next_template_release_id,
    materialize_template_release,
    write_unified_release_manifest,
)


def _seed_minimal_repo(repo_root: Path) -> None:
    backend_app = repo_root / "backend" / "app"
    backend_app.mkdir(parents=True)
    (backend_app / "main.py").write_text("print('ok')\n", encoding="utf-8")
    (repo_root / "backend" / "requirements.txt").write_text("fastapi\n", encoding="utf-8")

    frontend_staging = repo_root / "frontend" / ".build-staging" / "template"
    assets = frontend_staging / "assets"
    assets.mkdir(parents=True)
    (frontend_staging / "index.html").write_text("<html></html>", encoding="utf-8")
    (assets / "index-abc123.js").write_bytes(b"console.log('bundle');")


def test_get_next_template_release_id_empty(tmp_path: Path) -> None:
    releases = tmp_path / "releases"
    releases.mkdir()
    assert get_next_template_release_id(releases) == "release-001"


def test_get_next_template_release_id_increments(tmp_path: Path) -> None:
    releases = tmp_path / "releases"
    releases.mkdir()
    (releases / "release-001").mkdir()
    (releases / "release-002").mkdir()
    assert get_next_template_release_id(releases) == "release-003"


def test_materialize_template_release_creates_artifacts(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    suite_root = tmp_path / "suite"
    _seed_minimal_repo(repo_root)

    result = materialize_template_release(
        release_package_id=42,
        package_key="PKG-20260619-0042",
        build_id=7,
        build_key="BLD-20260619-0007",
        git_commit="a" * 40,
        suite_root=suite_root,
        repo_root=repo_root,
    )

    assert result.release_id == "release-001"
    assert (result.release_dir / "frontend" / "index.html").is_file()
    assert (result.release_dir / "backend" / "app" / "main.py").is_file()
    assert result.manifest_path.is_file()

    manifest = json.loads(result.manifest_path.read_text(encoding="utf-8"))
    assert manifest["release_id"] == "release-001"
    assert manifest["release_package_id"] == 42
    assert manifest["package_key"] == "PKG-20260619-0042"
    assert manifest["build_id"] == 7
    assert manifest["runtime_slot_key"] == "template"
    assert manifest["frontend_digest"]
    assert manifest["backend_fingerprint"]["hash"]

    assert_materialized_release_artifacts(result.release_dir)


def test_materialize_template_release_fails_without_frontend(tmp_path: Path) -> None:
    repo_root = tmp_path / "repo"
    suite_root = tmp_path / "suite"
    backend_app = repo_root / "backend" / "app"
    backend_app.mkdir(parents=True)
    (backend_app / "main.py").write_text("x", encoding="utf-8")
    (repo_root / "backend" / "requirements.txt").write_text("fastapi\n", encoding="utf-8")

    with pytest.raises(TemplateMaterializationError, match="Frontend artifact missing"):
        materialize_template_release(
            release_package_id=1,
            package_key="PKG-TEST",
            build_id=1,
            build_key="BLD-TEST",
            git_commit="b" * 40,
            suite_root=suite_root,
            repo_root=repo_root,
        )


def test_write_unified_release_manifest_requires_provenance(tmp_path: Path) -> None:
    release_dir = tmp_path / "release-001"
    release_dir.mkdir()
    with pytest.raises(TemplateMaterializationError, match="Registry provenance"):
        write_unified_release_manifest(
            release_dir=release_dir,
            release_id="release-001",
            git_commit="c" * 40,
            frontend_digest="abc",
            backend_fingerprint={"version": "1", "hash": "deadbeef", "production_file_count": 1},
            release_package_id=0,
            package_key="",
            build_id=0,
            build_key="",
        )
