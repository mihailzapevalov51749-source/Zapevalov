"""Unit tests for runtime path layer (WI-RT-014A)."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from app.core import runtime_paths as rp


@pytest.fixture(autouse=True)
def _clear_runtime_path_cache(monkeypatch):
    rp.get_backend_root.cache_clear()
    rp.get_app_root.cache_clear()
    rp.get_uploads_dir.cache_clear()
    rp.get_data_dir.cache_clear()
    rp.get_suite_root.cache_clear()
    for key in (
        rp.ENV_BACKEND_ROOT,
        rp.ENV_UPLOADS_DIR,
        rp.ENV_DATA_DIR,
        rp.ENV_DOTENV_PATH,
        rp.ENV_SUITE_ROOT,
        "YASNOPRO_ENV",
        "APP_ENV",
    ):
        monkeypatch.delenv(key, raising=False)


def test_backend_root_from_env(tmp_path, monkeypatch):
    custom = tmp_path / "isolated-backend"
    custom.mkdir()
    monkeypatch.setenv(rp.ENV_BACKEND_ROOT, str(custom))
    rp.get_backend_root.cache_clear()
    assert rp.get_backend_root() == custom.resolve()


def test_backend_root_inferred_from_package():
    root = rp.get_backend_root()
    assert root.is_dir()
    assert (root / "app" / "core" / "runtime_paths.py").is_file()


def test_uploads_and_data_dirs_from_env(tmp_path, monkeypatch):
    uploads = tmp_path / "external-uploads"
    data = tmp_path / "external-data"
    uploads.mkdir()
    data.mkdir()
    monkeypatch.setenv(rp.ENV_UPLOADS_DIR, str(uploads))
    monkeypatch.setenv(rp.ENV_DATA_DIR, str(data))
    rp.get_uploads_dir.cache_clear()
    rp.get_data_dir.cache_clear()
    assert rp.get_uploads_dir() == uploads.resolve()
    assert rp.get_data_dir() == data.resolve()


def test_yasii_store_dir_prefers_specific_env(tmp_path, monkeypatch):
    store = tmp_path / "graph-store"
    store.mkdir()
    monkeypatch.setenv("YASII_MEMORY_GRAPH_DIR", str(store))
    assert rp.get_yasii_store_dir("yasii_memory_graph", env_var="YASII_MEMORY_GRAPH_DIR") == store.resolve()


def test_dev_filesystem_scan_only_on_dev(monkeypatch):
    monkeypatch.setenv("YASNOPRO_ENV", "TEMPLATE")
    assert rp.is_dev_filesystem_scan_enabled() is False
    monkeypatch.setenv("YASNOPRO_ENV", "DEV")
    assert rp.is_dev_filesystem_scan_enabled() is True


def test_try_dev_monorepo_root_disabled_for_template(monkeypatch):
    monkeypatch.setenv("YASNOPRO_ENV", "TEMPLATE")
    assert rp.try_dev_monorepo_root() is None


def test_resolve_dotenv_path_explicit(tmp_path, monkeypatch):
    dotenv = tmp_path / ".env.local"
    dotenv.write_text("DATABASE_URL=postgresql://x", encoding="utf-8")
    monkeypatch.setenv(rp.ENV_DOTENV_PATH, str(dotenv))
    assert rp.resolve_dotenv_path() == dotenv.resolve()
