import app.modules.yasii.graph_query_layer  # noqa: F401

from app.modules.yasii.graph_query_layer import (
    GRAPH_QUERY_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    GraphQuery,
    GraphQueryContext,
    GraphQueryLayer,
    QueryResult,
    QuerySnapshot,
    QueryType,
    execute_query,
    get_query_snapshot,
)


def test_graph_query_layer_module_imports():
    assert GraphQueryLayer is not None
    assert execute_query is not None
    assert get_query_snapshot is not None


def test_query_type_values():
    assert QueryType.RELATED_NODES.value == "RELATED_NODES"
    assert QueryType.DEPENDENCY_RELATIONS.value == "DEPENDENCY_RELATIONS"
    assert QueryType.GRAPH_OVERVIEW.value == "GRAPH_OVERVIEW"


def test_graph_query_fields():
    query = GraphQuery(
        queryId="q-1",
        queryType=QueryType.RULE_RELATIONS.value,
        metadata={"nodeId": "node-1"},
    )

    assert query.queryId == "q-1"
    assert query.queryType == "RULE_RELATIONS"
    assert query.metadata == {"nodeId": "node-1"}


def test_query_snapshot_defaults():
    snapshot = QuerySnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.queries == []
    assert snapshot.createdAt is None


def test_execute_query_returns_empty_result():
    result = execute_query(
        GraphQueryContext(queryId="ctx-1"),
        GraphQuery(queryId="q-1", queryType=QueryType.NODE_RELATIONS.value),
    )

    assert isinstance(result, QueryResult)
    assert result.resultId == "query-placeholder"
    assert result.items == []
    assert result.metadata == {}


def test_get_query_snapshot_returns_empty_placeholder():
    snapshot = get_query_snapshot(GraphQueryContext(queryId="ctx-1"))

    assert isinstance(snapshot, QuerySnapshot)
    assert snapshot.snapshotId == "graph-query-placeholder"
    assert snapshot.queries == []
