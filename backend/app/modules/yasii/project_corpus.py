"""Project Knowledge Corpus (P11-W01) — deterministic project knowledge layer, no vectors/LLM."""

from __future__ import annotations

import re
from enum import Enum
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, Field

from app.modules.platform_dashboard.yasii_catalog import (
    YASII_STAGES,
    YASII_WORK_ITEMS,
    YasiiWorkItemDefinition,
)
from app.core.runtime_paths import (
    get_app_root,
    get_dev_docs_dirs,
    is_dev_filesystem_scan_enabled,
)

PROJECT_CORPUS_SCHEMA_VERSION = "0.1.0"
MAX_SECTION_CONTENT_CHARS = 2400
MAX_SEARCH_RESULTS = 8
MAX_BULLET_LINES = 12


class KnowledgeDocumentType(str, Enum):
    ARCHITECTURE = "ARCHITECTURE"
    ADR = "ADR"
    ROADMAP = "ROADMAP"
    STATUS = "STATUS"
    README = "README"
    TASKS = "TASKS"
    CATALOG = "CATALOG"
    MIGRATION = "MIGRATION"
    DESIGNER = "DESIGNER"
    RUNTIME = "RUNTIME"
    GENERAL = "GENERAL"


class KnowledgeReference(BaseModel):
    documentId: str
    documentPath: str
    sectionTitle: str = ""
    documentType: KnowledgeDocumentType = KnowledgeDocumentType.GENERAL


class KnowledgeSection(BaseModel):
    sectionId: str = Field(default_factory=lambda: f"section-{uuid4().hex[:12]}")
    documentId: str
    sectionTitle: str = ""
    content: str = ""
    tags: list[str] = Field(default_factory=list)


class KnowledgeDocument(BaseModel):
    documentId: str = Field(default_factory=lambda: f"doc-{uuid4().hex[:12]}")
    documentType: KnowledgeDocumentType = KnowledgeDocumentType.GENERAL
    documentPath: str
    title: str = ""
    tags: list[str] = Field(default_factory=list)
    sections: list[KnowledgeSection] = Field(default_factory=list)


class KnowledgeCorpus(BaseModel):
    schemaVersion: str = Field(default=PROJECT_CORPUS_SCHEMA_VERSION)
    corpusId: str = Field(default_factory=lambda: f"corpus-{uuid4().hex[:12]}")
    documents: list[KnowledgeDocument] = Field(default_factory=list)
    catalogItems: list[dict[str, str]] = Field(default_factory=list)
    runtimeMetadata: list[dict[str, str]] = Field(default_factory=list)


def infer_document_type(path: Path) -> KnowledgeDocumentType:
    name = path.name.casefold()
    parts = [part.casefold() for part in path.parts]
    if "adr" in parts or name.startswith("adr"):
        return KnowledgeDocumentType.ADR
    if "migration" in name:
        return KnowledgeDocumentType.MIGRATION
    if "roadmap" in name:
        return KnowledgeDocumentType.ROADMAP
    if "status" in name:
        return KnowledgeDocumentType.STATUS
    if name == "readme.md":
        return KnowledgeDocumentType.README
    if "designer" in name:
        return KnowledgeDocumentType.DESIGNER
    if "runtime" in name:
        return KnowledgeDocumentType.RUNTIME
    if "architecture" in parts or "yasii" in name or "yasnopro" in name:
        return KnowledgeDocumentType.ARCHITECTURE
    return KnowledgeDocumentType.GENERAL


def _document_title(path: Path, first_line: str) -> str:
    heading = re.match(r"^#\s+(.+)$", first_line.strip())
    if heading:
        return heading.group(1).strip()
    return path.stem.replace("_", " ")


def _split_markdown_sections(text: str) -> list[tuple[str, str]]:
    sections: list[tuple[str, str]] = []
    current_title = ""
    current_lines: list[str] = []

    for line in text.splitlines():
        heading = re.match(r"^(#{1,3})\s+(.+)$", line.strip())
        if heading:
            if current_lines:
                body = "\n".join(current_lines).strip()
                if body:
                    sections.append((current_title, body))
            current_title = heading.group(2).strip()
            current_lines = []
            continue
        current_lines.append(line)

    if current_lines:
        body = "\n".join(current_lines).strip()
        if body:
            sections.append((current_title, body))

    if not sections and text.strip():
        sections.append(("", text.strip()))
    return sections


def _truncate(content: str, limit: int = MAX_SECTION_CONTENT_CHARS) -> str:
    text = content.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def _section_tags(title: str, doc_type: KnowledgeDocumentType) -> list[str]:
    tags = [doc_type.value.casefold()]
    normalized = re.sub(r"\s+", " ", title.casefold()).strip()
    if normalized:
        tags.append(normalized)
    return tags


def load_markdown_document(path: Path, repo_root: Path) -> KnowledgeDocument | None:
    if not path.is_file() or path.suffix.casefold() != ".md":
        return None
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return None

    rel = str(path.relative_to(repo_root)).replace("\\", "/")
    doc_type = infer_document_type(path)
    lines = text.splitlines()
    title = _document_title(path, lines[0] if lines else path.name)
    doc_id = f"doc-{path.stem.casefold()}"

    sections: list[KnowledgeSection] = []
    for section_title, body in _split_markdown_sections(text):
        content = _truncate(body)
        if not content:
            continue
        sections.append(
            KnowledgeSection(
                sectionId=f"{doc_id}::{section_title or 'body'}",
                documentId=doc_id,
                sectionTitle=section_title,
                content=content,
                tags=_section_tags(section_title, doc_type),
            ),
        )

    if not sections:
        return None

    return KnowledgeDocument(
        documentId=doc_id,
        documentType=doc_type,
        documentPath=rel,
        title=title,
        tags=[doc_type.value.casefold(), path.name.casefold()],
        sections=sections,
    )


