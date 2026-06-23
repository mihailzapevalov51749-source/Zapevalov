"""WI-ARCH-REG-STD-002 — standards registry normalization tests."""

from __future__ import annotations

from pathlib import Path

from app.core.runtime_paths import get_app_root, try_dev_monorepo_root
from app.modules.platform.architecture_navigator.catalog import CATALOG_LINKS
from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.standards_registry_catalog import (
    STANDARDS_REGISTRY_COMPONENTS,
)
from app.modules.platform.architecture_navigator.registry_constants import (
    LEGACY_STANDARDS_COMPONENT_KEYS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    REGISTRY_STANDARDS,
    STANDARDS_REGISTRY_COMPONENT_KEYS,
)
from app.modules.platform.architecture_navigator.scanner import _iter_scoped_files
from app.modules.platform.architecture_navigator.service import _all_seed_rows, _merged_seed_row


def _effective_standards_keys() -> set[str]:
    return {
        _merged_seed_row(row)["component_key"]
        for row in _all_seed_rows()
        if _merged_seed_row(row)["registry_key"] == REGISTRY_STANDARDS
    }


def test_standards_registry_has_exactly_thirty_five_active_elements():
    keys = _effective_standards_keys()
    assert keys == set(STANDARDS_REGISTRY_COMPONENT_KEYS)
    assert len(keys) == 35


def test_standards_seed_matches_constants():
    seed_keys = {row["component_key"] for row in STANDARDS_REGISTRY_COMPONENTS}
    assert seed_keys == set(STANDARDS_REGISTRY_COMPONENT_KEYS)


def test_standards_registry_excludes_legacy_keys():
    keys = _effective_standards_keys()
    for legacy_key in LEGACY_STANDARDS_COMPONENT_KEYS:
        assert legacy_key not in keys


def test_legacy_standards_migrated_to_archived():
    for legacy_key in LEGACY_STANDARDS_COMPONENT_KEYS:
        assert REGISTRY_COMPONENT_MIGRATION[legacy_key] == REGISTRY_ARCHIVED


def test_standards_has_twelve_constitution_norms():
    constitution = {
        key
        for key in STANDARDS_REGISTRY_COMPONENT_KEYS
        if key.startswith("constitution-norm-")
    }
    assert len(constitution) == 12


def test_standards_has_three_architectural_principles():
    principles = {
        key
        for key in STANDARDS_REGISTRY_COMPONENT_KEYS
        if key.startswith("decision-")
    }
    assert len(principles) == 3


def test_standards_group_counts():
    groups = {
        "development": {k for k in STANDARDS_REGISTRY_COMPONENT_KEYS if k.startswith("standard-dev-")},
        "interface": {k for k in STANDARDS_REGISTRY_COMPONENT_KEYS if k.startswith("standard-ui-")},
        "data": {k for k in STANDARDS_REGISTRY_COMPONENT_KEYS if k.startswith("standard-data-")},
        "publication": {k for k in STANDARDS_REGISTRY_COMPONENT_KEYS if k.startswith("standard-pub-")},
    }
    assert len(groups["development"]) == 10
    assert len(groups["interface"]) == 5
    assert len(groups["data"]) == 2
    assert len(groups["publication"]) == 3


def test_component_scan_scopes_cover_all_thirty_five_standards_elements():
    missing = STANDARDS_REGISTRY_COMPONENT_KEYS - set(COMPONENT_SCAN_SCOPES.keys())
    assert not missing, f"missing scan scopes: {missing}"


def test_scanner_scopes_return_implementation_files_for_standards():
    app_root = get_app_root()
    assert app_root is not None
    mono = try_dev_monorepo_root()
    frontend_src = None if mono is None else mono / "frontend" / "src"

    for component_key in STANDARDS_REGISTRY_COMPONENT_KEYS:
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


def test_standards_document_lists_all_component_keys():
    repo_root = Path(__file__).resolve().parents[2]
    doc_path = repo_root / "docs" / "architecture" / "YASNOPRO_PLATFORM_STANDARDS.md"
    text = doc_path.read_text(encoding="utf-8")
    assert "version: v1.1" in text
    for key in STANDARDS_REGISTRY_COMPONENT_KEYS:
        assert f"`{key}`" in text, key


def test_legacy_standard_links_use_canonical_keys():
    for legacy_key in LEGACY_STANDARDS_COMPONENT_KEYS:
        legacy_links = [
            link
            for link in CATALOG_LINKS
            if link["from"] == legacy_key or link["to"] == legacy_key
        ]
        assert legacy_links == [], legacy_key


def test_merged_standards_cards_have_required_fields():
    for key in STANDARDS_REGISTRY_COMPONENT_KEYS:
        row = _merged_seed_row(next(r for r in _all_seed_rows() if r["component_key"] == key))
        assert row["registry_key"] == REGISTRY_STANDARDS
        assert row["title"]
        assert row["technical_name"]
        assert row["description"]
        assert row["purpose"]
