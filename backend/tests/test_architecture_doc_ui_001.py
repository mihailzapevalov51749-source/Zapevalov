"""WI-ARCH-DOC-UI-001 — registry tab architecture document opening."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi import HTTPException

os.environ.setdefault("YASNOPRO_SKIP_ENVIRONMENT_GUARD", "1")
os.environ.setdefault("APP_ENV", "DEV")
os.environ.setdefault("YASNOPRO_ENV", "DEV")

from app.modules.platform.architecture_navigator import service
from app.modules.platform.architecture_navigator.registry_constants import (
    REGISTRY_CORE,
    REGISTRY_OVERVIEW,
)
from app.modules.platform.architecture_navigator.registry_documents import (
    REGISTRY_DOCUMENT_PATHS,
    resolve_registry_document_path,
)


def test_registry_document_paths_cover_all_navigator_tabs():
    expected_keys = {
        "overview",
        "core",
        "standards",
        "services",
        "modules",
        "components",
        "interface",
        "data",
        "configuration",
    }
    assert set(REGISTRY_DOCUMENT_PATHS.keys()) == expected_keys


def test_resolve_registry_document_path_returns_wi_mapping():
    assert resolve_registry_document_path(REGISTRY_CORE) == (
        "docs/architecture/YASNOPRO_CORE_ARCHITECTURE.md"
    )
    assert resolve_registry_document_path(REGISTRY_OVERVIEW) == (
        "docs/architecture/YASNOPRO_ARCHITECTURE_OVERVIEW.md"
    )


def test_get_registry_document_reads_existing_file(tmp_path, monkeypatch):
    docs_dir = tmp_path / "docs" / "architecture"
    docs_dir.mkdir(parents=True)
    doc_path = docs_dir / "YASNOPRO_CORE_ARCHITECTURE.md"
    doc_path.write_text("# Ядро платформы\n\nОписание ядра.", encoding="utf-8")

    monkeypatch.setattr(service, "try_dev_monorepo_root", lambda: tmp_path)

    result = service.get_registry_document(REGISTRY_CORE)

    assert result.registry_key == REGISTRY_CORE
    assert result.registry_label == "Ядро"
    assert result.document_path == "docs/architecture/YASNOPRO_CORE_ARCHITECTURE.md"
    assert result.document_title == "Ядро платформы"
    assert "Описание ядра." in result.content
    assert result.updated_at is not None
    assert result.updated_at.tzinfo is not None


def test_get_registry_document_missing_file_returns_clear_error(tmp_path, monkeypatch):
    (tmp_path / "docs" / "architecture").mkdir(parents=True)
    monkeypatch.setattr(service, "try_dev_monorepo_root", lambda: tmp_path)

    with pytest.raises(HTTPException) as exc_info:
        service.get_registry_document(REGISTRY_OVERVIEW)

    assert exc_info.value.status_code == 404
    assert "YASNOPRO_ARCHITECTURE_OVERVIEW.md" in str(exc_info.value.detail)


def test_openapi_registry_document_route_registered():
    from app.main import app

    paths = app.openapi()["paths"]
    assert "/dev/architecture/registries/{registry_key}/document" in paths
    assert "get" in paths["/dev/architecture/registries/{registry_key}/document"]
