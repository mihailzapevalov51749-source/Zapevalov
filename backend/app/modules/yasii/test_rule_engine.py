import app.modules.yasii.rule_engine  # noqa: F401

from app.modules.yasii.rule_engine import (
    PLACEHOLDER_SNAPSHOT_ID,
    RuleEngine,
    RuleEngineContext,
    RuleEvaluationResult,
    RuleEvaluationType,
    RuleSnapshot,
    evaluate_rules,
    get_rule_snapshot,
)


def test_rule_engine_module_imports():
    assert RuleEngine is not None
    assert evaluate_rules is not None
    assert get_rule_snapshot is not None


def test_rule_evaluation_type_values():
    assert RuleEvaluationType.ALLOW.value == "ALLOW"
    assert RuleEvaluationType.DENY.value == "DENY"
    assert RuleEvaluationType.UNKNOWN.value == "UNKNOWN"


def test_rule_evaluation_result_fields():
    result = RuleEvaluationResult(
        evaluationType=RuleEvaluationType.CONDITIONAL,
        confidence=0.5,
        metadata={"ruleId": "r-1"},
    )

    assert result.evaluationType == RuleEvaluationType.CONDITIONAL
    assert result.confidence == 0.5
    assert result.metadata == {"ruleId": "r-1"}


def test_rule_snapshot_defaults():
    snapshot = RuleSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.results == []
    assert snapshot.createdAt is None


def test_evaluate_rules_returns_unknown_with_zero_confidence():
    result = evaluate_rules(RuleEngineContext(requestId="req-1"))

    assert isinstance(result, RuleEvaluationResult)
    assert result.evaluationType == RuleEvaluationType.UNKNOWN
    assert result.confidence == 0.0
    assert result.metadata == {}


def test_get_rule_snapshot_returns_empty_placeholder():
    snapshot = get_rule_snapshot(RuleEngineContext(requestId="req-1"))

    assert isinstance(snapshot, RuleSnapshot)
    assert snapshot.snapshotId == "rule-engine-placeholder"
    assert snapshot.results == []
