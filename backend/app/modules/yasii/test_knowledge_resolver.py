import app.modules.yasii.knowledge_resolver  # noqa: F401

from app.modules.yasii.knowledge_resolver import (
    PLACEHOLDER_SNAPSHOT_ID,
    KnowledgeReference,
    KnowledgeResolutionResult,
    KnowledgeResolver,
    KnowledgeResolverContext,
    KnowledgeSelectionType,
    KnowledgeSnapshot,
    get_knowledge_snapshot,
    resolve_knowledge,
)


def test_knowledge_resolver_module_imports():
    assert KnowledgeResolver is not None
    assert resolve_knowledge is not None
    assert get_knowledge_snapshot is not None


def test_knowledge_selection_type_values():
    assert KnowledgeSelectionType.DIRECT.value == "DIRECT"
    assert KnowledgeSelectionType.GRAPH.value == "GRAPH"
    assert KnowledgeSelectionType.UNKNOWN.value == "UNKNOWN"


def test_knowledge_reference_fields():
    reference = KnowledgeReference(
        knowledgeId="kn-1",
        selectionType=KnowledgeSelectionType.CONTEXTUAL,
        metadata={"tier": "1"},
    )

    assert reference.knowledgeId == "kn-1"
    assert reference.selectionType == KnowledgeSelectionType.CONTEXTUAL
    assert reference.metadata == {"tier": "1"}


def test_knowledge_snapshot_defaults():
    snapshot = KnowledgeSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.references == []
    assert snapshot.createdAt is None


def test_resolve_knowledge_returns_empty_references():
    result = resolve_knowledge(
        KnowledgeResolverContext(requestId="req-1", intentId="intent-1"),
    )

    assert isinstance(result, KnowledgeResolutionResult)
    assert result.references == []
    assert result.confidence == 0.0
    assert result.metadata == {}


def test_get_knowledge_snapshot_returns_empty_placeholder():
    snapshot = get_knowledge_snapshot(
        KnowledgeResolverContext(requestId="req-1", intentId="intent-1"),
    )

    assert isinstance(snapshot, KnowledgeSnapshot)
    assert snapshot.snapshotId == "knowledge-resolver-placeholder"
    assert snapshot.references == []