def _discover_markdown_paths() -> list[Path]:
    paths: list[Path] = []
    for base in get_dev_docs_dirs():
        if not base.is_dir():
            continue
        paths.extend(sorted(base.rglob("*.md")))
    return paths


def load_catalog_entries() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for item in YASII_WORK_ITEMS:
        items.append(
            {
                "key": item.key,
                "title": item.title,
                "stage": item.stage_slug,
                "phase": item.phase_id,
                "dependsOn": ", ".join(item.depends_on),
                "enables": ", ".join(item.enables),
                "analyzerCheck": item.analyzer_check,
            },
        )
    return items


def load_stage_entries() -> list[dict[str, str]]:
    return [
        {
            "slug": stage.slug,
            "title": stage.title,
            "order": str(stage.order_index),
            "mvp": str(stage.mvp),
        }
        for stage in YASII_STAGES
    ]


def load_runtime_metadata() -> list[dict[str, str]]:
    return [
        {
            "subsystem": "HostContext",
            "kind": "RUNTIME",
            "description": "Host surface raw context (surface key, selection, scope)",
            "modules": "ai_context/host_context, frontend/yasii/embedded",
        },
        {
            "subsystem": "Surface Registry",
            "kind": "RUNTIME",
            "description": "Embedded host surfaces: registry, object_card, designer, document, process",
            "modules": "frontend/yasii/embedded/surfaceAdapters",
        },
        {
            "subsystem": "Object Types",
            "kind": "RUNTIME",
            "description": "Designer-published object types and runtime entity catalog",
            "modules": "objectEntities, runtime_entities",
        },
        {
            "subsystem": "Designer Metadata",
            "kind": "DESIGNER",
            "description": "Designer shell schemas and published portal composition",
            "modules": "modules/designer",
        },
    ]


def build_knowledge_corpus(repo_root: Path | None = None) -> KnowledgeCorpus:
    _ = repo_root
    from app.core.runtime_paths import try_dev_monorepo_root

    mono_root = try_dev_monorepo_root() if is_dev_filesystem_scan_enabled() else None
    documents: list[KnowledgeDocument] = []
    seen_paths: set[str] = set()

    catalog_doc = KnowledgeDocument(
        documentId="doc-yasii-catalog",
        documentType=KnowledgeDocumentType.CATALOG,
        documentPath="backend/app/modules/platform_dashboard/yasii_catalog.py",
        title="YASII Work Items Catalog",
        tags=["catalog", "dashboard", "work-items"],
        sections=[
            KnowledgeSection(
                sectionId="doc-yasii-catalog::items",
                documentId="doc-yasii-catalog",
                sectionTitle="Work Items",
                content="\n".join(
                    f"- {row['key']}: {row['title']} (stage={row['stage']}, check={row['analyzerCheck']})"
                    for row in load_catalog_entries()[:40]
                )
                + (
                    f"\n… и ещё {len(YASII_WORK_ITEMS) - 40} WI."
                    if len(YASII_WORK_ITEMS) > 40
                    else ""
                ),
                tags=["catalog", "wi"],
            ),
        ],
    )
    documents.append(catalog_doc)
    seen_paths.add(catalog_doc.documentPath)

    tasks_doc = KnowledgeDocument(
        documentId="doc-platform-stages",
        documentType=KnowledgeDocumentType.TASKS,
        documentPath="platform_dashboard/YASII_STAGES",
        title="YASII Implementation Stages",
        tags=["tasks", "dashboard", "stages"],
        sections=[
            KnowledgeSection(
                sectionId="doc-platform-stages::list",
                documentId="doc-platform-stages",
                sectionTitle="Stages",
                content="\n".join(
                    f"- {row['slug']}: {row['title']} (mvp={row['mvp']})"
                    for row in load_stage_entries()
                ),
                tags=["stages", "dashboard"],
            ),
        ],
    )
    documents.append(tasks_doc)

    if mono_root is not None:
        for path in _discover_markdown_paths():
            rel = str(path.relative_to(mono_root)).replace("\\", "/")
            if rel in seen_paths:
                continue
            doc = load_markdown_document(path, mono_root)
            if doc is None:
                continue
            documents.append(doc)
            seen_paths.add(rel)

    return KnowledgeCorpus(
        documents=documents,
        catalogItems=load_catalog_entries(),
        runtimeMetadata=load_runtime_metadata(),
    )


def find_document_by_path(corpus: KnowledgeCorpus, path_hint: str) -> KnowledgeDocument | None:
    hint = path_hint.strip().casefold()
    if not hint:
        return None
    for doc in corpus.documents:
        if hint in doc.documentPath.casefold() or hint in Path(doc.documentPath).name.casefold():
            return doc
    return None


def extract_bullets(text: str, limit: int = MAX_BULLET_LINES) -> list[str]:
    bullets: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith(("- ", "* ", "• ")):
            bullets.append(stripped.lstrip("-*• ").strip())
        elif re.match(r"^\d+\.\s+", stripped):
            bullets.append(re.sub(r"^\d+\.\s+", "", stripped).strip())
        if len(bullets) >= limit:
            break
    return bullets


def work_item_rows() -> list[YasiiWorkItemDefinition]:
    return list(YASII_WORK_ITEMS)
