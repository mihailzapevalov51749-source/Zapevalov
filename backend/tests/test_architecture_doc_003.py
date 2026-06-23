"""WI-ARCH-DOC-003 — architecture documents sync after WI-ARCH-FINAL-001."""

from __future__ import annotations

from pathlib import Path

from app.modules.platform.architecture_navigator.registry_constants import (
    CORE_REGISTRY_COMPONENT_KEYS,
    MODULES_REGISTRY_COMPONENT_KEYS,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
MODULES_DOC = REPO_ROOT / "docs/architecture/YASNOPRO_PLATFORM_MODULES.md"
OVERVIEW_DOC = REPO_ROOT / "docs/architecture/YASNOPRO_ARCHITECTURE_OVERVIEW.md"
CORE_DOC = REPO_ROOT / "docs/architecture/YASNOPRO_CORE_ARCHITECTURE.md"

EXPECTED_TAB_ORDER = (
    "Обзор",
    "Ядро",
    "Службы",
    "Модули",
    "Данные",
    "Интерфейс",
    "Компоненты",
    "Конфигурация",
    "Стандарты",
)

FORBIDDEN_MODULE_KEYS = (
    "module-crm",
    "module-projects",
    "module-org-structure",
    "process-engine",
)


def test_modules_doc_contains_six_component_keys():
    text = MODULES_DOC.read_text(encoding="utf-8")
    assert "version: v1.2" in text
    for key in MODULES_REGISTRY_COMPONENT_KEYS:
        assert f"`{key}`" in text, f"missing module component_key {key}"
    assert len(MODULES_REGISTRY_COMPONENT_KEYS) == 6


def test_modules_doc_excludes_legacy_and_process_engine():
    text = MODULES_DOC.read_text(encoding="utf-8")
    table_start = text.index("| component_key |")
    table_end = text.index("**Scanner coverage", table_start)
    registry_table = text[table_start:table_end]
    for forbidden in FORBIDDEN_MODULE_KEYS:
        assert f"`{forbidden}`" not in registry_table, (
            f"forbidden key in modules registry table: {forbidden}"
        )
    for key in MODULES_REGISTRY_COMPONENT_KEYS:
        assert f"`{key}`" in registry_table


def test_overview_doc_contains_tab_order_and_147_elements():
    text = OVERVIEW_DOC.read_text(encoding="utf-8")
    assert "version: v1.1" in text
    assert "**147**" in text or "147 active elements" in text
    tab_section = text.split("## 3.", 1)[1].split("## 4.", 1)[0]
    last_index = -1
    for tab in EXPECTED_TAB_ORDER:
        idx = tab_section.index(f"**{tab}**")
        assert idx > last_index, f"tab order violation at {tab}"
        last_index = idx


def test_overview_doc_configuration_not_releases_home():
    text = OVERVIEW_DOC.read_text(encoding="utf-8")
    assert "Operational home" not in text
    assert "релизы, журнал" not in text
    assert "опубликованная настройка платформы" in text.lower() or "Опубликованная настройка платформы" in text


def test_core_doc_contains_twelve_elements():
    text = CORE_DOC.read_text(encoding="utf-8")
    assert "version: v1.2" in text
    assert "**12 элементов**" in text or "**12 платформенных механизмов**" in text
    assert "**9 элементов**" not in text
    assert "9 механизмов" not in text.split("## 10.", 1)[0]
    section_four = text.split("## 5.", 1)[0]
    for key in CORE_REGISTRY_COMPONENT_KEYS:
        assert f"`{key}`" in section_four, f"missing core component_key {key}"
    assert len(CORE_REGISTRY_COMPONENT_KEYS) == 12
