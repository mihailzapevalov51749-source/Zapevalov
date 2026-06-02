import pytest

from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.decision_memory_answers import resolve_decision_memory_command
from app.modules.yasii.decision_memory_store import clear_decision_memory_store, set_decision_memory_data_dir
from app.modules.yasii.memory import MemoryContext, build_memory_snapshot, load_memory_graph
from app.modules.yasii.memory_graph import (
    NODE_TYPE_DECISION,
    NODE_TYPE_SESSION,
    NODE_TYPE_USER,
    RELATION_DISCUSSED_IN,
    RELATION_INITIATED,
    load_memory_graph as graph_load,
    sync_decision_graph_links,
)
from app.modules.yasii.memory_graph_answers import resolve_memory_graph_command
from app.modules.yasii.memory_graph_store import (
    clear_memory_graph_store,
    list_graph_links,
    set_memory_graph_data_dir,
)
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.session_memory_store import clear_session_memory_store
from app.modules.yasii.tenant_memory_store import clear_tenant_memory_store, set_tenant_memory_data_dir
from app.modules.yasii.user_memory_store import clear_user_memory_store, set_user_memory_data_dir


@pytest.fixture(autouse=True)
def isolated_stores(tmp_path):
    graph_dir = tmp_path / "graph"
    decision_dir = tmp_path / "decision"
    tenant_dir = tmp_path / "tenant"
    user_dir = tmp_path / "user"
    for path in (graph_dir, decision_dir, tenant_dir, user_dir):
        path.mkdir()
    set_memory_graph_data_dir(graph_dir)
    set_decision_memory_data_dir(decision_dir)
    set_tenant_memory_data_dir(tenant_dir)
    set_user_memory_data_dir(user_dir)
    clear_memory_graph_store()
    clear_decision_memory_store()
    clear_tenant_memory_store()
    clear_user_memory_store()
    clear_session_memory_store()
    yield
    clear_memory_graph_store()
    clear_decision_memory_store()
    clear_tenant_memory_store()
    clear_user_memory_store()
    clear_session_memory_store()
    set_memory_graph_data_dir(None)
    set_decision_memory_data_dir(None)
    set_tenant_memory_data_dir(None)
    set_user_memory_data_dir(None)


def _payload(**extra):
    return {
        "tenantId": "tenant-1",
        "userId": "user-1",
        "sessionId": "session-1",
        **extra,
    }


def test_decision_save_creates_session_and_user_links():
    payload = _payload()
    result = resolve_decision_memory_command(
        "Запомни решение: Мы решили использовать HostContext.",
        payload,
    )
    assert result is not None and result.decision_saved

    links = list_graph_links("tenant-1")
    relations = {(link.sourceNodeId, link.targetNodeId, link.relationType) for link in links}
    assert any(rel[2] == RELATION_INITIATED for rel in relations)
    assert any(rel[2] == RELATION_DISCUSSED_IN for rel in relations)
    assert any(NODE_TYPE_USER in rel[0] for rel in relations)
    assert any(NODE_TYPE_SESSION in rel[0] for rel in relations)
    assert any(NODE_TYPE_DECISION in rel[1] for rel in relations)


def test_session_decisions_query():
    payload = _payload()
    resolve_decision_memory_command(
        "Запомни решение: Мы решили использовать один ЯСИИ на всю платформу.",
        payload,
    )

    result = resolve_memory_graph_command("Какие решения связаны с этой сессией?", payload)
    assert result is not None
    assert "один ЯСИИ" in result.message or "ЯСИИ" in result.message


def test_user_decisions_query():
    payload = _payload()
    resolve_decision_memory_command(
        "Запомни решение: Мы решили реализовать Workspace Mode.",
        payload,
    )

    result = resolve_memory_graph_command("Какие решения принял пользователь?", payload)
    assert result is not None
    assert "Workspace" in result.message


def test_decision_related_nodes_query():
    payload = _payload(processId="wf-42")
    resolve_decision_memory_command(
        "Запомни решение: Мы решили использовать единый runtime pipeline.",
        payload,
    )

    result = resolve_memory_graph_command("Что связано с этим решением?", payload)
    assert result is not None
    assert "Связано" in result.message
    assert "user" in result.message or "session" in result.message or "process" in result.message


def test_build_memory_snapshot_includes_graph():
    context = MemoryContext(tenantId="tenant-1", userId="user-1", sessionId="session-1")
    combined = build_memory_snapshot(context)
    assert "graph" in combined
    assert combined["graph"].tenantId == "tenant-1"


def test_runtime_memory_graph_trace():
    payload = _payload()
    run_demo_pipeline(
        YASIIRequest(
            requestId="graph-save",
            payload={
                **payload,
                "text": "Запомни решение: Мы решили не создавать отдельный Dashboard YASII.",
            },
        ),
    )
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="graph-query",
            payload={**payload, "text": "Какие решения связаны с этой сессией?"},
        ),
    )
    trace = response.payload.get("trace", [])
    assert "memory_graph_loaded" in trace
    assert "memory_graph_snapshot_generated" in trace


def test_sync_decision_graph_links_idempotent():
    from app.modules.yasii.decision_memory_store import save_decision_record

    record = save_decision_record(
        "tenant-1",
        "Мы решили использовать ACE.",
        user_id="user-1",
        session_id="session-1",
    )
    first = sync_decision_graph_links("tenant-1", record)
    second = sync_decision_graph_links("tenant-1", record)
    assert len(first) >= 3
    assert len(second) >= 3
    snapshot = graph_load("tenant-1", reconcile=False)
    assert snapshot.nodes
