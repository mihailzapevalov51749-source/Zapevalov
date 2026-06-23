"""Unit tests for YASNOPRO_SUITE_ROOT resolution (WI-INFRA-ROOT-003, WI-INFRA-ROOT-004)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core import runtime_paths as rp
from app.modules.platform_release_provenance import runtime_artifacts as ra


def _make_monorepo_layout(base: Path) -> tuple[Path, Path]:
    """Return (suite_root, monorepo_root) with minimal tree."""
    suite = base / "suite"
    monorepo = suite / "portal-constructor-v2"
    backend = monorepo / "backend"
    (backend / "app" / "core").mkdir(parents=True)
    (monorepo / "frontend").mkdir()
    (monorepo / "docs").mkdir()
    (suite / "runtime" / "template" / "current").mkdir(parents=True)
    (suite / "runtime" / "template" / "current" / "backend").mkdir()
    return suite, monorepo


@pytest.fixture(autouse=True)
def _clear_suite_root_cache(monkeypatch):
    for key in (
        rp.ENV_SUITE_ROOT,
        rp.ENV_BACKEND_ROOT,
        rp.ENV_UPLOADS_DIR,
        rp.ENV_DATA_DIR,
        rp.ENV_DOTENV_PATH,
        "YASNOPRO_ENV",
        "APP_ENV",
    ):
        monkeypatch.delenv(key, raising=False)
    rp.get_backend_root.cache_clear()
    rp.get_app_root.cache_clear()
    rp.get_uploads_dir.cache_clear()
    rp.get_data_dir.cache_clear()
    rp.get_suite_root.cache_clear()
    ra._fingerprint_module.cache_clear()


def test_all_components_resolve_same_suite_root(tmp_path, monkeypatch):
    """Test 1 — runtime_paths and runtime_artifacts agree on suite root."""
    suite, monorepo = _make_monorepo_layout(tmp_path)
    monkeypatch.setenv(rp.ENV_BACKEND_ROOT, str(monorepo / "backend"))
    rp.get_backend_root.cache_clear()
    rp.get_suite_root.cache_clear()

    from_paths = rp.get_suite_root()
    from_artifacts = ra.get_suite_root()
    runtime_template = rp.runtime_root_for_slot(from_paths, "template")

    assert from_paths == from_artifacts == suite.resolve()
    assert runtime_template == suite / "runtime" / "template"


def test_suite_root_follows_env_on_different_disk(tmp_path, monkeypatch):
    """Test 2 — explicit YASNOPRO_SUITE_ROOT overrides layout (other disk simulation)."""
    suite, monorepo = _make_monorepo_layout(tmp_path)
    other_disk = tmp_path / "drive-d" / "yasnopro-suite"
    (other_disk / "runtime" / "client").mkdir(parents=True)

    monkeypatch.setenv(rp.ENV_BACKEND_ROOT, str(monorepo / "backend"))
    monkeypatch.setenv(rp.ENV_SUITE_ROOT, str(other_disk))
    rp.get_backend_root.cache_clear()
    rp.get_suite_root.cache_clear()

    assert rp.get_suite_root() == other_disk.resolve()
    assert rp.runtime_root_for_slot(rp.get_suite_root(), "client") == other_disk / "runtime" / "client"


def test_suite_root_auto_discovery_without_env(tmp_path, monkeypatch):
    """Test 3 — no ENV: discover suite as monorepo parent when runtime/ exists."""
    suite, monorepo = _make_monorepo_layout(tmp_path)
    monkeypatch.setenv(rp.ENV_BACKEND_ROOT, str(monorepo / "backend"))
    rp.get_backend_root.cache_clear()
    rp.get_suite_root.cache_clear()

    assert rp.get_suite_root() == suite.resolve()


def test_suite_root_without_config_file(tmp_path, monkeypatch):
    """Test 4 — missing config/yasnopro_suite.json falls through to auto-discovery."""
    suite, monorepo = _make_monorepo_layout(tmp_path)
    config_path = monorepo / "config" / "yasnopro_suite.json"
    assert not config_path.exists()

    monkeypatch.setenv(rp.ENV_BACKEND_ROOT, str(monorepo / "backend"))
    rp.get_backend_root.cache_clear()
    rp.get_suite_root.cache_clear()

    assert rp.get_suite_root() == suite.resolve()


def test_runtime_resolution_current_junction(tmp_path, monkeypatch):
    """Test 5 — resolve_release_dir(use_current=True) uses suite runtime/current."""
    suite, monorepo = _make_monorepo_layout(tmp_path)
    release_dir = suite / "runtime" / "template" / "releases" / "release-001"
    release_dir.mkdir(parents=True)
    (release_dir / "manifest.json").write_text("{}", encoding="utf-8")

    current = suite / "runtime" / "template" / "current"
    if current.exists():
        for child in current.iterdir():
            if child.is_dir():
                continue
            child.unlink()
    try:
        current.symlink_to(release_dir, target_is_directory=True)
    except OSError:
        current.rmdir()
        current.symlink_to(release_dir, target_is_directory=True)

    monkeypatch.setenv(rp.ENV_BACKEND_ROOT, str(monorepo / "backend"))
    rp.get_backend_root.cache_clear()
    rp.get_suite_root.cache_clear()

    resolved = ra.resolve_release_dir(
        suite_root=rp.get_suite_root(),
        runtime_slot_key="template",
        use_current=True,
    )
    assert resolved == release_dir.resolve()


def test_suite_root_from_suite_level_config(tmp_path, monkeypatch):
    """WI-INFRA-ROOT-004 — suite-level config at {monorepo.parent}/config/ wins over auto-discovery."""
    suite, monorepo = _make_monorepo_layout(tmp_path)
    suite_config_dir = suite / "config"
    suite_config_dir.mkdir()
    (suite_config_dir / "yasnopro_suite.json").write_text(
        json.dumps({"suite_root": str(suite)}),
        encoding="utf-8",
    )

    monkeypatch.setenv(rp.ENV_BACKEND_ROOT, str(monorepo / "backend"))
    rp.get_backend_root.cache_clear()
    rp.get_suite_root.cache_clear()

    assert rp.get_suite_root() == suite.resolve()


def test_suite_root_from_config_relative(tmp_path, monkeypatch):
    suite, monorepo = _make_monorepo_layout(tmp_path)
    config_dir = monorepo / "config"
    config_dir.mkdir()
    (config_dir / "yasnopro_suite.json").write_text(
        json.dumps({"suite_root": ".."}),
        encoding="utf-8",
    )

    monkeypatch.setenv(rp.ENV_BACKEND_ROOT, str(monorepo / "backend"))
    rp.get_backend_root.cache_clear()
    rp.get_suite_root.cache_clear()

    assert rp.get_suite_root() == suite.resolve()


def test_invalid_env_suite_root_raises(tmp_path, monkeypatch):
    monkeypatch.setenv(rp.ENV_SUITE_ROOT, str(tmp_path / "missing-suite"))
    rp.get_suite_root.cache_clear()
    with pytest.raises(RuntimeError, match="YASNOPRO_SUITE_ROOT"):
        rp.get_suite_root()
