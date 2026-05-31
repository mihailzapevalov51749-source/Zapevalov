import app.modules.yasii.graph_edges  # noqa: F401

from app.modules.yasii.graph_edges import (
    GRAPH_EDGE_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    GraphEdge,
    GraphEdgeContext,
    GraphEdgeRegistry,
    GraphEdgeSnapshot,
    GraphEdgeType,
    get_edge_snapshot,
    register_edge,
)


def test_graph_edges_module_imports():
    assert GraphEdgeRegistry is not None
    assert register_edge is not None
    assert get_edge_snapshot is not None


def test_graph_edge_type_values():
    assert GraphEdgeType.REFERENCES.value == "REFERENCES"
    assert GraphEdgeType.DEPENDS_ON.value == "DEPENDS_ON"
    assert GraphEdgeType.REGULATES.value == "REGULATES"
    assert GraphEdgeType.BELONGS_TO.value == "BELONGS_TO"


def test_graph_edge_context_defaults():
    context = GraphEdgeContext()

    assert context.schemaVersion == GRAPH_EDGE_SCHEMA_VERSION
    assert context.edgeId is None


def test_graph_edge_fields():
    edge = GraphEdge(
        edgeId="edge-1",
        sourceNodeId="node-doc",
        targetNodeId="node-process",
        edgeType=GraphEdgeType.REGULATES.value,
        metadata={"note": "policy link"},
    )

    assert edge.edgeId == "edge-1"
    assert edge.sourceNodeId == "node-doc"
    assert edge.targetNodeId == "node-process"
    assert edge.edgeType == "REGULATES"
    assert edge.metadata == {"note": "policy link"}


def test_graph_edge_snapshot_defaults():
    snapshot = GraphEdgeSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.edges == []
    assert snapshot.createdAt is None


def test_register_edge_returns_true():
    assert (
        register_edge(
            GraphEdgeContext(edgeId="edge-ctx-1"),
            GraphEdge(
                edgeId="edge-1",
                sourceNodeId="node-a",
                targetNodeId="node-b",
                edgeType=GraphEdgeType.USES.value,
            ),
        )
        is True
    )


def test_get_edge_snapshot_returns_empty_placeholder():
    snapshot = get_edge_snapshot(GraphEdgeContext(edgeId="edge-ctx-1"))

    assert isinstance(snapshot, GraphEdgeSnapshot)
    assert snapshot.snapshotId == "graph-edge-placeholder"
    assert snapshot.edges == []
