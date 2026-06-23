"""WI-ARCH-REG-CONF-002 — configuration registry normalization tests."""

from __future__ import annotations

from pathlib import Path

from app.core.runtime_paths import get_app_root, try_dev_monorepo_root
from app.modules.platform.architecture_navigator.catalog import CATALOG_LINKS
from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.configuration_registry_catalog import (
    CONFIGURATION_REGISTRY_COMPONENTS,
)
from app.modules.platform.architecture_navigator.registry_constants import (
    CONFIGURATION_REGISTRY_COMPONENT_KEYS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    REGISTRY_CONFIGURATION,
)
from app.modules.platform.architecture_navigator.scanner import _iter_scoped_files
from app.modules.platform.architecture_navigator.service import _all_seed_rows, _merged_seed_row


def _effective_configuration_keys() -> set[str]:
    return {
        _merged_seed_row(row)["component_key"]
        for row in _all_seed_rows()
        if _merged_seed_row(row)["registry_key"] == REGISTRY_CONFIGURATION
    }


def test_configuration_registry_has_exactly_thirty_six_active_elements():
    keys = _effective_configuration_keys()
    assert keys == set(CONFIGURATION_REGISTRY_COMPONENT_KEYS)
    assert len(keys) == 36


def test_configuration_seed_matches_constants():
    seed_keys = {row["component_key"] for row in CONFIGURATION_REGISTRY_COMPONENTS}
    assert seed_keys == set(CONFIGURATION_REGISTRY_COMPONENT_KEYS)


def test_configuration_registry_excludes_legacy_keys():
    keys = _effective_configuration_keys()
    assert "published-catalog" not in keys
    assert "dirty-dev-check" not in keys


def test_legacy_keys_migrated_to_archived():
    assert REGISTRY_COMPONENT_MIGRATION["published-catalog"] == REGISTRY_ARCHIVED
    assert REGISTRY_COMPONENT_MIGRATION["dirty-dev-check"] == REGISTRY_ARCHIVED


def test_component_scan_scopes_cover_all_thirty_six_configuration_elements():
    missing = CONFIGURATION_REGISTRY_COMPONENT_KEYS - set(COMPONENT_SCAN_SCOPES.keys())
    assert not missing, f"missing scan scopes: {missing}"


def test_scanner_scopes_return_implementation_files_for_configuration():
    app_root = get_app_root()
    assert app_root is not None
    mono = try_dev_monorepo_root()
    frontend_src = None if mono is None else mono / "frontend" / "src"

    for component_key in CONFIGURATION_REGISTRY_COMPONENT_KEYS:
        scope = COMPONENT_SCAN_SCOPES[component_key]
        backend_files = []
        for prefix in scope.get("backend") or []:
            backend_files.extend(_iter_scoped_files(app_root, prefix))
        frontend_prefixes = scope.get("frontend") or []
        frontend_files = []
        if frontend_src is not None:
            for prefix in frontend_prefixes:
                frontend_files.extend(_iter_scoped_files(frontend_src, prefix))
        if frontend_prefixes and frontend_src is not None:
            assert frontend_files, f"{component_key} frontend scope returned no files"
        elif not frontend_prefixes:
            assert backend_files, f"{component_key} backend scope returned no files"
        else:
            assert frontend_prefixes, f"{component_key} must define frontend scope prefixes"


def test_configuration_document_lists_all_component_keys():
    repo_root = Path(__file__).resolve().parents[2]
    doc_path = repo_root / "docs" / "architecture" / "YASNOPRO_PLATFORM_CONFIGURATION.md"
    text = doc_path.read_text(encoding="utf-8")
    assert "version: v1.1" in text
    for key in CONFIGURATION_REGISTRY_COMPONENT_KEYS:
        assert f"`{key}`" in text, key


def test_published_catalog_links_use_canonical_configuration_key():
    published_links = [
        link
        for link in CATALOG_LINKS
        if link["from"] == "published-catalog" or link["to"] == "published-catalog"
    ]
    assert published_links == []
    canonical_links = [
        link
        for link in CATALOG_LINKS
        if link["from"] == "config-group-published-catalog" or link["to"] == "config-group-published-catalog"
    ]
    assert canonical_links, "expected links referencing config-group-published-catalog"


def test_configuration_hierarchy_has_ten_groups():
    group_keys = {
        row["component_key"]
        for row in CONFIGURATION_REGISTRY_COMPONENTS
        if row.get("metadata_json", {}).get("configuration_group")
    }
    assert len(group_keys) == 10
    assert group_keys.issubset(CONFIGURATION_REGISTRY_COMPONENT_KEYS)


def test_merged_configuration_cards_have_required_fields():
    for key in CONFIGURATION_REGISTRY_COMPONENT_KEYS:
        row = _merged_seed_row(next(r for r in _all_seed_rows() if r["component_key"] == key))
        assert row["registry_key"] == REGISTRY_CONFIGURATION
        assert row["title"]
        assert row["technical_name"]
        assert row["description"]
        assert row["purpose"]
