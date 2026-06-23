"""WI-ARCH-REG-DATA-002 — data registry normalization tests."""

from __future__ import annotations

from pathlib import Path

from app.core.runtime_paths import get_app_root, try_dev_monorepo_root
from app.modules.platform.architecture_navigator.component_scan_scopes import COMPONENT_SCAN_SCOPES
from app.modules.platform.architecture_navigator.registry_constants import (
    CORE_REGISTRY_COMPONENT_KEYS,
    DATA_REGISTRY_COMPONENT_KEYS,
    LEGACY_DATA_COMPONENT_KEYS,
    LEGACY_DATA_COMPONENT_KEY_RENAMES,
    REGISTRY_ARCHIVED,
    REGISTRY_COMPONENT_MIGRATION,
    REGISTRY_CORE,
    REGISTRY_DATA,
)
from app.modules.platform.architecture_navigator.scanner import _iter_scoped_files
from app.modules.platform.architecture_navigator.service import _all_seed_rows, _merged_seed_row


def _effective_data_keys() -> set[str]:
    return {
        _merged_seed_row(row)["component_key"]
        for row in _all_seed_rows()
        if _merged_seed_row(row)["registry_key"] == REGISTRY_DATA
    }


def test_data_registry_has_exactly_eleven_active_elements():
    keys = _effective_data_keys()
    assert keys == set(DATA_REGISTRY_COMPONENT_KEYS)
    assert len(keys) == 11


def test_data_registry_excludes_mechanisms_and_legacy_contours():
    keys = _effective_data_keys()
    assert "event-engine" not in keys
    assert "entity-engine" not in keys
    assert "object-schema-data" not in keys
    assert LEGACY_DATA_COMPONENT_KEYS.isdisjoint(keys)


def test_business_records_duplicate_contours_consolidated():
    keys = _effective_data_keys()
    assert "runtime-entities-data" not in keys
    assert "business-records-data" in keys
    assert LEGACY_DATA_COMPONENT_KEY_RENAMES["runtime-entities-data"] == "business-records-data"


def test_journal_contours_consolidated_into_journals_data():
    keys = _effective_data_keys()
    assert "journals-data" in keys
    assert "platform-audit-journal-data" not in keys
    assert "event-journal-core" not in keys


def test_event_engine_in_core_not_data():
    assert "event-engine" in CORE_REGISTRY_COMPONENT_KEYS
    assert REGISTRY_COMPONENT_MIGRATION.get("event-engine") != REGISTRY_DATA


def test_legacy_data_rows_migrated_to_archived():
    for legacy_key in LEGACY_DATA_COMPONENT_KEYS:
        assert REGISTRY_COMPONENT_MIGRATION[legacy_key] == REGISTRY_ARCHIVED


def test_version_pin_not_in_data_registry():
    assert REGISTRY_COMPONENT_MIGRATION["version-pin"] == REGISTRY_ARCHIVED
    assert "version-pin" not in _effective_data_keys()


def test_component_scan_scopes_cover_all_eleven_data_contours():
    missing = DATA_REGISTRY_COMPONENT_KEYS - set(COMPONENT_SCAN_SCOPES.keys())
    assert not missing, f"missing scan scopes: {missing}"


def test_scanner_scopes_return_implementation_files_for_data_contours():
    app_root = get_app_root()
    assert app_root is not None
    mono = try_dev_monorepo_root()
    frontend_src = None if mono is None else mono / "frontend" / "src"

    for data_key in DATA_REGISTRY_COMPONENT_KEYS:
        scope = COMPONENT_SCAN_SCOPES[data_key]
        backend_files = []
        for prefix in scope.get("backend") or []:
            backend_files.extend(_iter_scoped_files(app_root, prefix))
        assert backend_files, f"{data_key} backend scope returned no files"
        frontend_prefixes = scope.get("frontend") or []
        if frontend_prefixes and frontend_src is not None:
            frontend_files = []
            for prefix in frontend_prefixes:
                frontend_files.extend(_iter_scoped_files(frontend_src, prefix))
            assert frontend_files, f"{data_key} frontend scope returned no files"


def test_data_document_lists_eleven_component_keys():
    repo_root = Path(__file__).resolve().parents[2]
    doc_path = repo_root / "docs" / "architecture" / "YASNOPRO_PLATFORM_DATA.md"
    text = doc_path.read_text(encoding="utf-8")
    for key in DATA_REGISTRY_COMPONENT_KEYS:
        assert f"`{key}`" in text, key
    for title in (
        "Метаданные структуры",
        "Бизнес-записи",
        "Журналы",
        "Метаданные файлов",
    ):
        assert title in text


def test_merged_data_cards_have_required_fields():
    for key in DATA_REGISTRY_COMPONENT_KEYS:
        row = _merged_seed_row(next(r for r in _all_seed_rows() if r["component_key"] == key))
        assert row["registry_key"] == REGISTRY_DATA
        assert row["title"]
        assert row["technical_name"]
        assert row["description"]
        assert row["purpose"]
