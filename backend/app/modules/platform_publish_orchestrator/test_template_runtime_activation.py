"""Tests for TEMPLATE runtime activation (WI-IMPL-009)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.modules.platform_publish_orchestrator.template_runtime_activation import (
    TemplateActivationError,
    activate_template_release,
    resolve_active_template_release_id,
    set_template_current_junction,
)
from app.modules.platform_publish_orchestrator.template_runtime_materialization import (
    assert_materialized_release_artifacts,
    write_unified_release_manifest,
)


def _write_release(release_dir: Path, release_id: str) -> None:
    release_dir.mkdir(parents=True, exist_ok=True)
    (release_dir / "frontend").mkdir()
    (release_dir / "frontend" / "index.html").write_text("<html></html>", encoding="utf-8")
    (release_dir / "frontend" / "assets").mkdir()
    (release_dir / "frontend" / "assets" / "index-abc.js").write_bytes(b"bundle")
    backend_app = release_dir / "backend" / "app"
    backend_app.mkdir(parents=True)
    (backend_app / "main.py").write_text("print('ok')\n", encoding="utf-8")
    (release_dir / "backend" / "requirements.txt").write_text("fastapi\n", encoding="utf-8")
    write_unified_release_manifest(
        release_dir=release_dir,
        release_id=release_id,
        git_commit="a" * 40,
        frontend_digest="c" * 64,
        backend_fingerprint={"version": "1", "hash": "b" * 64, "production_file_count": 1},
        release_package_id=1,
        package_key="PKG-TEST",
        build_id=1,
        build_key="BLD-TEST",
    )
    assert_materialized_release_artifacts(release_dir)


def test_activate_template_release_switches_current(tmp_path: Path) -> None:
    suite_root = tmp_path / "suite"
    runtime_root = suite_root / "runtime" / "template"
    releases_dir = runtime_root / "releases"
    releases_dir.mkdir(parents=True)

    old_release = releases_dir / "release-001"
    new_release = releases_dir / "release-002"
    _write_release(old_release, "release-001")
    _write_release(new_release, "release-002")

    current_link = runtime_root / "current"
    set_template_current_junction(current_link=current_link, release_path=old_release)
    assert resolve_active_template_release_id(suite_root) == "release-001"

    result = activate_template_release(release_id="release-002", suite_root=suite_root)

    assert result.release_id == "release-002"
    assert result.previous_release_id == "release-001"
    assert resolve_active_template_release_id(suite_root) == "release-002"
    assert (current_link / "manifest.json").is_file()
    manifest = json.loads((current_link / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["release_id"] == "release-002"


def test_activate_template_release_fails_for_missing_release(tmp_path: Path) -> None:
    suite_root = tmp_path / "suite"
    (suite_root / "runtime" / "template" / "releases").mkdir(parents=True)
    with pytest.raises(TemplateActivationError, match="Release not found"):
        activate_template_release(release_id="release-099", suite_root=suite_root)
