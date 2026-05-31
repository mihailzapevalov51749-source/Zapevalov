"""YASII Graph Query Layer skeleton (P3-W05). DTO + stub only — no traversal or search."""

from enum import Enum

from pydantic import BaseModel, Field

GRAPH_QUERY_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "graph-query-placeholder"
PLACEHOLDER_RESULT_ID = "query-placeholder"
PLACEHOLDER_QUERY_TYPE = "GRAPH_OVERVIEW"


class GraphQueryContext(BaseModel):
    """Technical input placeholder for graph query operations."""

    schemaVersion: str = Field(default=GRAPH_QUERY_SCHEMA_VERSION)
    queryId: str | None = None


class QueryType(str, Enum):
    RELATED_NODES = "RELATED_NODES"
    NODE_RELATIONS = "NODE_RELATIONS"
    DEPENDENCY_RELATIONS = "DEPENDENCY_RELATIONS"
    RULE_RELATIONS = "RULE_RELATIONS"
    GRAPH_OVERVIEW = "GRAPH_OVERVIEW"


class GraphQuery(BaseModel):
    """Technical graph query descriptor."""

    schemaVersion: str = Field(default=GRAPH_QUERY_SCHEMA_VERSION)
    queryId: str
    queryType: str = Field(default=PLACEHOLDER_QUERY_TYPE)
    metadata: dict[str, str] = Field(default_factory=dict)


class QueryResult(BaseModel):
    """Technical query result placeholder."""

    schemaVersion: str = Field(default=GRAPH_QUERY_SCHEMA_VERSION)
    resultId: str = Field(default=PLACEHOLDER_RESULT_ID)
    items: list[str] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)


class QuerySnapshot(BaseModel):
    """Technical grouped view of graph queries."""

    schemaVersion: str = Field(default=GRAPH_QUERY_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    queries: list[GraphQuery] = Field(default_factory=list)
    createdAt: str | None = None


class GraphQueryLayer:
    """Placeholder service container for future graph query wiring."""

    schemaVersion: str = GRAPH_QUERY_SCHEMA_VERSION


def execute_query(
    context: GraphQueryContext | None = None,
    query: GraphQuery | None = None,
) -> QueryResult:
    """Stub: returns empty result without traversing or searching the graph."""
    _ = context
    _ = query
    return QueryResult(
        resultId=PLACEHOLDER_RESULT_ID,
        items=[],
        metadata={},
    )


def get_query_snapshot(
    context: GraphQueryContext | None = None,
) -> QuerySnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return QuerySnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        queries=[],
    )
