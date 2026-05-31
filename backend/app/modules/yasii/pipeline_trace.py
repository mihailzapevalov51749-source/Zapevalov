"""YASII demo/runtime pipeline trace stage identifiers."""

INTENT_RESOLVED = "intent_resolved"
KNOWLEDGE_RESOLVED = "knowledge_resolved"
GRAPH_RESOLVED = "graph_resolved"
EVIDENCE_RESOLVED = "evidence_resolved"
RULES_EVALUATED = "rules_evaluated"
VERDICT_EVALUATED = "verdict_evaluated"
RESPONSE_BUILT = "response_built"
AUDIT_RECORDED = "audit_recorded"

DEMO_PIPELINE_TRACE: tuple[str, ...] = (
    INTENT_RESOLVED,
    KNOWLEDGE_RESOLVED,
    GRAPH_RESOLVED,
    EVIDENCE_RESOLVED,
    RULES_EVALUATED,
    VERDICT_EVALUATED,
    RESPONSE_BUILT,
    AUDIT_RECORDED,
)
