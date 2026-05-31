import app.modules.yasii.evidence_resolver  # noqa: F401

from app.modules.yasii.evidence_resolver import (
    PLACEHOLDER_SNAPSHOT_ID,
    EvidenceReference,
    EvidenceResolutionResult,
    EvidenceResolver,
    EvidenceResolverContext,
    EvidenceSnapshot,
    EvidenceType,
    get_evidence_snapshot,
    resolve_evidence,
)


def test_evidence_resolver_module_imports():
    assert EvidenceResolver is not None
    assert resolve_evidence is not None
    assert get_evidence_snapshot is not None


def test_evidence_type_values():
    assert EvidenceType.DOCUMENT.value == "DOCUMENT"
    assert EvidenceType.RULE.value == "RULE"
    assert EvidenceType.UNKNOWN.value == "UNKNOWN"


def test_evidence_reference_fields():
    reference = EvidenceReference(
        evidenceId="ev-1",
        evidenceType=EvidenceType.POLICY,
        metadata={"source": "adr"},
    )

    assert reference.evidenceId == "ev-1"
    assert reference.evidenceType == EvidenceType.POLICY
    assert reference.metadata == {"source": "adr"}


def test_evidence_snapshot_defaults():
    snapshot = EvidenceSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.references == []
    assert snapshot.createdAt is None


def test_resolve_evidence_returns_empty_references():
    result = resolve_evidence(EvidenceResolverContext(requestId="req-1"))

    assert isinstance(result, EvidenceResolutionResult)
    assert result.references == []
    assert result.confidence == 0.0
    assert result.metadata == {}


def test_get_evidence_snapshot_returns_empty_placeholder():
    snapshot = get_evidence_snapshot(EvidenceResolverContext(requestId="req-1"))

    assert isinstance(snapshot, EvidenceSnapshot)
    assert snapshot.snapshotId == "evidence-placeholder"
    assert snapshot.references == []
