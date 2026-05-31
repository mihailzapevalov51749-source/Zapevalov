import app.modules.yasii.dependency_analysis  # noqa: F401

from app.modules.yasii.dependency_analysis import (
    analyze_dependencies,
    build_dependency_chain,
    get_dependency_snapshot,
    resolve_dependency_analysis_message,
)


def test_build_dependency_chain_rule_engine():
    assert build_dependency_chain("Rule Engine") == [
        "Rule Engine",
        "Verdict Engine",
        "Answer Builder",
        "Runtime Orchestrator",
    ]


def test_analyze_dependencies_graph_resolver():
    analysis = analyze_dependencies("Graph Resolver")

    assert analysis.startComponent == "Graph Resolver"
    assert analysis.dependencyChain == [
        "Graph Resolver",
        "Evidence Resolver",
        "Rule Engine",
        "Verdict Engine",
        "Answer Builder",
        "Runtime Orchestrator",
    ]
    assert analysis.chainLength == 6


def test_analyze_dependencies_runtime_orchestrator():
    analysis = analyze_dependencies("Runtime Orchestrator")

    assert analysis.startComponent == "Runtime Orchestrator"
    assert analysis.dependencyChain == ["Runtime Orchestrator"]
    assert analysis.chainLength == 1


def test_get_dependency_snapshot_wraps_analysis():
    snapshot = get_dependency_snapshot("Rule Engine")

    assert snapshot.snapshotId.startswith("dependency-snapshot-")
    assert snapshot.analysis.chainLength == 4
    assert snapshot.createdAt


def test_resolve_dependency_analysis_message_rule_engine():
    message = resolve_dependency_analysis_message("Покажи зависимости Rule Engine")

    assert message is not None
    assert "Dependency Analysis" in message
    assert "Rule Engine" in message
    assert "Verdict Engine" in message
    assert "Runtime Orchestrator" in message
    assert "Длина цепочки:\n4" in message


def test_resolve_dependency_analysis_message_graph_resolver():
    message = resolve_dependency_analysis_message("Покажи зависимости Graph Resolver")

    assert message is not None
    assert "Evidence Resolver" in message
    assert "Длина цепочки:\n6" in message


def test_resolve_dependency_analysis_message_non_dependency_query_returns_none():
    assert resolve_dependency_analysis_message("На что повлияет Rule Engine?") is None
