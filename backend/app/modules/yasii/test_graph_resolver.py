import app.modules.yasii.graph_resolver  # noqa: F401

from app.modules.yasii.graph_resolver import (
    PLACEHOLDER_SNAPSHOT_ID,
    GraphReference,
    GraphResolutionResult,
    GraphResolutionType,
    GraphResolver,
    GraphResolverContext,
    GraphSnapshot,
    get_graph_snapshot,
    resolve_graph,
)


def test_graph_resolver_module_imports():
    assert GraphResolver is not None
    assert resolve_graph is not None
    assert get_graph_snapshot is not None


def test_graph_resolution_type_values():
    assert GraphResolutionType.DIRECT.value == "DIRECT"
    assert GraphResolutionType.DEPENDENCY.value == "DEPENDENCY"
    assert GraphResolutionType.UNKNOWN.value == "UNKNOWN"


def test_graph_reference_fields():
    reference = GraphReference(
        referenceId="gr-1",
        resolutionType=GraphResolutionType.RULE,
        metadata={"nodeId": "node-1"},
    )

    assert reference.referenceId == "gr-1"
    assert reference.resolutionType == GraphResolutionType.RULE
    assert reference.metadata == {"nodeId": "node-1"}


def test_graph_snapshot_defaults():
    snapshot = GraphSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.references == []
    assert snapshot.createdAt is None


def test_resolve_graph_returns_empty_references():
    result = resolve_graph(
        GraphResolverContext(requestId="req-1", knowledgeIds=["kn-1"]),
    )

    assert isinstance(result, GraphResolutionResult)
    assert result.references == []
    assert result.confidence == 0.0
    assert result.metadata == {}


def test_get_graph_snapshot_returns_empty_placeholder():
    snapshot = get_graph_snapshot(
        GraphResolverContext(requestId="req-1", knowledgeIds=["kn-1"]),
    )

    assert isinstance(snapshot, GraphSnapshot)
    assert snapshot.snapshotId == "graph-resolver-placeholder"
    assert snapshot.references == []
