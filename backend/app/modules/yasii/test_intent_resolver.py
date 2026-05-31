import app.modules.yasii.intent_resolver  # noqa: F401

from app.modules.yasii.intent_resolver import (
    PLACEHOLDER_SNAPSHOT_ID,
    Intent,
    IntentResolver,
    IntentResolverContext,
    IntentResolutionResult,
    IntentSnapshot,
    IntentType,
    get_intent_snapshot,
    resolve_intent,
)


def test_intent_resolver_module_imports():
    assert IntentResolver is not None
    assert resolve_intent is not None
    assert get_intent_snapshot is not None


def test_intent_type_values():
    assert IntentType.QUESTION.value == "QUESTION"
    assert IntentType.SEARCH.value == "SEARCH"
    assert IntentType.UNKNOWN.value == "UNKNOWN"


def test_intent_fields():
    intent = Intent(
        intentId="intent-1",
        intentType=IntentType.REPORT,
        metadata={"channel": "portal"},
    )

    assert intent.intentId == "intent-1"
    assert intent.intentType == IntentType.REPORT
    assert intent.metadata == {"channel": "portal"}


def test_intent_snapshot_defaults():
    snapshot = IntentSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.intents == []
    assert snapshot.createdAt is None


def test_resolve_intent_returns_unknown_with_zero_confidence():
    result = resolve_intent(IntentResolverContext(requestId="req-1"))

    assert isinstance(result, IntentResolutionResult)
    assert result.intent.intentId == "intent-placeholder"
    assert result.intent.intentType == IntentType.UNKNOWN
    assert result.confidence == 0.0
    assert result.metadata == {}


def test_get_intent_snapshot_returns_empty_placeholder():
    snapshot = get_intent_snapshot(IntentResolverContext(requestId="req-1"))

    assert isinstance(snapshot, IntentSnapshot)
    assert snapshot.snapshotId == "intent-placeholder"
    assert snapshot.intents == []
