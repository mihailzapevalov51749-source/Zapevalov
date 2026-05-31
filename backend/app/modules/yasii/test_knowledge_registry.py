import app.modules.yasii.knowledge_registry  # noqa: F401

from app.modules.yasii.knowledge_registry import (
    KNOWLEDGE_REGISTRY_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    KnowledgeEntry,
    KnowledgeRegistry,
    KnowledgeRegistryContext,
    KnowledgeSnapshot,
    KnowledgeSource,
    get_knowledge_snapshot,
    register_knowledge,
)


def test_knowledge_registry_module_imports():
    assert KnowledgeRegistry is not None
    assert register_knowledge is not None
    assert get_knowledge_snapshot is not None


def test_knowledge_registry_context_defaults():
    context = KnowledgeRegistryContext()

    assert context.schemaVersion == KNOWLEDGE_REGISTRY_SCHEMA_VERSION
    assert context.registryId is None


def test_knowledge_source_fields():
    source = KnowledgeSource(sourceId="src-1", sourceType="document", metadata={"tier": "0"})

    assert source.sourceId == "src-1"
    assert source.sourceType == "document"
    assert source.metadata == {"tier": "0"}


def test_knowledge_entry_fields():
    entry = KnowledgeEntry(entryId="entry-1", sourceId="src-1", metadata={"title": "ADR"})

    assert entry.entryId == "entry-1"
    assert entry.sourceId == "src-1"
    assert entry.entryType == "placeholder"
    assert entry.metadata == {"title": "ADR"}


def test_knowledge_snapshot_defaults():
    snapshot = KnowledgeSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.entries == []
    assert snapshot.createdAt is None


def test_register_knowledge_returns_true():
    assert (
        register_knowledge(
            KnowledgeRegistryContext(registryId="registry-1"),
            KnowledgeEntry(entryId="entry-1"),
            KnowledgeSource(sourceId="src-1"),
        )
        is True
    )


def test_get_knowledge_snapshot_returns_empty_placeholder():
    snapshot = get_knowledge_snapshot(KnowledgeRegistryContext(registryId="registry-1"))

    assert isinstance(snapshot, KnowledgeSnapshot)
    assert snapshot.snapshotId == "knowledge-registry-placeholder"
    assert snapshot.entries == []
