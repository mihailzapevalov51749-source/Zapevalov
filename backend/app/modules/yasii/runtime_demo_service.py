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
from app.modules.yasii.object_card_context_answers import (
    resolve_object_card_context_message,
    resolve_object_card_surface_fallback,
)
from app.modules.yasii.designer_context_answers import (
    resolve_designer_context_message,
    resolve_designer_surface_fallback,
)
from app.modules.yasii.document_context_answers import (
    resolve_document_context_message,
    resolve_document_surface_fallback,
)
from app.modules.yasii.process_context_answers import (
    resolve_process_context_message,
    resolve_process_surface_fallback,
)
from app.modules.yasii.registry_context_answers import (
    resolve_registry_context_message,
    resolve_registry_surface_fallback,
)
from app.modules.yasii.evidence_resolver import EvidenceResolverContext, resolve_evidence
from app.modules.yasii.graph_resolver import GraphResolverContext, resolve_graph
from app.modules.yasii.intent_resolver import IntentResolverContext, resolve_intent
from app.modules.yasii.knowledge_resolver import KnowledgeResolverContext, resolve_knowledge
from app.modules.yasii.user_identity_answers import (
    extract_user_identity,
    resolve_user_identity_command,
)
from app.modules.yasii.decision_memory_answers import resolve_decision_memory_command
from app.modules.yasii.governance_answers import resolve_governance_command
from app.modules.yasii.development_intelligence_answers import resolve_development_intelligence_command
from app.modules.yasii.business_explanation_answers import resolve_business_explanation_command
from app.modules.yasii.project_awareness_answers import resolve_project_awareness_command
from app.modules.yasii.knowledge_answers import resolve_knowledge_corpus_command
from app.modules.yasii.improvement_answers import resolve_improvement_command
from app.modules.yasii.architect_answers import resolve_architect_command
from app.modules.yasii.blocker_answers import resolve_blocker_command
from app.modules.yasii.recommendation_answers import resolve_recommendation_command
from app.modules.yasii.unlock_score_answers import resolve_unlock_command
from app.modules.yasii.strategy_answers import resolve_strategy_command
from app.modules.yasii.memory_graph_answers import resolve_memory_graph_command
from app.modules.yasii.memory import (
    MemoryContext,
    build_memory_snapshot,
    load_decision_memory,
    load_memory,
    load_memory_graph,
    load_process_memory,
    load_session_memory_snapshot,
    load_tenant_memory,
)
from app.modules.yasii.pipeline_trace import (
    AUDIT_RECORDED,
    EVIDENCE_RESOLVED,
    GRAPH_RESOLVED,
    INTENT_RESOLVED,
    KNOWLEDGE_RESOLVED,
    MEMORY_DELETED,
    MEMORY_LOADED,
    MEMORY_SAVED,
    RESPONSE_BUILT,
    RULES_EVALUATED,
    SESSION_MEMORY_CLEARED,
    SESSION_MEMORY_LOADED,
    SESSION_MEMORY_UPDATED,
    SESSION_SUMMARY_GENERATED,
    DECISION_CONFLICT_DETECTED,
    DECISION_LOADED,
    DECISION_SAVED,
    DECISION_UPDATED,
    PROCESS_MEMORY_LOADED,
    MEMORY_GRAPH_LOADED,
    MEMORY_GRAPH_LINK_CREATED,
    MEMORY_GRAPH_SNAPSHOT_GENERATED,
    USER_IDENTITY_LOADED,
    USER_IDENTITY_ANSWERED,
    STRATEGY_ASSESSMENT_CREATED,
    STRATEGY_RECOMMENDATION_GENERATED,
    STRATEGY_CONFLICT_DETECTED,
    STRATEGY_GOAL_ALIGNMENT_CHECKED,
    UNLOCK_SCORE_GENERATED,
    UNLOCK_RANKING_CREATED,
    UNLOCK_CANDIDATE_SCORED,
    BLOCKER_DETECTED,
    BLOCKER_ASSESSMENT_CREATED,
    BLOCKER_DEPENDENCY_FOUND,
    BLOCKER_CONFLICT_FOUND,
    RECOMMENDATION_GENERATED,
    RECOMMENDATION_TEMPLATE_SELECTED,
    RECOMMENDATION_NEXT_STEP_CREATED,
    RECOMMENDATION_BLOCKER_RESOLUTION_CREATED,
    ARCHITECT_PROFILE_LOADED,
    ARCHITECT_QUESTION_ANSWERED,
    ARCHITECT_DEPENDENCY_ANALYZED,
    ARCHITECT_CHANGE_IMPACT_ANALYZED,
    IMPROVEMENT_QUERY_EXECUTED,
    IMPROVEMENT_CANDIDATE_FOUND,
    IMPROVEMENT_ASSESSMENT_CREATED,
    IMPROVEMENT_RECOMMENDATION_GENERATED,
    GOVERNANCE_STATE_LOADED,
    DEVELOPMENT_STATE_LOADED,
    DEVELOPMENT_QUALITY_ANALYZED,
    DEVELOPMENT_DEBT_ANALYZED,
    DEVELOPMENT_RISK_DETECTED,
    DEVELOPMENT_INTELLIGENCE_CREATED,
    BUSINESS_EXPLANATION_CREATED,
    BUSINESS_IMPACT_GENERATED,
    BUSINESS_VIEW_SELECTED,
    PROJECT_STATE_LOADED,
    PROJECT_AWARENESS_CREATED,
    PROJECT_PRIORITY_GENERATED,
    PROJECT_BLOCKERS_DETECTED,
    KNOWLEDGE_CORPUS_LOADED,
    KNOWLEDGE_DOCUMENT_FOUND,
    KNOWLEDGE_SECTION_FOUND,
    KNOWLEDGE_ANSWER_GENERATED,
    YASII_E2E_MVP_STARTED,
    YASII_E2E_MVP_COMPLETED,
    YASII_E2E_FLOW_VALIDATED,
    TENANT_MEMORY_DELETED,
    TENANT_MEMORY_LOADED,
    TENANT_MEMORY_SAVED,
    VERDICT_EVALUATED,
)
from app.modules.yasii.session_memory_answers import (
    resolve_session_memory_command,
    should_skip_session_recording,
)
from app.modules.yasii.session_memory_store import record_session_exchange
from app.modules.yasii.tenant_memory_answers import resolve_tenant_memory_command
from app.modules.yasii.user_memory_answers import resolve_user_memory_command
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
    e2e_mvp_trace = str(request.payload.get("e2eMvpTrace") or "").strip().lower()
    if e2e_mvp_trace == "started":
        trace.append(YASII_E2E_MVP_STARTED)
    metadata = _demo_metadata_from_payload(request.payload)
    query_text = _payload_text(request.payload)

    user_id = str(request.payload.get("userId") or "").strip()
    tenant_id = str(request.payload.get("tenantId") or "").strip() or "default-tenant"
    session_id = str(request.payload.get("sessionId") or "").strip()
    host_surface = str(request.payload.get("hostSurface") or request.surfaceId or "").strip() or None
    process_id = str(request.payload.get("processId") or "").strip() or None
    instance_id = str(
        request.payload.get("instanceId") or request.payload.get("processInstanceId") or "",
    ).strip() or None
    memory_context = MemoryContext(
        requestId=request_id,
        tenantId=tenant_id,
        userId=user_id or None,
        sessionId=session_id or None,
        processId=process_id,
        instanceId=instance_id,
    )

    if tenant_id and (
        process_id
        or str(request.payload.get("hostSurface") or request.surfaceId or "").strip().lower() == "process"
    ):
        load_process_memory(memory_context, host_payload=request.payload)
        trace.append(PROCESS_MEMORY_LOADED)

    if tenant_id:
        load_memory_graph(memory_context)
        trace.append(MEMORY_GRAPH_LOADED)
        build_memory_snapshot(memory_context, host_payload=request.payload)
        trace.append(MEMORY_GRAPH_SNAPSHOT_GENERATED)

    if tenant_id:
        load_decision_memory(memory_context)
        trace.append(DECISION_LOADED)

    if session_id and user_id:
        load_session_memory_snapshot(memory_context)
        trace.append(SESSION_MEMORY_LOADED)

    if tenant_id:
        load_tenant_memory(memory_context)
        trace.append(TENANT_MEMORY_LOADED)

    if user_id:
        load_memory(memory_context)
        trace.append(MEMORY_LOADED)

    if extract_user_identity(request.payload) is not None:
        trace.append(USER_IDENTITY_LOADED)

    user_identity_result = resolve_user_identity_command(query_text, request.payload)
    user_identity_message = user_identity_result.message if user_identity_result else None
    if user_identity_result is not None and user_identity_result.identity_answered:
        trace.append(USER_IDENTITY_ANSWERED)

    governance_result = resolve_governance_command(query_text, request.payload)
    governance_message = governance_result.message if governance_result else None
    if governance_result is not None and governance_result.state_loaded:
        trace.append(GOVERNANCE_STATE_LOADED)

    development_intelligence_result = resolve_development_intelligence_command(
        query_text, request.payload
    )
    development_intelligence_message = (
        development_intelligence_result.message if development_intelligence_result else None
    )
    if development_intelligence_result is not None and development_intelligence_result.state_loaded:
        trace.append(DEVELOPMENT_STATE_LOADED)
    if development_intelligence_result is not None and development_intelligence_result.quality_analyzed:
        trace.append(DEVELOPMENT_QUALITY_ANALYZED)
    if development_intelligence_result is not None and development_intelligence_result.debt_analyzed:
        trace.append(DEVELOPMENT_DEBT_ANALYZED)
    if development_intelligence_result is not None and development_intelligence_result.risk_detected:
        trace.append(DEVELOPMENT_RISK_DETECTED)
    if development_intelligence_result is not None and development_intelligence_result.intelligence_created:
        trace.append(DEVELOPMENT_INTELLIGENCE_CREATED)

    business_explanation_result = resolve_business_explanation_command(query_text, request.payload)
    business_explanation_message = (
        business_explanation_result.message if business_explanation_result else None
    )
    if business_explanation_result is not None and business_explanation_result.explanation_created:
        trace.append(BUSINESS_EXPLANATION_CREATED)
    if business_explanation_result is not None and business_explanation_result.impact_generated:
        trace.append(BUSINESS_IMPACT_GENERATED)
    if business_explanation_result is not None and business_explanation_result.business_view_selected:
        trace.append(BUSINESS_VIEW_SELECTED)

    project_awareness_result = resolve_project_awareness_command(query_text, request.payload)
    project_awareness_message = (
        project_awareness_result.message if project_awareness_result else None
    )
    if project_awareness_result is not None and project_awareness_result.state_loaded:
        trace.append(PROJECT_STATE_LOADED)
    if project_awareness_result is not None and project_awareness_result.awareness_created:
        trace.append(PROJECT_AWARENESS_CREATED)
    if project_awareness_result is not None and project_awareness_result.priority_generated:
        trace.append(PROJECT_PRIORITY_GENERATED)
    if project_awareness_result is not None and project_awareness_result.blockers_detected:
        trace.append(PROJECT_BLOCKERS_DETECTED)

    knowledge_corpus_result = resolve_knowledge_corpus_command(query_text, request.payload)
    knowledge_corpus_message = knowledge_corpus_result.message if knowledge_corpus_result else None
    if knowledge_corpus_result is not None and knowledge_corpus_result.corpus_loaded:
        trace.append(KNOWLEDGE_CORPUS_LOADED)
    if knowledge_corpus_result is not None and knowledge_corpus_result.document_found:
        trace.append(KNOWLEDGE_DOCUMENT_FOUND)
    if knowledge_corpus_result is not None and knowledge_corpus_result.section_found:
        trace.append(KNOWLEDGE_SECTION_FOUND)
    if knowledge_corpus_result is not None and knowledge_corpus_result.answer_generated:
        trace.append(KNOWLEDGE_ANSWER_GENERATED)

    improvement_result = resolve_improvement_command(query_text, request.payload)
    improvement_message = improvement_result.message if improvement_result else None
    if improvement_result is not None and improvement_result.query_executed:
        trace.append(IMPROVEMENT_QUERY_EXECUTED)
    if improvement_result is not None and improvement_result.candidate_found:
        trace.append(IMPROVEMENT_CANDIDATE_FOUND)
    if improvement_result is not None and improvement_result.assessment_created:
        trace.append(IMPROVEMENT_ASSESSMENT_CREATED)
    if improvement_result is not None and improvement_result.recommendation_generated:
        trace.append(IMPROVEMENT_RECOMMENDATION_GENERATED)

    architect_result = resolve_architect_command(query_text, request.payload)
    architect_message = architect_result.message if architect_result else None
    if architect_result is not None and architect_result.profile_loaded:
        trace.append(ARCHITECT_PROFILE_LOADED)
    if architect_result is not None and architect_result.question_answered:
        trace.append(ARCHITECT_QUESTION_ANSWERED)
    if architect_result is not None and architect_result.dependency_analyzed:
        trace.append(ARCHITECT_DEPENDENCY_ANALYZED)
    if architect_result is not None and architect_result.change_impact_analyzed:
        trace.append(ARCHITECT_CHANGE_IMPACT_ANALYZED)

    recommendation_result = resolve_recommendation_command(query_text, request.payload)
    recommendation_message = recommendation_result.message if recommendation_result else None
    if recommendation_result is not None and recommendation_result.recommendation_generated:
        trace.append(RECOMMENDATION_GENERATED)
    if recommendation_result is not None and recommendation_result.template_selected:
        trace.append(RECOMMENDATION_TEMPLATE_SELECTED)
    if recommendation_result is not None and recommendation_result.next_step_created:
        trace.append(RECOMMENDATION_NEXT_STEP_CREATED)
    if recommendation_result is not None and recommendation_result.blocker_resolution_created:
        trace.append(RECOMMENDATION_BLOCKER_RESOLUTION_CREATED)

    blocker_result = resolve_blocker_command(query_text, request.payload)
    blocker_message = blocker_result.message if blocker_result else None
    if blocker_result is not None and blocker_result.assessment_created:
        trace.append(BLOCKER_ASSESSMENT_CREATED)
    if blocker_result is not None and blocker_result.blocker_detected:
        trace.append(BLOCKER_DETECTED)
    if blocker_result is not None and blocker_result.dependency_found:
        trace.append(BLOCKER_DEPENDENCY_FOUND)
    if blocker_result is not None and blocker_result.conflict_found:
        trace.append(BLOCKER_CONFLICT_FOUND)

    unlock_result = resolve_unlock_command(query_text, request.payload)
    unlock_message = unlock_result.message if unlock_result else None
    if unlock_result is not None and unlock_result.score_generated:
        trace.append(UNLOCK_SCORE_GENERATED)
    if unlock_result is not None and unlock_result.ranking_created:
        trace.append(UNLOCK_RANKING_CREATED)
    if unlock_result is not None and unlock_result.candidate_scored:
        trace.append(UNLOCK_CANDIDATE_SCORED)

    strategy_result = resolve_strategy_command(query_text, request.payload)
    strategy_message = strategy_result.message if strategy_result else None
    if strategy_result is not None and strategy_result.assessment_created:
        trace.append(STRATEGY_ASSESSMENT_CREATED)
    if strategy_result is not None and strategy_result.recommendation_generated:
        trace.append(STRATEGY_RECOMMENDATION_GENERATED)
    if strategy_result is not None and strategy_result.conflict_detected:
        trace.append(STRATEGY_CONFLICT_DETECTED)
    if strategy_result is not None and strategy_result.goal_alignment_checked:
        trace.append(STRATEGY_GOAL_ALIGNMENT_CHECKED)

    decision_memory_result = resolve_decision_memory_command(query_text, request.payload)
    decision_memory_message = decision_memory_result.message if decision_memory_result else None
    if decision_memory_result is not None and decision_memory_result.decision_saved:
        trace.append(DECISION_SAVED)
    if decision_memory_result is not None and decision_memory_result.decision_updated:
        trace.append(DECISION_UPDATED)
    if decision_memory_result is not None and decision_memory_result.decision_conflict_detected:
        trace.append(DECISION_CONFLICT_DETECTED)
    if decision_memory_result is not None and decision_memory_result.decision_saved:
        trace.append(MEMORY_GRAPH_LINK_CREATED)

    memory_graph_result = resolve_memory_graph_command(query_text, request.payload)
    memory_graph_message = memory_graph_result.message if memory_graph_result else None

    session_memory_result = resolve_session_memory_command(query_text, request.payload)
    session_memory_message = session_memory_result.message if session_memory_result else None
    if session_memory_result is not None and session_memory_result.memory_cleared:
        trace.append(SESSION_MEMORY_CLEARED)
    if session_memory_result is not None and session_memory_result.summary_generated:
        trace.append(SESSION_SUMMARY_GENERATED)

    tenant_memory_result = resolve_tenant_memory_command(query_text, request.payload)
    tenant_memory_message = tenant_memory_result.message if tenant_memory_result else None
    if tenant_memory_result is not None and tenant_memory_result.memory_saved:
        trace.append(TENANT_MEMORY_SAVED)
    if tenant_memory_result is not None and tenant_memory_result.memory_deleted:
        trace.append(TENANT_MEMORY_DELETED)

    user_memory_result = resolve_user_memory_command(query_text, request.payload)
    user_memory_message = user_memory_result.message if user_memory_result else None
    if user_memory_result is not None and user_memory_result.memory_saved:
        trace.append(MEMORY_SAVED)
    if user_memory_result is not None and user_memory_result.memory_deleted:
        trace.append(MEMORY_DELETED)

    dashboard_message = resolve_dashboard_context_message(query_text, request.payload)
    object_card_message = resolve_object_card_context_message(query_text, request.payload)
    registry_message = resolve_registry_context_message(query_text, request.payload)
    designer_message = resolve_designer_context_message(query_text, request.payload)
    document_message = resolve_document_context_message(query_text, request.payload)
    process_message = resolve_process_context_message(query_text, request.payload)
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
        user_identity_message
        or governance_message
        or development_intelligence_message
        or business_explanation_message
        or project_awareness_message
        or knowledge_corpus_message
        or improvement_message
        or architect_message
        or recommendation_message
        or blocker_message
        or unlock_message
        or strategy_message
        or decision_memory_message
        or memory_graph_message
        or session_memory_message
        or tenant_memory_message
        or user_memory_message
        or dashboard_message
        or object_card_message
        or registry_message
        or designer_message
        or document_message
        or process_message
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
    if knowledge_message is None:
        host_surface = str(
            request.payload.get("hostSurface") or request.payload.get("surfaceId") or ""
        ).strip().lower()
        if host_surface == "registry":
            knowledge_message = resolve_registry_surface_fallback(request.payload)
        elif host_surface == "object_card":
            knowledge_message = resolve_object_card_surface_fallback(request.payload)
        elif host_surface == "designer":
            knowledge_message = resolve_designer_surface_fallback(request.payload)
        elif host_surface == "document":
            knowledge_message = resolve_document_surface_fallback(request.payload)
        elif host_surface == "process":
            knowledge_message = resolve_process_surface_fallback(request.payload)

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

    if (
        session_id
        and user_id
        and not should_skip_session_recording(query_text)
        and not (session_memory_result is not None and session_memory_result.memory_cleared)
    ):
        record_session_exchange(
            tenant_id,
            user_id,
            session_id,
            user_text=query_text,
            assistant_text=response_message,
            host_surface=host_surface,
        )
        trace.append(SESSION_MEMORY_UPDATED)

    if e2e_mvp_trace == "completed":
        trace.append(YASII_E2E_MVP_COMPLETED)
    if e2e_mvp_trace == "validated":
        trace.append(YASII_E2E_FLOW_VALIDATED)

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
