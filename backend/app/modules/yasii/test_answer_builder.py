import app.modules.yasii.answer_builder  # noqa: F401

from app.modules.yasii.answer_builder import (
    PLACEHOLDER_SNAPSHOT_ID,
    AnswerBuilder,
    AnswerBuilderContext,
    AnswerResult,
    AnswerSnapshot,
    AnswerType,
    DEFAULT_TECHNICAL_MESSAGE,
    build_answer,
    get_answer_snapshot,
)


def test_answer_builder_module_imports():
    assert AnswerBuilder is not None
    assert build_answer is not None
    assert get_answer_snapshot is not None


def test_answer_type_values():
    assert AnswerType.TECHNICAL.value == "TECHNICAL"
    assert AnswerType.USER.value == "USER"
    assert AnswerType.UNKNOWN.value == "UNKNOWN"


def test_build_answer_defaults_without_context():
    result = build_answer()

    assert isinstance(result, AnswerResult)
    assert result.answerType == AnswerType.TECHNICAL
    assert result.message == DEFAULT_TECHNICAL_MESSAGE
    assert result.trace == []
    assert result.metadata == {}


def test_build_answer_preserves_trace_from_context():
    trace = [
        "intent_resolved",
        "knowledge_resolved",
        "response_built",
    ]
    result = build_answer(
        AnswerBuilderContext(
            requestId="req-1",
            trace=trace,
            metadata={"demo": "true"},
        ),
    )

    assert result.answerType == AnswerType.TECHNICAL
    assert result.message == "YASII runtime pipeline is available"
    assert result.trace == trace
    assert result.metadata["demo"] == "true"
    assert result.metadata["requestId"] == "req-1"


def test_build_answer_empty_trace_when_context_has_no_trace():
    result = build_answer(AnswerBuilderContext(requestId="req-2"))

    assert result.trace == []


def test_answer_snapshot_defaults():
    snapshot = AnswerSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.results == []
    assert snapshot.createdAt is None


def test_get_answer_snapshot_returns_empty_placeholder():
    snapshot = get_answer_snapshot(AnswerBuilderContext(requestId="req-1"))

    assert isinstance(snapshot, AnswerSnapshot)
    assert snapshot.snapshotId == "answer-builder-placeholder"
    assert snapshot.results == []
