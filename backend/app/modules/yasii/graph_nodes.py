"""YASII Graph Nodes skeleton (P3-W01). DTO + stub only — no graph DB or traversal."""

from enum import Enum

from pydantic import BaseModel, Field

GRAPH_NODE_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "graph-node-placeholder"
PLACEHOLDER_NODE_TYPE = "OBJECT"


class GraphNodeContext(BaseModel):
    """Technical input placeholder for graph node registration."""

    schemaVersion: str = Field(default=GRAPH_NODE_SCHEMA_VERSION)
    nodeId: str | None = None


class GraphNodeType(str, Enum):
    DOCUMENT = "DOCUMENT"
    PROCESS = "PROCESS"
    POLICY = "POLICY"
    INSTRUCTION = "INSTRUCTION"
    PROJECT = "PROJECT"
    RISK = "RISK"
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    OBJECT = "OBJECT"


class GraphNode(BaseModel):
    """Technical knowledge graph node placeholder."""

    schemaVersion: str = Field(default=GRAPH_NODE_SCHEMA_VERSION)
    nodeId: str
    nodeType: str = Field(default=PLACEHOLDER_NODE_TYPE)
    metadata: dict[str, str] = Field(default_factory=dict)


class GraphNodeSnapshot(BaseModel):
    """Technical grouped view of registered graph nodes."""

    schemaVersion: str = Field(default=GRAPH_NODE_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    nodes: list[GraphNode] = Field(default_factory=list)
    createdAt: str | None = None


class GraphNodeRegistry:
    """Placeholder service container for future graph node catalog wiring."""

    schemaVersion: str = GRAPH_NODE_SCHEMA_VERSION


def register_node(
    context: GraphNodeContext | None = None,
    node: GraphNode | None = None,
) -> bool:
    """Stub: pretends to register a node without persisting anything."""
    _ = context
    _ = node
    return True


def get_node_snapshot(
    context: GraphNodeContext | None = None,
) -> GraphNodeSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return GraphNodeSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        nodes=[],
    )
