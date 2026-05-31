import app.modules.yasii.graph_readiness  # noqa: F401

from app.modules.yasii.graph_readiness import (
    PLACEHOLDER_SNAPSHOT_ID,
    GraphReadinessContext,
    GraphReadinessEvaluator,
    GraphReadinessResult,
    GraphReadinessSnapshot,
    GraphReadinessStatus,
    evaluate_graph_readiness,
    get_graph_readiness_snapshot,
)


def test_graph_readiness_module_imports():
    assert GraphReadinessEvaluator is not None
    assert evaluate_graph_readiness is not None
    assert get_graph_readiness_snapshot is not None


def test_graph_readiness_status_values():
    assert GraphReadinessStatus.NOT_READY.value == "NOT_READY"
    assert GraphReadinessStatus.PARTIALLY_READY.value == "PARTIALLY_READY"
    assert GraphReadinessStatus.READY.value == "READY"


def test_graph_readiness_result_fields():
    result = GraphReadinessResult(
        status=GraphReadinessStatus.READY.value,
        metadata={"layer": "graph"},
    )

    assert result.status == "READY"
    assert result.metadata == {"layer": "graph"}


def test_graph_readiness_snapshot_defaults():
    snapshot = GraphReadinessSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.results == []
    assert snapshot.createdAt is None


def test_evaluate_graph_readiness_returns_partially_ready():
    result = evaluate_graph_readiness(GraphReadinessContext(readinessId="ctx-1"))

    assert isinstance(result, GraphReadinessResult)
    assert result.status == GraphReadinessStatus.PARTIALLY_READY.value
    assert result.metadata == {}


def test_get_graph_readiness_snapshot_returns_empty_placeholder():
    snapshot = get_graph_readiness_snapshot(GraphReadinessContext(readinessId="ctx-1"))

    assert isinstance(snapshot, GraphReadinessSnapshot)
    assert snapshot.snapshotId == "graph-readiness-placeholder"
    assert snapshot.results == []
