"""Load ADR markdown files from docs/architecture/adr (read-only catalog)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.core.runtime_paths import get_dev_docs_architecture_dir

_STATUS_ACCEPTED = {"accepted", "принят", "принято"}
_STATUS_DRAFT = {"draft", "черновик", "в работе", "proposed", "предложен"}
_STATUS_ARCHIVED = {"superseded", "retired", "архив", "устарел", "deprecated"}


@dataclass(frozen=True)
class AdrDraft:
    slug: str
    filename: str
    title: str
    status: str
    status_group: str
    date: str
    summary: str
    related_adrs: list[str]
    related_categories: list[str]
    related_services: list[str]
    document_path: str


def _adr_dir() -> Path | None:
    docs_dir = get_dev_docs_architecture_dir()
    if docs_dir is None:
        return None
    adr_dir = docs_dir / "adr"
    return adr_dir if adr_dir.is_dir() else None


def _normalize_status(raw: str) -> tuple[str, str]:
    value = raw.strip().lower()
    if any(token in value for token in _STATUS_ARCHIVED):
        return raw.strip(), "archived"
    if any(token in value for token in _STATUS_DRAFT):
        return raw.strip(), "in_progress"
    if any(token in value for token in _STATUS_ACCEPTED):
        return raw.strip(), "accepted"
    return raw.strip() or "Draft", "in_progress"


def _first_heading(text: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return ""


def _section_text(text: str, heading: str) -> str:
    pattern = re.compile(
        rf"^##\s+{re.escape(heading)}\s*\n(.*?)(?=^##\s+|\Z)",
        re.MULTILINE | re.DOTALL | re.IGNORECASE,
    )
    match = pattern.search(text)
    if not match:
        return ""
    return match.group(1).strip()


def _bullet_values(text: str, label: str) -> list[str]:
    section = _section_text(text, label)
    if not section:
        return []
    values: list[str] = []
    for line in section.splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            values.append(stripped[2:].strip())
    return values


def _parse_adr_file(path: Path) -> AdrDraft | None:
    text = path.read_text(encoding="utf-8")
    title = _first_heading(text) or path.stem
    status_raw = _section_text(text, "Статус") or _section_text(text, "Status")
    status_line = status_raw.splitlines()[0] if status_raw else "Draft"
    status_line = status_line.replace("**", "").strip()
    status, status_group = _normalize_status(status_line)

    date_section = _section_text(text, "Дата") or _section_text(text, "Date")
    date_value = date_section.splitlines()[0].strip() if date_section else ""

    slug_section = _section_text(text, "Slug")
    slug = slug_section.strip("` ").splitlines()[0].strip() if slug_section else path.stem.lower()

    context = _section_text(text, "1. Контекст") or _section_text(text, "Контекст")
    summary_lines = [line.strip() for line in context.splitlines() if line.strip()]
    summary = " ".join(summary_lines[:3])[:600]

    related = _bullet_values(text, "Связанные материалы") + _bullet_values(text, "Related")
    related_adrs = [
        item
        for item in related
        if item.upper().startswith("ADR-") or "adr-" in item.lower()
    ]

    return AdrDraft(
        slug=slug,
        filename=path.name,
        title=title,
        status=status,
        status_group=status_group,
        date=date_value,
        summary=summary,
        related_adrs=related_adrs[:12],
        related_categories=[],
        related_services=[],
        document_path=f"docs/architecture/adr/{path.name}",
    )


@lru_cache(maxsize=1)
def load_adr_catalog() -> list[AdrDraft]:
    adr_dir = _adr_dir()
    if adr_dir is None:
        return []

    items: list[AdrDraft] = []
    for path in sorted(adr_dir.glob("ADR-*.md")):
        parsed = _parse_adr_file(path)
        if parsed is not None:
            items.append(parsed)
    return items


def get_adr_by_slug(slug: str) -> AdrDraft | None:
    normalized = str(slug or "").strip().lower()
    for item in load_adr_catalog():
        if item.slug.lower() == normalized or item.filename.lower().replace(".md", "") == normalized:
            return item
    return None
