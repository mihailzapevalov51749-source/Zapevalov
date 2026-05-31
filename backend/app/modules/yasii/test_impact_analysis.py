import app.modules.yasii.impact_analysis  # noqa: F401

from app.modules.yasii.impact_analysis import (
    IMPACT_DEPENDENCY_MAP,
    analyze_impact,
    find_component_in_text,
    get_impact_snapshot,
    resolve_impact_analysis_message,
)


def test_analyze_impact_rule_engine():
    analysis = analyze_impact("Rule Engine")

    assert analysis.targetComponent == "Rule Engine"
    assert analysis.affectedComponents == ["Verdict Engine"]
    assert analysis.riskLevel == "MEDIUM"


def test_analyze_impact_graph_resolver():
    analysis = analyze_impact("Graph Resolver")

    assert analysis.targetComponent == "Graph Resolver"
    assert analysis.affectedComponents == ["Evidence Resolver"]
    assert analysis.riskLevel == "MEDIUM"


def test_analyze_impact_runtime_orchestrator():
    analysis = analyze_impact("Runtime Orchestrator")

    assert analysis.targetComponent == "Runtime Orchestrator"
    assert analysis.affectedComponents == []
    assert analysis.riskLevel == "LOW"


def test_analyze_impact_unknown_component():
    analysis = analyze_impact("Unknown Widget")

    assert analysis.riskLevel == "UNKNOWN"
    assert analysis.affectedComponents == []


def test_get_impact_snapshot_wraps_analysis():
    snapshot = get_impact_snapshot("Rule Engine")

    assert snapshot.snapshotId.startswith("impact-snapshot-")
    assert snapshot.analysis.targetComponent == "Rule Engine"
    assert snapshot.createdAt


def test_find_component_in_text():
    assert find_component_in_text("На что повлияет Rule Engine?") == "Rule Engine"
    assert find_component_in_text("runtime orchestrator impact") == "Runtime Orchestrator"


def test_resolve_impact_analysis_message_rule_engine():
    message = resolve_impact_analysis_message("На что повлияет Rule Engine?")

    assert message is not None
    assert "Impact Analysis" in message
    assert "Rule Engine" in message
    assert "Verdict Engine" in message
    assert "MEDIUM" in message


def test_resolve_impact_analysis_message_graph_resolver_dependency():
    message = resolve_impact_analysis_message("Что зависит от Graph Resolver?")

    assert message is not None
    assert "Evidence Resolver" in message
    assert "MEDIUM" in message


def test_resolve_impact_analysis_message_non_impact_query_returns_none():
    assert resolve_impact_analysis_message("Какая архитектура ЯСИИ?") is None


def test_impact_dependency_map_matches_mvp_spec():
    assert IMPACT_DEPENDENCY_MAP["Answer Builder"] == ["Runtime Orchestrator"]
    assert IMPACT_DEPENDENCY_MAP["Intent Resolver"] == ["Knowledge Resolver"]
