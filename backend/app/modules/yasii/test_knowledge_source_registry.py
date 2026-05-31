import app.modules.yasii.knowledge_source_registry  # noqa: F401

from app.modules.yasii.knowledge_source_registry import (
    KNOWLEDGE_SOURCE_REGISTRY_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    KnowledgeSourceRecord,
    KnowledgeSourceRegistry,
    KnowledgeSourceRegistryContext,
    KnowledgeSourceSnapshot,
    get_sources_snapshot,
    register_source,
)


def test_knowledge_source_registry_module_imports():
    assert KnowledgeSourceRegistry is not None
    assert register_source is not None
    assert get_sources_snapshot is not None


def test_knowledge_source_registry_context_defaults():
    context = KnowledgeSourceRegistryContext()

    assert context.schemaVersion == KNOWLEDGE_SOURCE_REGISTRY_SCHEMA_VERSION
    assert context.registryId is None


def test_knowledge_source_record_fields():
    record = KnowledgeSourceRecord(
        sourceId="src-policy-1",
        sourceType="policy",
        sourceName="Security Policy",
        metadata={"domain": "compliance"},
    )

    assert record.sourceId == "src-policy-1"
    assert record.sourceType == "policy"
    assert record.sourceName == "Security Policy"
    assert record.metadata == {"domain": "compliance"}


def test_knowledge_source_snapshot_defaults():
    snapshot = KnowledgeSourceSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.sources == []
    assert snapshot.createdAt is None


def test_register_source_returns_true():
    assert (
        register_source(
            KnowledgeSourceRegistryContext(registryId="registry-1"),
            KnowledgeSourceRecord(sourceId="src-1", sourceName="Document"),
        )
        is True
    )


def test_get_sources_snapshot_returns_empty_placeholder():
    snapshot = get_sources_snapshot(KnowledgeSourceRegistryContext(registryId="registry-1"))

    assert isinstance(snapshot, KnowledgeSourceSnapshot)
    assert snapshot.snapshotId == "knowledge-source-registry-placeholder"
    assert snapshot.sources == []
