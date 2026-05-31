"""YASII Rule Engine skeleton (P4-W05). DTO + stub only — no policy execution."""

from enum import Enum

from pydantic import BaseModel, Field

RULE_ENGINE_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "rule-engine-placeholder"
DEFAULT_STUB_CONFIDENCE = 0.0


class RuleEngineContext(BaseModel):
    """Technical input placeholder for rule evaluation operations."""

    schemaVersion: str = Field(default=RULE_ENGINE_SCHEMA_VERSION)
    requestId: str | None = None
    evidenceIds: list[str] | None = None


class RuleEvaluationType(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    CONDITIONAL = "CONDITIONAL"
    UNKNOWN = "UNKNOWN"


class RuleEvaluationResult(BaseModel):
    """Technical rule evaluation outcome placeholder."""

    schemaVersion: str = Field(default=RULE_ENGINE_SCHEMA_VERSION)
    evaluationType: RuleEvaluationType = RuleEvaluationType.UNKNOWN
    confidence: float = Field(default=DEFAULT_STUB_CONFIDENCE)
    metadata: dict[str, str] = Field(default_factory=dict)


class RuleSnapshot(BaseModel):
    """Grouped view of rule evaluation results."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    results: list[RuleEvaluationResult] = Field(default_factory=list)
    createdAt: str | None = None


class RuleEngine:
    """Placeholder service container for future rule evaluation wiring."""

    schemaVersion: str = RULE_ENGINE_SCHEMA_VERSION


def evaluate_rules(
    context: RuleEngineContext | None = None,
) -> RuleEvaluationResult:
    """Stub: returns UNKNOWN without executing or validating rules."""
    _ = context
    return RuleEvaluationResult(
        evaluationType=RuleEvaluationType.UNKNOWN,
        confidence=DEFAULT_STUB_CONFIDENCE,
        metadata={},
    )


def get_rule_snapshot(
    context: RuleEngineContext | None = None,
) -> RuleSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return RuleSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        results=[],
    )
