"""Load constitution norms from YASNOPRO_PLATFORM_STANDARDS.md (projection, read-only)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.core.runtime_paths import get_dev_docs_architecture_dir
from app.modules.platform.architecture_governance.governance_catalog import (
    CONSTITUTION_NORM_LINKS,
    CONSTITUTION_SOURCE_DOCUMENT,
    CONSTITUTION_SOURCE_SECTION,
)

_SECTION_START = "## 3. Архитектурная конституция"
_SECTION_END = "## 4."
_NORM_PATTERN = re.compile(
    r"^###\s+(\d+)\.\s+(.+?)\s*\n(.*?)(?=^###\s+\d+\.\s+|^---\s*$|\Z)",
    re.MULTILINE | re.DOTALL,
)
_FIELD_PATTERN = re.compile(r"^\*\*(.+?)\*\*\s*\n(.+?)(?=^\*\*|\Z)", re.MULTILINE | re.DOTALL)


@dataclass(frozen=True)
class ConstitutionNormDraft:
    number: int
    title: str
    purpose: str
    regulates: str
    importance: str
    violation: str
    criticality: str


def _standards_path() -> Path | None:
    docs_dir = get_dev_docs_architecture_dir()
    if docs_dir is None:
        return None
    candidate = docs_dir / "YASNOPRO_PLATFORM_STANDARDS.md"
    return candidate if candidate.is_file() else None


def _extract_section(text: str) -> str:
    start = text.find(_SECTION_START)
    if start < 0:
        return ""
    tail = text[start + len(_SECTION_START) :]
    end = tail.find(_SECTION_END)
    return tail[:end] if end >= 0 else tail


def _parse_fields(block: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for match in _FIELD_PATTERN.finditer(block):
        key = match.group(1).strip().lower()
        value = " ".join(line.strip() for line in match.group(2).strip().splitlines() if line.strip())
        fields[key] = value
    return fields


def _fallback_norms() -> list[ConstitutionNormDraft]:
    titles = [
        "Десять архитектурных категорий",
        "Один элемент — одна основная категория",
        "Методика архитектурной классификации",
        "Отображаемое название не является идентификатором",
        "Единый источник истины",
        "Разделение платформы и компаний",
        "Разработка → Эталон → Компания",
        "Изоляция сред",
        "Изолированная среда компании",
        "Отсутствие дублирования логики",
        "Стандарт системных сущностей",
        "Контракт идентичности сущностей",
    ]
    return [
        ConstitutionNormDraft(
            number=index,
            title=title,
            purpose="",
            regulates="",
            importance="",
            violation="",
            criticality="Критический" if index <= 9 else "Высокий",
        )
        for index, title in enumerate(titles, start=1)
    ]


@lru_cache(maxsize=1)
def load_constitution_norms() -> list[ConstitutionNormDraft]:
    path = _standards_path()
    if path is None:
        return _fallback_norms()

    text = path.read_text(encoding="utf-8")
    section = _extract_section(text)
    if not section.strip():
        return _fallback_norms()

    norms: list[ConstitutionNormDraft] = []
    for match in _NORM_PATTERN.finditer(section):
        number = int(match.group(1))
        title = match.group(2).strip()
        block = match.group(3)
        fields = _parse_fields(block)
        norms.append(
            ConstitutionNormDraft(
                number=number,
                title=title,
                purpose=fields.get("назначение", ""),
                regulates=fields.get("что регулирует", ""),
                importance=fields.get("почему важно", ""),
                violation=fields.get("при нарушении", ""),
                criticality=fields.get("критичность:", fields.get("критичность", "")),
            )
        )

    if len(norms) != 12:
        return _fallback_norms()
    return sorted(norms, key=lambda item: item.number)


def build_constitution_norm_payload(norm: ConstitutionNormDraft) -> dict:
    links = CONSTITUTION_NORM_LINKS.get(norm.number, {})
    description_parts = [part for part in (norm.purpose, norm.regulates) if part]
    return {
        "number": norm.number,
        "title": norm.title,
        "description": " ".join(description_parts).strip(),
        "purpose": norm.purpose,
        "regulates": norm.regulates,
        "importance": norm.importance,
        "violation": norm.violation,
        "criticality": norm.criticality.replace(":", "").strip() or None,
        "linked_restrictions": list(links.get("linked_restrictions", [])),
        "related_adrs": list(links.get("related_adrs", [])),
        "related_categories": list(links.get("related_categories", [])),
        "source_document": CONSTITUTION_SOURCE_DOCUMENT,
        "source_section": CONSTITUTION_SOURCE_SECTION,
    }
