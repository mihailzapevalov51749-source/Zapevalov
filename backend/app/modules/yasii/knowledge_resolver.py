"""YASII Knowledge Resolver skeleton (P4-W02). DTO + stub only — no RAG or retrieval."""

from enum import Enum

from pydantic import BaseModel, Field

KNOWLEDGE_RESOLVER_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "knowledge-resolver-placeholder"
DEFAULT_STUB_CONFIDENCE = 0.0


class KnowledgeResolverContext(BaseModel):
    """Technical input placeholder for knowledge resolution operations."""

    schemaVersion: str = Field(default=KNOWLEDGE_RESOLVER_SCHEMA_VERSION)
    requestId: str | None = None
    intentId: str | None = None


class KnowledgeSelectionType(str, Enum):
    DIRECT = "DIRECT"
    RELATED = "RELATED"
    CONTEXTUAL = "CONTEXTUAL"
    GRAPH = "GRAPH"
    UNKNOWN = "UNKNOWN"


class KnowledgeReference(BaseModel):
    """Formal reference to knowledge selected for a runtime response."""

    knowledgeId: str
    selectionType: KnowledgeSelectionType
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgeResolutionResult(BaseModel):
    """Technical knowledge resolution outcome placeholder."""

    schemaVersion: str = Field(default=KNOWLEDGE_RESOLVER_SCHEMA_VERSION)
    references: list[KnowledgeReference] = Field(default_factory=list)
    confidence: float = Field(default=DEFAULT_STUB_CONFIDENCE)
    metadata: dict[str, str] = Field(default_factory=dict)


class KnowledgeSnapshot(BaseModel):
    """Grouped view of resolved knowledge references."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    references: list[KnowledgeReference] = Field(default_factory=list)
    createdAt: str | None = None


class KnowledgeResolver:
    """Placeholder service container for future knowledge resolution wiring."""

    schemaVersion: str = KNOWLEDGE_RESOLVER_SCHEMA_VERSION


def resolve_knowledge(
    context: KnowledgeResolverContext | None = None,
) -> KnowledgeResolutionResult:
    """Stub: returns empty references without searching knowledge."""
    _ = context
    return KnowledgeResolutionResult(
        references=[],
        confidence=DEFAULT_STUB_CONFIDENCE,
        metadata={},
    )


def get_knowledge_snapshot(
    context: KnowledgeResolverContext | None = None,
) -> KnowledgeSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return KnowledgeSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        references=[],
    )
