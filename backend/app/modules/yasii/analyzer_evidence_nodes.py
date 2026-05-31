"""YASII Analyzer Evidence Nodes skeleton (P3-W08). DTO + stub only — no analyzer engine."""

from enum import Enum

from pydantic import BaseModel, Field

EVIDENCE_NODE_SCHEMA_VERSION = "0.1.0"
PLACEHOLDER_SNAPSHOT_ID = "evidence-placeholder"


class EvidenceNodeContext(BaseModel):
    """Technical input placeholder for evidence node operations."""

    schemaVersion: str = Field(default=EVIDENCE_NODE_SCHEMA_VERSION)
    evidenceId: str | None = None


class EvidenceType(str, Enum):
    DOCUMENT = "DOCUMENT"
    RULE = "RULE"
    KNOWLEDGE = "KNOWLEDGE"
    GRAPH_NODE = "GRAPH_NODE"
    GRAPH_EDGE = "GRAPH_EDGE"
    ANALYZER_RESULT = "ANALYZER_RESULT"
    POLICY = "POLICY"
    PROCESS = "PROCESS"


class EvidenceNode(BaseModel):
    """Formal evidence node for future analyzer knowledge linkage."""

    evidenceId: str
    evidenceType: EvidenceType
    metadata: dict[str, str] = Field(default_factory=dict)


class EvidenceSnapshot(BaseModel):
    """Grouped view of registered evidence nodes."""

    snapshotId: str = Field(default=PLACEHOLDER_SNAPSHOT_ID)
    nodes: list[EvidenceNode] = Field(default_factory=list)
    createdAt: str | None = None


class EvidenceNodeRegistry:
    """Placeholder service container for future evidence node wiring."""

    schemaVersion: str = EVIDENCE_NODE_SCHEMA_VERSION


def register_evidence_node(
    context: EvidenceNodeContext | None = None,
    node: EvidenceNode | None = None,
) -> bool:
    """Stub: accepts node registration without persisting or linking."""
    _ = context
    _ = node
    return True


def get_evidence_snapshot(
    context: EvidenceNodeContext | None = None,
) -> EvidenceSnapshot:
    """Stub: returns empty placeholder snapshot without loading."""
    _ = context
    return EvidenceSnapshot(
        snapshotId=PLACEHOLDER_SNAPSHOT_ID,
        nodes=[],
    )
