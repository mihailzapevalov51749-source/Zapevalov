import app.modules.yasii.knowledge_index  # noqa: F401

from app.modules.yasii.knowledge_index import (
    KNOWLEDGE_INDEX_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    KnowledgeIndex,
    KnowledgeIndexContext,
    KnowledgeIndexRecord,
    KnowledgeIndexSnapshot,
    build_index,
    get_index_snapshot,
)


def test_knowledge_index_module_imports():
    assert KnowledgeIndex is not None
    assert build_index is not None
    assert get_index_snapshot is not None


def test_knowledge_index_context_defaults():
    context = KnowledgeIndexContext()

    assert context.schemaVersion == KNOWLEDGE_INDEX_SCHEMA_VERSION
    assert context.indexId is None


def test_knowledge_index_record_fields():
    record = KnowledgeIndexRecord(
        entryId="entry-1",
        sourceId="src-1",
        tier="POLICY",
        metadata={"title": "Security policy"},
    )

    assert record.entryId == "entry-1"
    assert record.sourceId == "src-1"
    assert record.tier == "POLICY"
    assert record.metadata == {"title": "Security policy"}


def test_knowledge_index_snapshot_defaults():
    snapshot = KnowledgeIndexSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.records == []
    assert snapshot.createdAt is None


def test_build_index_returns_true():
    assert (
        build_index(
            KnowledgeIndexContext(indexId="index-1"),
            [KnowledgeIndexRecord(entryId="entry-1", sourceId="src-1")],
        )
        is True
    )


def test_get_index_snapshot_returns_corpus_records():
    snapshot = get_index_snapshot(KnowledgeIndexContext(indexId="index-1"))

    assert isinstance(snapshot, KnowledgeIndexSnapshot)
    assert snapshot.records
    assert snapshot.snapshotId.startswith("corpus-")
