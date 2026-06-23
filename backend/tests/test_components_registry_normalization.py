"""WI-ARCH-REG-COMP-002 — components registry normalization tests."""

from __future__ import annotations

from pathlib import Path

from app.core.runtime_paths import get_app_root, try_dev_monorepo_root
from app.modules.platform.architecture_navigator.catalog import CATALOG_LINKS
from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.constants import ArchitectureLinkType
from app.modules.platform.architecture_navigator.registry_constants import (
    COMPONENTS_REGISTRY_COMPONENT_KEYS,
    COMPONENTS_REGISTRY_ELEMENT_STATUS,
    ELEMENT_STATUS_PARTIAL,
    ELEMENT_STATUS_PLANNED,
    INTERFACE_REGISTRY_COMPONENT_KEYS,
    LEGACY_COMPONENT_DISPLAY_NAMES,
    REGISTRY_COMPONENTS,
)
from app.modules.platform.architecture_navigator.scanner import _iter_scoped_files
from app.modules.platform.architecture_navigator.service import _all_seed_rows, _merged_seed_row


def _effective_component_keys() -> set[str]:
    return {
        _merged_seed_row(row)["component_key"]
        for row in _all_seed_rows()
        if _merged_seed_row(row)["registry_key"] == REGISTRY_COMPONENTS
    }


def test_components_registry_has_exactly_eighteen_active_elements():
    keys = _effective_component_keys()
    assert keys == set(COMPONENTS_REGISTRY_COMPONENT_KEYS)
    assert len(keys) == 18


def test_components_registry_excludes_empty_and_error_state_patterns():
    keys = _effective_component_keys()
    assert "empty-state" not in keys
    assert "error-state" not in keys
    assert "EmptyState" not in keys
    assert "ErrorState" not in keys


def test_legacy_component_display_names_not_in_merged_seed():
    for component_key, legacy_name in LEGACY_COMPONENT_DISPLAY_NAMES.items():
        row = _merged_seed_row(next(r for r in _all_seed_rows() if r["component_key"] == component_key))
        assert row["technical_name"] != legacy_name or legacy_name.startswith("Platform")
        assert row["title"] != legacy_name


def test_component_element_status_map_covers_all_eighteen():
    assert set(COMPONENTS_REGISTRY_ELEMENT_STATUS.keys()) == set(COMPONENTS_REGISTRY_COMPONENT_KEYS)


def test_planned_and_partial_components_have_expected_status():
    assert COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-kanban"] == ELEMENT_STATUS_PLANNED
    assert COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-calendar"] == ELEMENT_STATUS_PLANNED
    assert COMPONENTS_REGISTRY_ELEMENT_STATUS["platform-context-menu"] == ELEMENT_STATUS_PARTIAL
    assert COMPONENTS_REGISTRY_ELEMENT_STATUS["object-picker"] == ELEMENT_STATUS_PARTIAL
    assert COMPONENTS_REGISTRY_ELEMENT_STATUS["file-picker"] == ELEMENT_STATUS_PARTIAL


def test_component_scan_scopes_cover_all_eighteen_components():
    missing = COMPONENTS_REGISTRY_COMPONENT_KEYS - set(COMPONENT_SCAN_SCOPES.keys())
    assert not missing, f"missing scan scopes: {missing}"


def test_scanner_scopes_return_implementation_files_for_components():
    app_root = get_app_root()
    assert app_root is not None
    mono = try_dev_monorepo_root()
    frontend_src = None if mono is None else mono / "frontend" / "src"

    for component_key in COMPONENTS_REGISTRY_COMPONENT_KEYS:
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


def test_interface_to_component_links_reference_existing_keys():
    platform_component_keys = _effective_component_keys()
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


def test_expected_interface_component_links_present():
    uses = {
        (link["from"], link["to"])
        for link in CATALOG_LINKS
        if link["type"] == ArchitectureLinkType.USES.value
    }
    expected = {
        ("side-navigation", "platform-sidebar"),
        ("breadcrumbs", "platform-breadcrumbs"),
        ("context-menu", "platform-context-menu"),
        ("modal-zone", "platform-modal"),
        ("entity-card", "platform-card"),
        ("workspace-tabs", "platform-tabs"),
        ("action-panel", "platform-toolbar"),
        ("notification-center", "platform-notification"),
        ("picker-panel", "object-picker"),
        ("picker-panel", "user-picker"),
        ("picker-panel", "file-picker"),
        ("view-surface", "platform-kanban"),
        ("view-surface", "platform-calendar"),
    }
    assert expected.issubset(uses)


def test_components_document_lists_eighteen_component_keys():
    repo_root = Path(__file__).resolve().parents[2]
    doc_path = repo_root / "docs" / "architecture" / "YASNOPRO_PLATFORM_COMPONENTS.md"
    text = doc_path.read_text(encoding="utf-8")
    for key in COMPONENTS_REGISTRY_COMPONENT_KEYS:
        assert f"`{key}`" in text, key
    main_body = text.split("## UX Patterns")[0]
    assert "#### EmptyState" not in main_body
    assert "#### ErrorState" not in main_body


def test_merged_component_cards_have_required_fields():
    for key in COMPONENTS_REGISTRY_COMPONENT_KEYS:
        row = _merged_seed_row(next(r for r in _all_seed_rows() if r["component_key"] == key))
        assert row["registry_key"] == REGISTRY_COMPONENTS
        assert row["title"]
        assert row["technical_name"]
        assert row["description"]
        assert row["purpose"]
