"""WI-ARCH-REG-MOD-002 — modules registry normalization tests."""

from __future__ import annotations

from pathlib import Path

from app.core.runtime_paths import get_app_root, try_dev_monorepo_root
from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.registry_constants import (
    CORE_REGISTRY_COMPONENT_KEYS,
    LEGACY_MODULE_COMPONENT_KEYS,
    MODULES_REGISTRY_COMPONENT_KEYS,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    REGISTRY_CORE,
    REGISTRY_MODULES,
)
from app.modules.platform.architecture_navigator.scanner import _iter_scoped_files
from app.modules.platform.architecture_navigator.service import _all_seed_rows, _merged_seed_row
from app.modules.platform_modules.constants import PLATFORM_MODULE_SEED


def _effective_modules_keys() -> set[str]:
    return {
        _merged_seed_row(row)["component_key"]
        for row in _all_seed_rows()
        if _merged_seed_row(row)["registry_key"] == REGISTRY_MODULES
    }


def test_modules_registry_has_exactly_six_active_elements():
    keys = _effective_modules_keys()
    assert keys == set(MODULES_REGISTRY_COMPONENT_KEYS)
    assert len(keys) == 6


def test_modules_registry_excludes_legacy_and_process_engine():
    keys = _effective_modules_keys()
    assert "process-engine" not in keys
    assert LEGACY_MODULE_COMPONENT_KEYS.isdisjoint(keys)


def test_process_engine_not_migrated_to_modules():
    assert "process-engine" not in REGISTRY_COMPONENT_MIGRATION


def test_process_engine_in_core_registry_keys():
    assert "process-engine" in CORE_REGISTRY_COMPONENT_KEYS
    assert len(CORE_REGISTRY_COMPONENT_KEYS) == 12


def test_legacy_module_rows_migrated_to_archived():
    for legacy_key in LEGACY_MODULE_COMPONENT_KEYS:
        assert REGISTRY_COMPONENT_MIGRATION[legacy_key] == REGISTRY_ARCHIVED


def test_component_scan_scopes_cover_all_six_modules():
    missing = MODULES_REGISTRY_COMPONENT_KEYS - set(COMPONENT_SCAN_SCOPES.keys())
    assert not missing, f"missing scan scopes: {missing}"


def test_scanner_scopes_return_implementation_files_for_modules():
    app_root = get_app_root()
    assert app_root is not None
    mono = try_dev_monorepo_root()
    frontend_src = None if mono is None else mono / "frontend" / "src"

    for module_key in MODULES_REGISTRY_COMPONENT_KEYS:
        scope = COMPONENT_SCAN_SCOPES[module_key]
        backend_files = []
        for prefix in scope.get("backend") or []:
            backend_files.extend(_iter_scoped_files(app_root, prefix))
        assert backend_files, f"{module_key} backend scope returned no files"
        if frontend_src is not None:
            frontend_files = []
            for prefix in scope.get("frontend") or []:
                frontend_files.extend(_iter_scoped_files(frontend_src, prefix))
            assert frontend_files, f"{module_key} frontend scope returned no files"


def test_platform_module_seed_has_six_runtime_modules():
    keys = {item["module_key"] for item in PLATFORM_MODULE_SEED}
    assert keys == {
        "runtime.chat",
        "runtime.calendar",
        "runtime.notifications",
        "runtime.documents",
        "runtime.bpmn",
        "runtime.yasii",
    }
    assert "runtime.processes" not in keys
    assert "runtime.org_structure" not in keys


def test_platform_module_seed_active_modules_match_implementation():
    by_key = {item["module_key"]: item for item in PLATFORM_MODULE_SEED}
    assert by_key["runtime.chat"]["status"] == "active"
    assert by_key["runtime.calendar"]["status"] == "active"
    assert by_key["runtime.notifications"]["status"] == "active"
    assert by_key["runtime.documents"]["status"] == "active"
    assert by_key["runtime.yasii"]["status"] == "active"
    assert by_key["runtime.bpmn"]["status"] == "planned"


def test_modules_document_exists():
    repo_root = Path(__file__).resolve().parents[2]
    doc_path = repo_root / "docs" / "architecture" / "YASNOPRO_PLATFORM_MODULES.md"
    text = doc_path.read_text(encoding="utf-8")
    for title in ("Чат", "Календарь", "Документы", "Уведомления", "BPMN", "ЯСИИ"):
        assert title in text
