import app.modules.yasii.knowledge_readiness  # noqa: F401

from app.modules.yasii.knowledge_readiness import (
    KNOWLEDGE_READINESS_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    KnowledgeReadinessContext,
    KnowledgeReadinessEvaluator,
    KnowledgeReadinessResult,
    ReadinessSnapshot,
    ReadinessStatus,
    evaluate_readiness,
    get_readiness_snapshot,
)


def test_knowledge_readiness_module_imports():
    assert KnowledgeReadinessEvaluator is not None
    assert evaluate_readiness is not None
    assert get_readiness_snapshot is not None


def test_readiness_status_values():
    assert ReadinessStatus.NOT_READY.value == "NOT_READY"
    assert ReadinessStatus.PARTIALLY_READY.value == "PARTIALLY_READY"
    assert ReadinessStatus.READY.value == "READY"


def test_knowledge_readiness_context_defaults():
    context = KnowledgeReadinessContext()

    assert context.schemaVersion == KNOWLEDGE_READINESS_SCHEMA_VERSION
    assert context.readinessId is None


def test_knowledge_readiness_result_defaults():
    result = KnowledgeReadinessResult()

    assert result.status == "PARTIALLY_READY"
    assert result.metadata == {}


def test_readiness_snapshot_defaults():
    snapshot = ReadinessSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.results == []
    assert snapshot.createdAt is None


def test_evaluate_readiness_returns_partially_ready():
    result = evaluate_readiness(KnowledgeReadinessContext(readinessId="ready-1"))

    assert isinstance(result, KnowledgeReadinessResult)
    assert result.status == "PARTIALLY_READY"


def test_get_readiness_snapshot_returns_empty_placeholder():
    snapshot = get_readiness_snapshot(KnowledgeReadinessContext(readinessId="ready-1"))

    assert isinstance(snapshot, ReadinessSnapshot)
    assert snapshot.snapshotId == "knowledge-readiness-placeholder"
    assert snapshot.results == []
