"""YASII Graph Readiness skeleton (P3-W06). DTO + stub only — no scoring or traversal."""

from enum import Enum

from pydantic import BaseModel, Field

GRAPH_READINESS_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "graph-readiness-placeholder"
DEFAULT_STUB_STATUS = "PARTIALLY_READY"


class GraphReadinessContext(BaseModel):
    """Technical input placeholder for graph layer readiness evaluation."""

    schemaVersion: str = Field(default=GRAPH_READINESS_SCHEMA_VERSION)
    readinessId: str | None = None


class GraphReadinessStatus(str, Enum):
    NOT_READY = "NOT_READY"
    PARTIALLY_READY = "PARTIALLY_READY"
    READY = "READY"


class GraphReadinessResult(BaseModel):
    """Technical readiness result for the graph knowledge layer."""

    schemaVersion: str = Field(default=GRAPH_READINESS_SCHEMA_VERSION)
    status: str = Field(default=DEFAULT_STUB_STATUS)
    metadata: dict[str, str] = Field(default_factory=dict)


class GraphReadinessSnapshot(BaseModel):
    """Technical grouped view of graph readiness evaluations."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    results: list[GraphReadinessResult] = Field(default_factory=list)
    createdAt: str | None = None


class GraphReadinessEvaluator:
    """Placeholder service container for future graph readiness wiring."""

    schemaVersion: str = GRAPH_READINESS_SCHEMA_VERSION


def evaluate_graph_readiness(
    context: GraphReadinessContext | None = None,
) -> GraphReadinessResult:
    """Stub: returns PARTIALLY_READY without computing layer completeness."""
    _ = context
    return GraphReadinessResult(status=GraphReadinessStatus.PARTIALLY_READY.value)


def get_graph_readiness_snapshot(
    context: GraphReadinessContext | None = None,
) -> GraphReadinessSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return GraphReadinessSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        results=[],
    )
