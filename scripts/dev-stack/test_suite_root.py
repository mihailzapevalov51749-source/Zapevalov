"""Dev-stack suite root resolution tests (WI-INFRA-ROOT-003)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from dev_stack import DevStackError, _resolve_suite_root


def _layout(base: Path) -> tuple[Path, Path]:
    suite = base / "suite"
    monorepo = suite / "portal-constructor-v2"
    monorepo.mkdir(parents=True)
    (monorepo / "backend").mkdir()
    return suite, monorepo


def test_resolve_suite_root_from_manifest_parent(tmp_path):
    suite, monorepo = _layout(tmp_path)
    manifest = {"paths": {"suite_root": ".."}}
    assert _resolve_suite_root(monorepo, manifest) == suite.resolve()


def test_resolve_suite_root_from_env(tmp_path, monkeypatch):
    suite, monorepo = _layout(tmp_path)
    other = tmp_path / "other-suite"
    other.mkdir()
    monkeypatch.setenv("YASNOPRO_SUITE_ROOT", str(other))
    manifest = {"paths": {"suite_root": ".."}}
    assert _resolve_suite_root(monorepo, manifest) == other.resolve()


def test_resolve_suite_root_from_config(tmp_path):
    suite, monorepo = _layout(tmp_path)
    config_dir = monorepo / "config"
    config_dir.mkdir()
    (config_dir / "yasnopro_suite.json").write_text(json.dumps({"suite_root": ".."}), encoding="utf-8")
    manifest = {"paths": {"suite_root": ".."}}
    assert _resolve_suite_root(monorepo, manifest) == suite.resolve()


def test_resolve_suite_root_invalid_env(tmp_path, monkeypatch):
    _, monorepo = _layout(tmp_path)
    monkeypatch.setenv("YASNOPRO_SUITE_ROOT", str(tmp_path / "missing"))
    with pytest.raises(DevStackError, match="YASNOPRO_SUITE_ROOT"):
        _resolve_suite_root(monorepo, {"paths": {"suite_root": ".."}})
