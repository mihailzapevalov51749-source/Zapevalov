"""WI-ARCH-DOC-002 — complete registry document map and new architecture docs."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

os.environ.setdefault("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")
os.environ.setdefault("APP_ENV", "DEV")
os.environ.setdefault("YASNOPRO_ENV", "DEV")

from app.core.runtime_paths import try_dev_monorepo_root
from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.registry_constants import REGISTRY_ORDER
from app.modules.platform.architecture_navigator.registry_documents import REGISTRY_DOCUMENT_PATHS


def _monorepo_root() -> Path:
    root = try_dev_monorepo_root()
    if root is None:
        pytest.skip("DEV monorepo root unavailable")
    return root


def test_all_registry_documents_exist_on_disk():
    mono = _monorepo_root()
    missing: list[str] = []
    for registry_key in REGISTRY_ORDER:
        relative_path = REGISTRY_DOCUMENT_PATHS.get(registry_key)
        assert relative_path is not None, registry_key
        absolute_path = mono / relative_path
        if not absolute_path.is_file():
            missing.append(relative_path)
    assert missing == [], f"missing architecture documents: {missing}"


@pytest.mark.parametrize("registry_key", list(REGISTRY_DOCUMENT_PATHS.keys()))
def test_get_registry_document_returns_content_for_each_tab(registry_key: str):
    mono = _monorepo_root()
    if mono is None:
        pytest.skip("DEV monorepo root unavailable")

    result = service.get_registry_document(registry_key)

    assert result.registry_key == registry_key
    assert result.document_path == REGISTRY_DOCUMENT_PATHS[registry_key]
    assert result.content.strip()
    assert result.document_title
    assert result.updated_at is not None


def test_new_documents_have_expected_filenames():
    mono = _monorepo_root()
    overview = mono / REGISTRY_DOCUMENT_PATHS["overview"]
    interface = mono / REGISTRY_DOCUMENT_PATHS["interface"]
    assert overview.name == "YASNOPRO_ARCHITECTURE_OVERVIEW.md"
    assert interface.name == "YASNOPRO_PLATFORM_UI.md"
    assert "# Обзор архитектуры платформы" in overview.read_text(encoding="utf-8")
    assert "# Пользовательский интерфейс платформы" in interface.read_text(encoding="utf-8")
