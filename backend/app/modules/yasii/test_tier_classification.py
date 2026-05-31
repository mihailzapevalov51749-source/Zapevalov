import app.modules.yasii.tier_classification  # noqa: F401

from app.modules.yasii.tier_classification import (
    PLACEHOLDER_SNAPSHOT_ID,
    TIER_CLASSIFICATION_SCHEMA_VERSION,
    KnowledgeTier,
    TierClassification,
    TierClassificationContext,
    TierClassifier,
    TierSnapshot,
    classify_tier,
    get_tier_snapshot,
)


def test_tier_classification_module_imports():
    assert TierClassifier is not None
    assert classify_tier is not None
    assert get_tier_snapshot is not None


def test_knowledge_tier_values():
    assert KnowledgeTier.CORE.value == "CORE"
    assert KnowledgeTier.POLICY.value == "POLICY"
    assert KnowledgeTier.PROCESS.value == "PROCESS"
    assert KnowledgeTier.INSTRUCTION.value == "INSTRUCTION"
    assert KnowledgeTier.REFERENCE.value == "REFERENCE"
    assert KnowledgeTier.TEMPORARY.value == "TEMPORARY"


def test_tier_classification_context_defaults():
    context = TierClassificationContext()

    assert context.schemaVersion == TIER_CLASSIFICATION_SCHEMA_VERSION
    assert context.classificationId is None


def test_tier_classification_fields():
    classification = TierClassification(entryId="entry-1", tier="POLICY", metadata={"source": "registry"})

    assert classification.entryId == "entry-1"
    assert classification.tier == "POLICY"
    assert classification.metadata == {"source": "registry"}


def test_tier_snapshot_defaults():
    snapshot = TierSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.classifications == []
    assert snapshot.createdAt is None


def test_classify_tier_returns_reference_placeholder():
    result = classify_tier(TierClassificationContext(classificationId="cls-1"), entry_id="entry-42")

    assert isinstance(result, TierClassification)
    assert result.entryId == "entry-42"
    assert result.tier == "REFERENCE"


def test_get_tier_snapshot_returns_empty_placeholder():
    snapshot = get_tier_snapshot(TierClassificationContext(classificationId="cls-1"))

    assert isinstance(snapshot, TierSnapshot)
    assert snapshot.snapshotId == "tier-classification-placeholder"
    assert snapshot.classifications == []
