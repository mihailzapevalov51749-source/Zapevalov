import app.modules.yasii.analyzer_evidence_nodes  # noqa: F401

from app.modules.yasii.analyzer_evidence_nodes import (
    PLACEHOLDER_SNAPSHOT_ID,
    EvidenceNode,
    EvidenceNodeContext,
    EvidenceNodeRegistry,
    EvidenceSnapshot,
    EvidenceType,
    get_evidence_snapshot,
    register_evidence_node,
)


def test_analyzer_evidence_nodes_module_imports():
    assert EvidenceNodeRegistry is not None
    assert register_evidence_node is not None
    assert get_evidence_snapshot is not None


def test_evidence_type_values():
    assert EvidenceType.DOCUMENT.value == "DOCUMENT"
    assert EvidenceType.ANALYZER_RESULT.value == "ANALYZER_RESULT"
    assert EvidenceType.PROCESS.value == "PROCESS"


def test_evidence_node_fields():
    node = EvidenceNode(
        evidenceId="ev-1",
        evidenceType=EvidenceType.GRAPH_NODE,
        metadata={"source": "analyzer"},
    )

    assert node.evidenceId == "ev-1"
    assert node.evidenceType == EvidenceType.GRAPH_NODE
    assert node.metadata == {"source": "analyzer"}


def test_evidence_snapshot_defaults():
    snapshot = EvidenceSnapshot()

    assert snapshot.snapshotId == PLACEHOLDER_SNAPSHOT_ID
    assert snapshot.nodes == []
    assert snapshot.createdAt is None


def test_register_evidence_node_returns_true():
    assert (
        register_evidence_node(
            EvidenceNodeContext(evidenceId="ctx-1"),
            EvidenceNode(
                evidenceId="ev-1",
                evidenceType=EvidenceType.RULE,
            ),
        )
        is True
    )


def test_get_evidence_snapshot_returns_empty_placeholder():
    snapshot = get_evidence_snapshot(EvidenceNodeContext(evidenceId="ctx-1"))

    assert isinstance(snapshot, EvidenceSnapshot)
    assert snapshot.snapshotId == "evidence-placeholder"
    assert snapshot.nodes == []
