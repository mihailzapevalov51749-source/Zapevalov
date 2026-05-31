"""YASII Verdict Engine skeleton (P4-W06). DTO + stub only — no reasoning or inference."""

from enum import Enum

from pydantic import BaseModel, Field

VERDICT_ENGINE_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "verdict-placeholder"
DEFAULT_STUB_CONFIDENCE = 0.0


class VerdictEngineContext(BaseModel):
    """Technical input placeholder for verdict evaluation operations."""

    schemaVersion: str = Field(default=VERDICT_ENGINE_SCHEMA_VERSION)
    requestId: str | None = None
    ruleEvaluationId: str | None = None


class VerdictType(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CONDITIONAL = "CONDITIONAL"
    UNKNOWN = "UNKNOWN"


class VerdictResult(BaseModel):
    """Technical verdict outcome placeholder."""

    schemaVersion: str = Field(default=VERDICT_ENGINE_SCHEMA_VERSION)
    verdictType: VerdictType = VerdictType.UNKNOWN
    confidence: float = Field(default=DEFAULT_STUB_CONFIDENCE)
    metadata: dict[str, str] = Field(default_factory=dict)


class VerdictSnapshot(BaseModel):
    """Grouped view of verdict evaluation results."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    results: list[VerdictResult] = Field(default_factory=list)
    createdAt: str | None = None


class VerdictEngine:
    """Placeholder service container for future verdict evaluation wiring."""

    schemaVersion: str = VERDICT_ENGINE_SCHEMA_VERSION


def evaluate_verdict(
    context: VerdictEngineContext | None = None,
) -> VerdictResult:
    """Stub: returns UNKNOWN without reasoning or decision making."""
    _ = context
    return VerdictResult(
        verdictType=VerdictType.UNKNOWN,
        confidence=DEFAULT_STUB_CONFIDENCE,
        metadata={},
    )


def get_verdict_snapshot(
    context: VerdictEngineContext | None = None,
) -> VerdictSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return VerdictSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        results=[],
    )
