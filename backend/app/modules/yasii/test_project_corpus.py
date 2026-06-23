import pytest

from app.modules.platform_dashboard.yasii_catalog import YASII_WORK_ITEMS
from app.modules.platform_dashboard_analyzer.paths import get_repo_root
from app.modules.yasii.knowledge_index import (
    build_project_corpus,
    clear_project_corpus_cache,
    find_documents,
    find_sections,
    search_project_corpus,
)
from app.modules.yasii.project_corpus import (
    KnowledgeDocumentType,
    build_knowledge_corpus,
    find_document_by_path,
    infer_document_type,
    load_markdown_document,
)


@pytest.fixture(autouse=True)
def _clear_corpus_cache():
    clear_project_corpus_cache()
    yield
    clear_project_corpus_cache()


def test_infer_document_types():
    root = get_repo_root()
    assert infer_document_type(root / "docs/architecture/adr/ADR-001.md") == KnowledgeDocumentType.ADR
    assert (
        infer_document_type(root / "docs/architecture/YASNOPRO_ARCHITECTURE_STATUS.md")
        == KnowledgeDocumentType.STATUS
    )
    assert (
        infer_document_type(root / "docs/architecture/YASII_IMPLEMENTATION_ROADMAP.md")
        == KnowledgeDocumentType.ROADMAP
    )


def test_document_loading_and_sections():
    root = get_repo_root()
    path = root / "docs/architecture/YASNOPRO_ARCHITECTURE_STATUS.md"
    doc = load_markdown_document(path, root)
    assert doc is not None
    assert doc.sections
    assert any("Level" in section.content or "уровень" in section.content.casefold() for section in doc.sections)


def test_build_project_corpus_indexes_docs():
    corpus = build_knowledge_corpus(get_repo_root())
    assert len(corpus.documents) >= 10
    status = find_document_by_path(corpus, "YASNOPRO_ARCHITECTURE_STATUS.md")
    assert status is not None
    assert len(corpus.catalogItems) == len(YASII_WORK_ITEMS)


def test_search_and_find_helpers():
    root = get_repo_root()
    corpus = build_project_corpus(root, force=True)
    assert corpus.documents

    hits = search_project_corpus("Relation Engine", repo_root=root, limit=3)
    assert hits
    assert any("relation" in hit.section.content.casefold() for hit in hits)

    docs = find_documents("Architecture Status Level 1", repo_root=root, limit=3)
    assert docs

    sections = find_sections("Hybrid Architecture", repo_root=root, limit=2)
    assert sections
