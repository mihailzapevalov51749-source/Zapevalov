import app.modules.yasii.knowledge_source_validation  # noqa: F401

from app.modules.yasii.knowledge_source_validation import (
    KNOWLEDGE_SOURCE_VALIDATION_SCHEMA_VERSION,
    PLACEHOLDER_SNAPSHOT_ID,
    KnowledgeSourceValidationContext,
    KnowledgeSourceValidationResult,
    KnowledgeSourceValidator,
    ValidationSnapshot,
    ValidationStatus,
    get_validation_snapshot,
    validate_source,
)


def test_knowledge_source_validation_module_imports():
    assert KnowledgeSourceValidator is not None
    assert validate_source is not None
    assert get_validation_snapshot is not None


def test_validation_status_values():
    assert ValidationStatus.VALID.value == "VALID"
    assert ValidationStatus.INVALID.value == "INVALID"
    assert ValidationStatus.REVIEW_REQUIRED.value == "REVIEW_REQUIRED"
    assert ValidationStatus.INACTIVE.value == "INACTIVE"


def test_knowledge_source_validation_context_defaults():
    context = KnowledgeSourceValidationContext()

    assert context.schemaVersion == KNOWLEDGE_SOURCE_VALIDATION_SCHEMA_VERSION
    assert context.validationId is None


def test_knowledge_source_validation_result_fields():
    result = KnowledgeSourceValidationResult(
        sourceId="src-1",
        status="VALID",
        metadata={"checked": "true"},
    )

    assert result.sourceId == "src-1"
    assert result.status == "VALID"
    assert result.metadata == {"checked": "true"}


def test_validation_snapshot_defaults():
    snapshot = ValidationSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.results == []
    assert snapshot.createdAt is None


def test_validate_source_returns_review_required_placeholder():
    result = validate_source(
        KnowledgeSourceValidationContext(validationId="val-1"),
        source_id="src-policy",
    )

    assert isinstance(result, KnowledgeSourceValidationResult)
    assert result.sourceId == "src-policy"
    assert result.status == "REVIEW_REQUIRED"


def test_get_validation_snapshot_returns_empty_placeholder():
    snapshot = get_validation_snapshot(KnowledgeSourceValidationContext(validationId="val-1"))

    assert isinstance(snapshot, ValidationSnapshot)
    assert snapshot.snapshotId == "validation-placeholder"
    assert snapshot.results == []
