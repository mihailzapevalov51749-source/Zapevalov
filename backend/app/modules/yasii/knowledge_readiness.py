"""YASII Knowledge Readiness skeleton (P2-W06). DTO + stub only — no scoring or AI."""

from enum import Enum

from pydantic import BaseModel, Field

KNOWLEDGE_READINESS_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "knowledge-readiness-placeholder"
DEFAULT_STUB_STATUS = "PARTIALLY_READY"


class ReadinessStatus(str, Enum):
    NOT_READY = "NOT_READY"
    PARTIALLY_READY = "PARTIALLY_READY"
    READY = "READY"


class KnowledgeReadinessContext(BaseModel):
    """Technical input placeholder for knowledge layer readiness evaluation."""

    schemaVersion: str = Field(default=KNOWLEDGE_READINESS_SCHEMA_VERSION)
    readinessId: str | None = None


class KnowledgeReadinessResult(BaseModel):
    """Technical readiness result for the knowledge layer."""

    schemaVersion: str = Field(default=KNOWLEDGE_READINESS_SCHEMA_VERSION)
    status: str = Field(default=DEFAULT_STUB_STATUS)
    metadata: dict[str, str] = Field(default_factory=dict)


class ReadinessSnapshot(BaseModel):
    """Technical grouped view of readiness evaluations."""

    schemaVersion: str = Field(default=KNOWLEDGE_READINESS_SCHEMA_VERSION)
    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    results: list[KnowledgeReadinessResult] = Field(default_factory=list)
    createdAt: str | None = None


class KnowledgeReadinessEvaluator:
    """Placeholder service container for future knowledge readiness wiring."""

    schemaVersion: str = KNOWLEDGE_READINESS_SCHEMA_VERSION


def evaluate_readiness(
    context: KnowledgeReadinessContext | None = None,
) -> KnowledgeReadinessResult:
    """Stub: returns PARTIALLY_READY without computing layer completeness."""
    _ = context
    return KnowledgeReadinessResult(status=ReadinessStatus.PARTIALLY_READY.value)


def get_readiness_snapshot(
    context: KnowledgeReadinessContext | None = None,
) -> ReadinessSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return ReadinessSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        results=[],
    )
