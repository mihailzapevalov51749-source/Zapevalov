import app.modules.yasii.graph_nodes  # noqa: F401

from app.modules.yasii.graph_nodes import (
    GRAPH_NODE_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    GraphNode,
    GraphNodeContext,
    GraphNodeRegistry,
    GraphNodeSnapshot,
    GraphNodeType,
    get_node_snapshot,
    register_node,
)


def test_graph_nodes_module_imports():
    assert GraphNodeRegistry is not None
    assert register_node is not None
    assert get_node_snapshot is not None


def test_graph_node_type_values():
    assert GraphNodeType.DOCUMENT.value == "DOCUMENT"
    assert GraphNodeType.PROCESS.value == "PROCESS"
    assert GraphNodeType.POLICY.value == "POLICY"
    assert GraphNodeType.PERSON.value == "PERSON"
    assert GraphNodeType.OBJECT.value == "OBJECT"


def test_graph_node_context_defaults():
    context = GraphNodeContext()

    assert context.schemaVersion == GRAPH_NODE_SCHEMA_VERSION
    assert context.nodeId is None


def test_graph_node_fields():
    node = GraphNode(
        nodeId="node-1",
        nodeType=GraphNodeType.POLICY.value,
        metadata={"title": "Security policy"},
    )

    assert node.nodeId == "node-1"
    assert node.nodeType == "POLICY"
    assert node.metadata == {"title": "Security policy"}


def test_graph_node_snapshot_defaults():
    snapshot = GraphNodeSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.nodes == []
    assert snapshot.createdAt is None


def test_register_node_returns_true():
    assert (
        register_node(
            GraphNodeContext(nodeId="node-ctx-1"),
            GraphNode(nodeId="node-1", nodeType=GraphNodeType.DOCUMENT.value),
        )
        is True
    )


def test_get_node_snapshot_returns_empty_placeholder():
    snapshot = get_node_snapshot(GraphNodeContext(nodeId="node-ctx-1"))

    assert isinstance(snapshot, GraphNodeSnapshot)
    assert snapshot.snapshotId == "graph-node-placeholder"
    assert snapshot.nodes == []
