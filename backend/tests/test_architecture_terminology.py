"""WI-ARCH-TERM-001 — architecture terminology guards."""

from __future__ import annotations

from pathlib import Path

from app.modules.platform.architecture_navigator.service import _all_seed_rows, _merged_seed_row
from app.modules.platform.architecture_navigator.registry_constants import REGISTRY_CORE

REPO_ROOT = Path(__file__).resolve().parents[2]
ARCH_DOCS = [
    REPO_ROOT / "docs/architecture/YASNOPRO_CORE_ARCHITECTURE.md",
    REPO_ROOT / "docs/architecture/YASNOPRO_ARCHITECTURE_CLASSIFICATION.md",
    REPO_ROOT / "docs/architecture/YASNOPRO_ARCHITECTURE_CLASSIFICATION_METHODOLOGY.md",
    REPO_ROOT / "docs/architecture/YASNOPRO_PLATFORM_DATA.md",
    REPO_ROOT / "docs/architecture/YASNOPRO_PLATFORM_CONFIGURATION.md",
]

FORBIDDEN_ARCHITECTURAL = (
    "Тип объекта",
    "Типы объектов",
    "тип объекта",
    "типы объектов",
)


def test_core_registry_uses_object_not_object_type_title():
    core_titles = {
        _merged_seed_row(row)["title"]
        for row in _all_seed_rows()
        if _merged_seed_row(row).get("registry_key") == REGISTRY_CORE
    }
    assert "Объект" in core_titles
    assert "Типы объектов" not in core_titles
    assert "Тип объекта" not in core_titles
    assert "Экземпляры объектов" not in core_titles
    assert len(core_titles) == 9


def test_object_types_engine_architectural_title():
    row = _merged_seed_row(
        next(r for r in _all_seed_rows() if r["component_key"] == "object-types-engine")
    )
    assert row["title"] == "Объект"
    assert row["component_key"] == "object-types-engine"


def test_compositional_architecture_docs_avoid_legacy_object_type_terms():
    violations: list[str] = []
    for path in ARCH_DOCS:
        text = path.read_text(encoding="utf-8")
        for term in FORBIDDEN_ARCHITECTURAL:
            if term in text:
                violations.append(f"{path.name}: {term}")
    assert not violations, "Legacy terms found: " + "; ".join(violations)
