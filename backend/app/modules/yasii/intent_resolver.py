"""YASII Intent Resolver skeleton (P4-W01). DTO + stub only — no NLP or LLM."""

from enum import Enum

from pydantic import BaseModel, Field

INTENT_RESOLVER_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "intent-placeholder"
PLACEHOLDER_INTENT_ID = "intent-placeholder"
DEFAULT_STUB_CONFIDENCE = 0.0


class IntentResolverContext(BaseModel):
    """Technical input placeholder for intent resolution operations."""

    schemaVersion: str = Field(default=INTENT_RESOLVER_SCHEMA_VERSION)
    requestId: str | None = None


class IntentType(str, Enum):
    QUESTION = "QUESTION"
    SEARCH = "SEARCH"
    NAVIGATION = "NAVIGATION"
    ACTION = "ACTION"
    REPORT = "REPORT"
    ANALYSIS = "ANALYSIS"
    UNKNOWN = "UNKNOWN"


class Intent(BaseModel):
    """Formal user intent descriptor for the runtime pipeline."""

    intentId: str
    intentType: IntentType
    metadata: dict[str, str] = Field(default_factory=dict)


class IntentResolutionResult(BaseModel):
    """Technical intent resolution outcome placeholder."""

    schemaVersion: str = Field(default=INTENT_RESOLVER_SCHEMA_VERSION)
    intent: Intent
    confidence: float = Field(default=DEFAULT_STUB_CONFIDENCE)
    metadata: dict[str, str] = Field(default_factory=dict)


class IntentSnapshot(BaseModel):
    """Grouped view of resolved intents."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    intents: list[Intent] = Field(default_factory=list)
    createdAt: str | None = None


class IntentResolver:
    """Placeholder service container for future intent resolution wiring."""

    schemaVersion: str = INTENT_RESOLVER_SCHEMA_VERSION


def resolve_intent(
    context: IntentResolverContext | None = None,
) -> IntentResolutionResult:
    """Stub: returns UNKNOWN intent without classifying user text."""
    _ = context
    return IntentResolutionResult(
        intent=Intent(
            intentId=PLACEHOLDER_INTENT_ID,
            intentType=IntentType.UNKNOWN,
        ),
        confidence=DEFAULT_STUB_CONFIDENCE,
    )


def get_intent_snapshot(
    context: IntentResolverContext | None = None,
) -> IntentSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return IntentSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        intents=[],
    )
