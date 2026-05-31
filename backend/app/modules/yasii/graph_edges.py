"""YASII Graph Edges skeleton (P3-W02). DTO + stub only — no graph DB or traversal."""

from enum import Enum

from pydantic import BaseModel, Field

GRAPH_EDGE_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "graph-edge-placeholder"
PLACEHOLDER_EDGE_TYPE = "RELATED_TO"


class GraphEdgeContext(BaseModel):
    """Technical input placeholder for graph edge registration."""

    schemaVersion: str = Field(default=GRAPH_EDGE_SCHEMA_VERSION)
    edgeId: str | None = None


class GraphEdgeType(str, Enum):
    REFERENCES = "REFERENCES"
    DEPENDS_ON = "DEPENDS_ON"
    CONTAINS = "CONTAINS"
    USES = "USES"
    RELATED_TO = "RELATED_TO"
    REGULATES = "REGULATES"
    OWNS = "OWNS"
    BELONGS_TO = "BELONGS_TO"


class GraphEdge(BaseModel):
    """Technical knowledge graph edge placeholder."""

    schemaVersion: str = Field(default=GRAPH_EDGE_SCHEMA_VERSION)
    edgeId: str
    sourceNodeId: str
    targetNodeId: str
    edgeType: str = Field(default=PLACEHOLDER_EDGE_TYPE)
    metadata: dict[str, str] = Field(default_factory=dict)


class GraphEdgeSnapshot(BaseModel):
    """Technical grouped view of registered graph edges."""

    schemaVersion: str = Field(default=GRAPH_EDGE_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    edges: list[GraphEdge] = Field(default_factory=list)
    createdAt: str | None = None


class GraphEdgeRegistry:
    """Placeholder service container for future graph edge catalog wiring."""

    schemaVersion: str = GRAPH_EDGE_SCHEMA_VERSION


def register_edge(
    context: GraphEdgeContext | None = None,
    edge: GraphEdge | None = None,
) -> bool:
    """Stub: pretends to register an edge without persisting anything."""
    _ = context
    _ = edge
    return True


def get_edge_snapshot(
    context: GraphEdgeContext | None = None,
) -> GraphEdgeSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return GraphEdgeSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        edges=[],
    )
