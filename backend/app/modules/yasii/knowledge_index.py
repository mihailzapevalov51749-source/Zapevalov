"""YASII Knowledge Index — P2 skeleton + P11 Project Knowledge Corpus indexing."""

from __future__ import annotations

import re
from pathlib import Path

from pydantic import BaseModel, Field

from app.modules.platform_dashboard.yasii_catalog import YASII_WORK_ITEMS
from app.modules.platform_dashboard_analyzer.paths import get_repo_root
from app.modules.yasii.project_corpus import (
    KnowledgeCorpus,
    KnowledgeDocument,
    KnowledgeReference,
    KnowledgeSection,
    build_knowledge_corpus,
    find_document_by_path,
)

KNOWLEDGE_INDEX_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "knowledge-index-placeholder"
PLACEHOLDER_TIER = "REFERENCE"

_corpus_cache: KnowledgeCorpus | None = None
_corpus_cache_key: tuple[float, float, int] | None = None


def _corpus_invalidation_key(repo_root: Path) -> tuple[float, float, int]:
    max_doc_mtime = 0.0
    for base in (repo_root / "docs", repo_root / "docs" / "architecture"):
        if not base.is_dir():
            continue
        for path in base.rglob("*.md"):
            try:
                max_doc_mtime = max(max_doc_mtime, path.stat().st_mtime)
            except OSError:
                continue
    catalog_path = (
        repo_root / "backend" / "app" / "modules" / "platform_dashboard" / "yasii_catalog.py"
    )
    try:
        catalog_mtime = catalog_path.stat().st_mtime if catalog_path.is_file() else 0.0
    except OSError:
        catalog_mtime = 0.0
    return (max_doc_mtime, catalog_mtime, len(YASII_WORK_ITEMS))


class KnowledgeIndexContext(BaseModel):
    """Technical input placeholder for index build operations."""

    schemaVersion: str = Field(default=KNOWLEDGE_INDEX_SCHEMA_VERSION)
    indexId: str | None = None


class KnowledgeIndexRecord(BaseModel):
    """Technical index record linking entry, source, and tier."""

    schemaVersion: str = Field(default=KNOWLEDGE_INDEX_SCHEMA_VERSION)
    entryId: str
    sourceId: str | None = None
    tier: str = Field(default=PLACEHOLDER_TIER)
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgeIndexSnapshot(BaseModel):
    """Technical grouped view of indexed knowledge records."""

    schemaVersion: str = Field(default=KNOWLEDGE_INDEX_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    records: list[KnowledgeIndexRecord] = Field(default_factory=list)
    createdAt: str | None = None


class KnowledgeIndex:
    """Placeholder service container for future knowledge index wiring."""

    schemaVersion: str = KNOWLEDGE_INDEX_SCHEMA_VERSION


class CorpusSearchHit(BaseModel):
    score: float
    document: KnowledgeDocument
    section: KnowledgeSection
    reference: KnowledgeReference


def clear_project_corpus_cache() -> None:
    global _corpus_cache, _corpus_cache_key
    _corpus_cache = None
    _corpus_cache_key = None


def build_project_corpus(repo_root: Path | None = None, *, force: bool = False) -> KnowledgeCorpus:
    global _corpus_cache, _corpus_cache_key
    root = repo_root or get_repo_root()
    cache_key = _corpus_invalidation_key(root)
    if not force and _corpus_cache is not None and _corpus_cache_key == cache_key:
        return _corpus_cache
    corpus = build_knowledge_corpus(root)
    if repo_root is None or repo_root.resolve() == get_repo_root().resolve():
        _corpus_cache = corpus
        _corpus_cache_key = cache_key
    return corpus


def build_index(
    context: KnowledgeIndexContext | None = None,
    records: list[KnowledgeIndexRecord] | None = None,
) -> bool:
    """Build project corpus index (P11) and retain P2-compatible stub signature."""
    _ = context
    _ = records
    build_project_corpus()
    return True


def get_index_snapshot(
    context: KnowledgeIndexContext | None = None,
) -> KnowledgeIndexSnapshot:
    corpus = build_project_corpus()
    records = [
        KnowledgeIndexRecord(
            entryId=section.sectionId,
            sourceId=doc.documentPath,
            tier=doc.documentType.value,
            metadata={"title": doc.title, "section": section.sectionTitle},
        )
        for doc in corpus.documents
        for section in doc.sections
    ]
    _ = context
    return KnowledgeIndexSnapshot(
        snapshotId=f"corpus-{corpus.corpusId}",
        records=records[:500],
    )


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _tokenize(query: str) -> list[str]:
    normalized = _normalize(query)
    tokens = [token for token in re.split(r"[^\wа-яё]+", normalized) if len(token) >= 3]
    return tokens


def _score_section(query_tokens: list[str], doc: KnowledgeDocument, section: KnowledgeSection) -> float:
    haystack = _normalize(
        f"{doc.title} {doc.documentPath} {section.sectionTitle} {section.content} {' '.join(section.tags)}",
    )
    if not query_tokens:
        return 0.0
    score = 0.0
    for token in query_tokens:
        if token in haystack:
            score += 1.0
    if section.sectionTitle and any(token in _normalize(section.sectionTitle) for token in query_tokens):
        score += 2.0
    if any(token in doc.documentPath.casefold() for token in query_tokens):
        score += 1.5
    return score


def search_project_corpus(
    query: str,
    *,
    repo_root: Path | None = None,
    limit: int = 8,
) -> list[CorpusSearchHit]:
    corpus = build_project_corpus(repo_root)
    tokens = _tokenize(query)
    hits: list[CorpusSearchHit] = []

    for doc in corpus.documents:
        for section in doc.sections:
            score = _score_section(tokens, doc, section)
            if score <= 0:
                continue
            hits.append(
                CorpusSearchHit(
                    score=score,
                    document=doc,
                    section=section,
                    reference=KnowledgeReference(
                        documentId=doc.documentId,
                        documentPath=doc.documentPath,
                        sectionTitle=section.sectionTitle,
                        documentType=doc.documentType,
                    ),
                ),
            )

    hits.sort(key=lambda hit: hit.score, reverse=True)
    return hits[:limit]


def find_documents(
    query: str,
    *,
    repo_root: Path | None = None,
    limit: int = 8,
) -> list[KnowledgeDocument]:
    seen: set[str] = set()
    documents: list[KnowledgeDocument] = []
    for hit in search_project_corpus(query, repo_root=repo_root, limit=limit * 2):
        if hit.document.documentId in seen:
            continue
        seen.add(hit.document.documentId)
        documents.append(hit.document)
        if len(documents) >= limit:
            break
    return documents


def find_sections(
    query: str,
    *,
    repo_root: Path | None = None,
    limit: int = 8,
) -> list[KnowledgeSection]:
    return [hit.section for hit in search_project_corpus(query, repo_root=repo_root, limit=limit)]


def find_related_documents(
    document_path: str,
    *,
    repo_root: Path | None = None,
    limit: int = 5,
) -> list[KnowledgeDocument]:
    corpus = build_project_corpus(repo_root)
    source = find_document_by_path(corpus, document_path)
    if source is None:
        return []

    query_bits = [source.documentType.value, source.title, Path(source.documentPath).stem]
    related = find_documents(" ".join(query_bits), repo_root=repo_root, limit=limit + 1)
    return [doc for doc in related if doc.documentId != source.documentId][:limit]
