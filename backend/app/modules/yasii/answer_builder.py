"""YASII Answer Builder skeleton (P4-W07). DTO + stub only — no LLM or prompt generation."""

from enum import Enum

from pydantic import BaseModel, Field

ANSWER_BUILDER_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "answer-builder-placeholder"
DEFAULT_TECHNICAL_MESSAGE = "YASII runtime pipeline is available"


class AnswerBuilderContext(BaseModel):
    """Technical input for assembling a runtime pipeline answer."""

    schemaVersion: str = Field(default=ANSWER_BUILDER_SCHEMA_VERSION)
    requestId: str | None = None
    trace: list[str] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)


class AnswerType(str, Enum):
    TECHNICAL = "TECHNICAL"
    USER = "USER"
    FAILURE = "FAILURE"
    UNKNOWN = "UNKNOWN"


class AnswerResult(BaseModel):
    """Technical answer assembled from runtime pipeline stages."""

    schemaVersion: str = Field(default=ANSWER_BUILDER_SCHEMA_VERSION)
    answerType: AnswerType = AnswerType.TECHNICAL
    message: str = Field(default=DEFAULT_TECHNICAL_MESSAGE)
    trace: list[str] = Field(default_factory=list)
    metadata: dict[str, str] = Field(default_factory=dict)


class AnswerSnapshot(BaseModel):
    """Grouped view of built answers."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    results: list[AnswerResult] = Field(default_factory=list)
    createdAt: str | None = None


class AnswerBuilder:
    """Placeholder service container for future answer assembly wiring."""

    schemaVersion: str = ANSWER_BUILDER_SCHEMA_VERSION


def build_answer(
    context: AnswerBuilderContext | None = None,
) -> AnswerResult:
    """Stub: returns technical message and optional trace without AI or reasoning."""
    if context is None:
        return AnswerResult(
            answerType=AnswerType.TECHNICAL,
            message=DEFAULT_TECHNICAL_MESSAGE,
            trace=[],
            metadata={},
        )

    trace = list(context.trace) if context.trace else []
    metadata = dict(context.metadata)
    if context.requestId:
        metadata.setdefault("requestId", context.requestId)

    return AnswerResult(
        answerType=AnswerType.TECHNICAL,
        message=DEFAULT_TECHNICAL_MESSAGE,
        trace=trace,
        metadata=metadata,
    )


def get_answer_snapshot(
    context: AnswerBuilderContext | None = None,
) -> AnswerSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return AnswerSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        results=[],
    )
