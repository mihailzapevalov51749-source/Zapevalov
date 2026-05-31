"""YASII Graph Resolver skeleton (P4-W03). DTO + stub only — no traversal or graph DB."""

from enum import Enum

from pydantic import BaseModel, Field

GRAPH_RESOLVER_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "graph-resolver-placeholder"
DEFAULT_STUB_CONFIDENCE = 0.0


class GraphResolverContext(BaseModel):
    """Technical input placeholder for graph resolution operations."""

    schemaVersion: str = Field(default=GRAPH_RESOLVER_SCHEMA_VERSION)
    requestId: str | None = None
    knowledgeIds: list[str] | None = None


class GraphResolutionType(str, Enum):
    DIRECT = "DIRECT"
    RELATED = "RELATED"
    DEPENDENCY = "DEPENDENCY"
    RULE = "RULE"
    UNKNOWN = "UNKNOWN"


class GraphReference(BaseModel):
    """Formal reference to graph elements selected for runtime context."""

    referenceId: str
    resolutionType: GraphResolutionType
    metadata: dict[str, str] = Field(default_factory=dict)


class GraphResolutionResult(BaseModel):
    """Technical graph resolution outcome placeholder."""

    schemaVersion: str = Field(default=GRAPH_RESOLVER_SCHEMA_VERSION)
    references: list[GraphReference] = Field(default_factory=list)
    confidence: float = Field(default=DEFAULT_STUB_CONFIDENCE)
    metadata: dict[str, str] = Field(default_factory=dict)


class GraphSnapshot(BaseModel):
    """Grouped view of resolved graph references."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    references: list[GraphReference] = Field(default_factory=list)
    createdAt: str | None = None


class GraphResolver:
    """Placeholder service container for future graph resolution wiring."""

    schemaVersion: str = GRAPH_RESOLVER_SCHEMA_VERSION


def resolve_graph(
    context: GraphResolverContext | None = None,
) -> GraphResolutionResult:
    """Stub: returns empty references without traversing the graph."""
    _ = context
    return GraphResolutionResult(
        references=[],
        confidence=DEFAULT_STUB_CONFIDENCE,
        metadata={},
    )


def get_graph_snapshot(
    context: GraphResolverContext | None = None,
) -> GraphSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return GraphSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        references=[],
    )
