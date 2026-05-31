import app.modules.yasii.rule_graph  # noqa: F401

from app.modules.yasii.rule_graph import (
    PLACEHOLDER_SNAPSHOT_ID,
    RULE_GRAPH_SCHEMA_VERSION,
    RuleGraphContext,
    RuleGraphRegistry,
    RuleGraphSnapshot,
    RuleNode,
    RuleRelation,
    RuleType,
    get_rule_snapshot,
    register_rule,
)


def test_rule_graph_module_imports():
    assert RuleGraphRegistry is not None
    assert register_rule is not None
    assert get_rule_snapshot is not None


def test_rule_type_values():
    assert RuleType.POLICY.value == "POLICY"
    assert RuleType.BUSINESS_RULE.value == "BUSINESS_RULE"
    assert RuleType.COMPLIANCE_RULE.value == "COMPLIANCE_RULE"


def test_rule_node_fields():
    rule = RuleNode(ruleId="rule-1", ruleType=RuleType.ACCESS_RULE.value, metadata={"scope": "portal"})

    assert rule.ruleId == "rule-1"
    assert rule.ruleType == "ACCESS_RULE"
    assert rule.metadata == {"scope": "portal"}


def test_rule_relation_fields():
    relation = RuleRelation(
        relationId="rel-1",
        sourceRuleId="rule-a",
        targetRuleId="rule-b",
        metadata={"link": "depends"},
    )

    assert relation.relationId == "rel-1"
    assert relation.sourceRuleId == "rule-a"
    assert relation.targetRuleId == "rule-b"


def test_rule_graph_snapshot_defaults():
    snapshot = RuleGraphSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.rules == []
    assert snapshot.relations == []
    assert snapshot.createdAt is None


def test_register_rule_returns_true():
    assert (
        register_rule(
            RuleGraphContext(ruleId="ctx-1"),
            RuleNode(ruleId="rule-1"),
            RuleRelation(relationId="rel-1", sourceRuleId="rule-1", targetRuleId="rule-2"),
        )
        is True
    )


def test_get_rule_snapshot_returns_empty_placeholder():
    snapshot = get_rule_snapshot(RuleGraphContext(ruleId="ctx-1"))

    assert isinstance(snapshot, RuleGraphSnapshot)
    assert snapshot.snapshotId == "rule-graph-placeholder"
    assert snapshot.rules == []
    assert snapshot.relations == []
