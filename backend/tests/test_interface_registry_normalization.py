"""WI-ARCH-REG-UI-002 — interface registry normalization tests."""

from __future__ import annotations

from pathlib import Path

from app.core.runtime_paths import get_app_root, try_dev_monorepo_root
from app.modules.platform.architecture_navigator.catalog import CATALOG_LINKS
from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.constants import ArchitectureLinkType
from app.modules.platform.architecture_navigator.registry_constants import (
    INTERFACE_REGISTRY_COMPONENT_KEYS,
    LEGACY_INTERFACE_COMPONENT_KEY_RENAMES,
    LEGACY_INTERFACE_SUBSYSTEM_KEYS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    REGISTRY_INTERFACE,
)
from app.modules.platform.architecture_navigator.scanner import _iter_scoped_files
from app.modules.platform.architecture_navigator.service import _all_seed_rows, _merged_seed_row


def _effective_interface_keys() -> set[str]:
    return {
        _merged_seed_row(row)["component_key"]
        for row in _all_seed_rows()
        if _merged_seed_row(row)["registry_key"] == REGISTRY_INTERFACE
    }


def test_interface_registry_has_exactly_twenty_active_elements():
    keys = _effective_interface_keys()
    assert keys == set(INTERFACE_REGISTRY_COMPONENT_KEYS)
    assert len(keys) == 20


def test_interface_registry_excludes_legacy_subsystems():
    keys = _effective_interface_keys()
    assert LEGACY_INTERFACE_SUBSYSTEM_KEYS.isdisjoint(keys)


def test_legacy_subsystems_migrated_to_archived():
    for legacy_key in LEGACY_INTERFACE_SUBSYSTEM_KEYS:
        assert REGISTRY_COMPONENT_MIGRATION[legacy_key] == REGISTRY_ARCHIVED


def test_legacy_interface_keys_renamed_in_seed():
    seed_keys = {row["component_key"] for row in _all_seed_rows()}
    assert "notification-bell" not in seed_keys
    assert "settings-button" not in seed_keys
    assert "notification-center" in seed_keys
    assert "settings-entry" in seed_keys


def test_legacy_interface_rename_map_matches_seed():
    for old_key, new_key in LEGACY_INTERFACE_COMPONENT_KEY_RENAMES.items():
        assert new_key in INTERFACE_REGISTRY_COMPONENT_KEYS
        assert old_key not in _effective_interface_keys()


def test_component_scan_scopes_cover_all_twenty_interface_elements():
    missing = INTERFACE_REGISTRY_COMPONENT_KEYS - set(COMPONENT_SCAN_SCOPES.keys())
    assert not missing, f"missing scan scopes: {missing}"


def test_scanner_scopes_return_implementation_files_for_interface_elements():
    app_root = get_app_root()
    assert app_root is not None
    mono = try_dev_monorepo_root()
    frontend_src = None if mono is None else mono / "frontend" / "src"

    for interface_key in INTERFACE_REGISTRY_COMPONENT_KEYS:
        scope = COMPONENT_SCAN_SCOPES[interface_key]
        backend_files = []
        for prefix in scope.get("backend") or []:
            backend_files.extend(_iter_scoped_files(app_root, prefix))
        frontend_prefixes = scope.get("frontend") or []
        frontend_files = []
        if frontend_src is not None:
            for prefix in frontend_prefixes:
                frontend_files.extend(_iter_scoped_files(frontend_src, prefix))
        if frontend_prefixes and frontend_src is not None:
            assert frontend_files, f"{interface_key} frontend scope returned no files"
        elif not frontend_prefixes:
            assert backend_files, f"{interface_key} backend scope returned no files"
        else:
            assert frontend_prefixes, f"{interface_key} must define frontend scope prefixes"


def test_interface_to_component_links_reference_existing_keys():
    platform_component_keys = {
        row["component_key"]
        for row in _all_seed_rows()
        if _merged_seed_row(row)["registry_key"] == "components"
    }
    interface_links = [
        link
        for link in CATALOG_LINKS
        if link["from"] in INTERFACE_REGISTRY_COMPONENT_KEYS
        and link["to"] in platform_component_keys
        and link["type"] == ArchitectureLinkType.USES.value
    ]
    assert interface_links, "expected interface → platform component USES links"
    for link in interface_links:
        assert link["from"] in INTERFACE_REGISTRY_COMPONENT_KEYS
        assert link["to"] in platform_component_keys


def test_interface_document_lists_twenty_component_keys():
    repo_root = Path(__file__).resolve().parents[2]
    doc_path = repo_root / "docs" / "architecture" / "YASNOPRO_INTERFACE_ELEMENTS.md"
    text = doc_path.read_text(encoding="utf-8")
    for key in INTERFACE_REGISTRY_COMPONENT_KEYS:
        assert f"`{key}`" in text, key


def test_merged_interface_cards_have_required_fields():
    for key in INTERFACE_REGISTRY_COMPONENT_KEYS:
        row = _merged_seed_row(next(r for r in _all_seed_rows() if r["component_key"] == key))
        assert row["registry_key"] == REGISTRY_INTERFACE
        assert row["title"]
        assert row["technical_name"]
        assert row["description"]
        assert row["purpose"]
