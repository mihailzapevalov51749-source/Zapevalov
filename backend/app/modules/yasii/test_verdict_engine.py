import app.modules.yasii.verdict_engine  # noqa: F401

from app.modules.yasii.verdict_engine import (
    PLACEHOLDER_SNAPSHOT_ID,
    VerdictEngine,
    VerdictEngineContext,
    VerdictResult,
    VerdictSnapshot,
    VerdictType,
    evaluate_verdict,
    get_verdict_snapshot,
)


def test_verdict_engine_module_imports():
    assert VerdictEngine is not None
    assert evaluate_verdict is not None
    assert get_verdict_snapshot is not None


def test_verdict_type_values():
    assert VerdictType.APPROVED.value == "APPROVED"
    assert VerdictType.REJECTED.value == "REJECTED"
    assert VerdictType.UNKNOWN.value == "UNKNOWN"


def test_verdict_result_fields():
    result = VerdictResult(
        verdictType=VerdictType.CONDITIONAL,
        confidence=0.5,
        metadata={"caseId": "c-1"},
    )

    assert result.verdictType == VerdictType.CONDITIONAL
    assert result.confidence == 0.5
    assert result.metadata == {"caseId": "c-1"}


def test_verdict_snapshot_defaults():
    snapshot = VerdictSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.results == []
    assert snapshot.createdAt is None


def test_evaluate_verdict_returns_unknown_with_zero_confidence():
    result = evaluate_verdict(VerdictEngineContext(requestId="req-1"))

    assert isinstance(result, VerdictResult)
    assert result.verdictType == VerdictType.UNKNOWN
    assert result.confidence == 0.0
    assert result.metadata == {}


def test_get_verdict_snapshot_returns_empty_placeholder():
    snapshot = get_verdict_snapshot(VerdictEngineContext(requestId="req-1"))

    assert isinstance(snapshot, VerdictSnapshot)
    assert snapshot.snapshotId == "verdict-placeholder"
    assert snapshot.results == []
