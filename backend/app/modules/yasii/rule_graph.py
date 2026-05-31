"""YASII Rule Graph skeleton (P3-W04). DTO + stub only — no rule engine or execution."""

from enum import Enum

from pydantic import BaseModel, Field

RULE_GRAPH_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "rule-graph-placeholder"
PLACEHOLDER_RULE_TYPE = "SYSTEM_RULE"


class RuleGraphContext(BaseModel):
    """Technical input placeholder for rule graph operations."""

    schemaVersion: str = Field(default=RULE_GRAPH_SCHEMA_VERSION)
    ruleId: str | None = None


class RuleType(str, Enum):
    POLICY = "POLICY"
    BUSINESS_RULE = "BUSINESS_RULE"
    VALIDATION_RULE = "VALIDATION_RULE"
    ACCESS_RULE = "ACCESS_RULE"
    PROCESS_RULE = "PROCESS_RULE"
    SYSTEM_RULE = "SYSTEM_RULE"
    COMPLIANCE_RULE = "COMPLIANCE_RULE"


class RuleNode(BaseModel):
    """Technical rule node placeholder."""

    schemaVersion: str = Field(default=RULE_GRAPH_SCHEMA_VERSION)
    ruleId: str
    ruleType: str = Field(default=PLACEHOLDER_RULE_TYPE)
    metadata: dict[str, str] = Field(default_factory=dict)


class RuleRelation(BaseModel):
    """Technical relation between rule nodes."""

    schemaVersion: str = Field(default=RULE_GRAPH_SCHEMA_VERSION)
    relationId: str
    sourceRuleId: str
    targetRuleId: str
    metadata: dict[str, str] = Field(default_factory=dict)


class RuleGraphSnapshot(BaseModel):
    """Technical grouped view of rules and their relations."""

    schemaVersion: str = Field(default=RULE_GRAPH_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    rules: list[RuleNode] = Field(default_factory=list)
    relations: list[RuleRelation] = Field(default_factory=list)
    createdAt: str | None = None


class RuleGraphRegistry:
    """Placeholder service container for future rule graph wiring."""

    schemaVersion: str = RULE_GRAPH_SCHEMA_VERSION


def register_rule(
    context: RuleGraphContext | None = None,
    rule: RuleNode | None = None,
    relation: RuleRelation | None = None,
) -> bool:
    """Stub: pretends to register a rule without persisting anything."""
    _ = context
    _ = rule
    _ = relation
    return True


def get_rule_snapshot(
    context: RuleGraphContext | None = None,
) -> RuleGraphSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return RuleGraphSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        rules=[],
        relations=[],
    )
