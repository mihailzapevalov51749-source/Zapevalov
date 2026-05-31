"""YASII technical demo runtime pipeline — sequential stub stages, no AI or DB."""

from app.modules.yasii.answer_builder import AnswerBuilderContext, build_answer
from app.modules.yasii.architecture_review import resolve_architecture_review_message
from app.modules.yasii.dev_query_capability import resolve_developer_query_message
from app.modules.yasii.architecture_verdicts import resolve_architecture_verdict_message
from app.modules.yasii.developer_profile import resolve_developer_profile_message
from app.modules.yasii.developer_readiness import resolve_developer_readiness_message
from app.modules.yasii.dependency_analysis import resolve_dependency_analysis_message
from app.modules.yasii.impact_analysis import resolve_impact_analysis_message
from app.modules.yasii.owner_assistant_profile import resolve_owner_assistant_profile_message
from app.modules.yasii.platform_health_snapshot import resolve_platform_health_snapshot_message
from app.modules.yasii.deviation_registry import resolve_deviation_registry_message
from app.modules.yasii.improvement_suggestions import resolve_improvement_suggestions_message
from app.modules.yasii.owner_readiness import resolve_owner_readiness_message
from app.modules.yasii.owner_report import resolve_owner_report_message
from app.modules.yasii.reality_check import resolve_reality_check_message
from app.modules.yasii.owner_language import apply_owner_language, resolve_owner_language_message
from app.modules.yasii.audit import AuditContext, record_audit_event
from app.modules.yasii.contracts import YASIIRequest, YASIIResponse
from app.modules.yasii.dashboard_context_answers import resolve_dashboard_context_message
from app.modules.yasii.evidence_resolver import EvidenceResolverContext, resolve_evidence
from app.modules.yasii.graph_resolver import GraphResolverContext, resolve_graph
from app.modules.yasii.intent_resolver import IntentResolverContext, resolve_intent
from app.modules.yasii.knowledge_resolver import KnowledgeResolverContext, resolve_knowledge
from app.modules.yasii.pipeline_trace import (
    AUDIT_RECORDED,
    EVIDENCE_RESOLVED,
    GRAPH_RESOLVED,
    INTENT_RESOLVED,
    KNOWLEDGE_RESOLVED,
    RESPONSE_BUILT,
    RULES_EVALUATED,
    VERDICT_EVALUATED,
)
from app.modules.yasii.rule_engine import RuleEngineContext, evaluate_rules
from app.modules.yasii.verdict_engine import VerdictEngineContext, evaluate_verdict

MAX_DEMO_PAYLOAD_TEXT_LEN = 500


def _payload_text(payload: dict) -> str:
    raw = payload.get("text") if payload.get("text") is not None else payload.get("query")
    return str(raw or "").strip()


def _demo_metadata_from_payload(payload: dict) -> dict[str, str]:
    metadata: dict[str, str] = {"pipelineMode": "demo"}
    raw = _payload_text(payload)
    if raw:
        echo = raw[:MAX_DEMO_PAYLOAD_TEXT_LEN]
        metadata["echo"] = echo
    return metadata


def run_demo_pipeline(request: YASIIRequest) -> YASIIResponse:
    """Run deterministic stub pipeline and return a technical demo response."""
    request_id = request.requestId
    resolver_context_kwargs = {"requestId": request_id}
    trace: list[str] = []
    metadata = _demo_metadata_from_payload(request.payload)
    query_text = _payload_text(request.payload)
    dashboard_message = resolve_dashboard_context_message(query_text, request.payload)
    owner_message = resolve_owner_language_message(query_text)
    owner_assistant_message = resolve_owner_assistant_profile_message(query_text)
    owner_report_message = resolve_owner_report_message(query_text)
    improvement_suggestions_message = resolve_improvement_suggestions_message(query_text)
    owner_readiness_message = resolve_owner_readiness_message(query_text)
    deviation_registry_message = resolve_deviation_registry_message(query_text)
    platform_health_message = resolve_platform_health_snapshot_message(query_text)
    reality_check_message = resolve_reality_check_message(query_text)
    dev_query_message = resolve_developer_query_message(query_text)
    developer_readiness_message = resolve_developer_readiness_message(query_text)
    verdict_message = resolve_architecture_verdict_message(query_text)
    dependency_message = resolve_dependency_analysis_message(query_text)
    impact_message = resolve_impact_analysis_message(query_text)
    architecture_message = resolve_architecture_review_message(query_text)
    profile_message = resolve_developer_profile_message(query_text)
    knowledge_message = (
        dashboard_message
        or owner_message
        or owner_assistant_message
        or owner_report_message
        or improvement_suggestions_message
        or owner_readiness_message
        or deviation_registry_message
        or platform_health_message
        or reality_check_message
        or dev_query_message
        or developer_readiness_message
        or verdict_message
        or dependency_message
        or impact_message
        or architecture_message
        or profile_message
    )

    if knowledge_message:
        knowledge_message = apply_owner_language(knowledge_message, query_text)

    resolve_intent(IntentResolverContext(**resolver_context_kwargs))
    trace.append(INTENT_RESOLVED)

    resolve_knowledge(KnowledgeResolverContext(**resolver_context_kwargs))
    trace.append(KNOWLEDGE_RESOLVED)

    resolve_graph(GraphResolverContext(**resolver_context_kwargs))
    trace.append(GRAPH_RESOLVED)

    resolve_evidence(EvidenceResolverContext(**resolver_context_kwargs))
    trace.append(EVIDENCE_RESOLVED)

    evaluate_rules(RuleEngineContext(**resolver_context_kwargs))
    trace.append(RULES_EVALUATED)

    evaluate_verdict(VerdictEngineContext(**resolver_context_kwargs))
    trace.append(VERDICT_EVALUATED)

    answer = build_answer(
        AnswerBuilderContext(
            requestId=request_id,
            trace=list(trace),
            metadata=metadata,
        ),
    )
    trace.append(RESPONSE_BUILT)

    record_audit_event(
        AuditContext(
            requestId=request_id,
            eventType="demo_pipeline_completed",
        ),
    )
    trace.append(AUDIT_RECORDED)

    response_message = knowledge_message or answer.message
    is_knowledge_response = knowledge_message is not None

    response_payload: dict = {
        "demo": not is_knowledge_response,
        "message": response_message,
        "trace": trace,
    }
    if request.payload.get("embedded") is True:
        for key in ("embedded", "handoffId", "snapshotId", "boundaryId", "scopeId", "roleIds"):
            if key in request.payload:
                response_payload[key] = request.payload[key]

    return YASIIResponse(
        requestId=request_id,
        status="ok",
        payload=response_payload,
    )
