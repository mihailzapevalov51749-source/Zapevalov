"""YASII Evidence Resolver skeleton (P4-W04). DTO + stub only — no retrieval or ranking."""

from enum import Enum

from pydantic import BaseModel, Field

EVIDENCE_RESOLVER_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "evidence-placeholder"
DEFAULT_STUB_CONFIDENCE = 0.0


class EvidenceResolverContext(BaseModel):
    """Technical input placeholder for evidence resolution operations."""

    schemaVersion: str = Field(default=EVIDENCE_RESOLVER_SCHEMA_VERSION)
    requestId: str | None = None
    graphReferenceIds: list[str] | None = None


class EvidenceType(str, Enum):
    DOCUMENT = "DOCUMENT"
    POLICY = "POLICY"
    PROCESS = "PROCESS"
    RULE = "RULE"
    GRAPH = "GRAPH"
    UNKNOWN = "UNKNOWN"


class EvidenceReference(BaseModel):
    """Formal reference to evidence supporting a runtime response."""

    evidenceId: str
    evidenceType: EvidenceType
    metadata: dict[str, str] = Field(default_factory=dict)


class EvidenceResolutionResult(BaseModel):
    """Technical evidence resolution outcome placeholder."""

    schemaVersion: str = Field(default=EVIDENCE_RESOLVER_SCHEMA_VERSION)
    references: list[EvidenceReference] = Field(default_factory=list)
    confidence: float = Field(default=DEFAULT_STUB_CONFIDENCE)
    metadata: dict[str, str] = Field(default_factory=dict)


class EvidenceSnapshot(BaseModel):
    """Grouped view of resolved evidence references."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    references: list[EvidenceReference] = Field(default_factory=list)
    createdAt: str | None = None


class EvidenceResolver:
    """Placeholder service container for future evidence resolution wiring."""

    schemaVersion: str = EVIDENCE_RESOLVER_SCHEMA_VERSION


def resolve_evidence(
    context: EvidenceResolverContext | None = None,
) -> EvidenceResolutionResult:
    """Stub: returns empty references without retrieving or ranking evidence."""
    _ = context
    return EvidenceResolutionResult(
        references=[],
        confidence=DEFAULT_STUB_CONFIDENCE,
        metadata={},
    )


def get_evidence_snapshot(
    context: EvidenceResolverContext | None = None,
) -> EvidenceSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return EvidenceSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        references=[],
    )
