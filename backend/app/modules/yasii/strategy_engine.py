"""Strategy Capability Engine — deterministic assessments over Memory Layer (P9-W01)."""

from __future__ import annotations

from uuid import uuid4

from pydantic import BaseModel, Field

from app.modules.yasii.decision_memory_store import (
    detect_decision_conflict,
    list_decision_records,
    normalize_decision_text,
    search_decision_records,
)
from app.modules.yasii.memory_graph import load_memory_graph, processes_linked_to_decision
from app.modules.yasii.process_memory import build_schema_process_memory_record
from app.modules.yasii.session_memory_store import load_session_memory
from app.modules.yasii.tenant_memory_store import list_tenant_memory_facts

STRATEGY_ENGINE_SCHEMA_VERSION = "0.1.0"
ASSESSMENT_IMPACT = "impact"
ASSESSMENT_CONSISTENCY = "consistency"
ASSESSMENT_RECOMMENDATION = "recommendation"
ASSESSMENT_GOAL_ALIGNMENT = "goal_alignment"

_GOAL_MARKERS = ("цель", "цели", "стратег", "приоритет", "okr", "roadmap", "phase")


class ImpactAssessment(BaseModel):
    assessmentId: str = Field(default_factory=lambda: f"impact-{uuid4().hex[:12]}")
    summary: str = ""
    affectedAreas: list[str] = Field(default_factory=list)
    relatedDecisions: list[str] = Field(default_factory=list)


class ConsistencyAssessment(BaseModel):
    assessmentId: str = Field(default_factory=lambda: f"consistency-{uuid4().hex[:12]}")
    conflictDetected: bool = False
    summary: str = ""
    conflictingDecisions: list[str] = Field(default_factory=list)


class RecommendationAssessment(BaseModel):
    assessmentId: str = Field(default_factory=lambda: f"recommendation-{uuid4().hex[:12]}")
    recommendations: list[str] = Field(default_factory=list)
    rationale: str = ""


class GoalAlignmentAssessment(BaseModel):
    assessmentId: str = Field(default_factory=lambda: f"goal-{uuid4().hex[:12]}")
    aligned: bool | None = None
    summary: str = ""
    supportingFacts: list[str] = Field(default_factory=list)


class StrategyAssessment(BaseModel):
    schemaVersion: str = Field(default=STRATEGY_ENGINE_SCHEMA_VERSION)
    assessmentId: str = Field(default_factory=lambda: f"strategy-{uuid4().hex[:12]}")
    assessmentType: str = ""
    impact: ImpactAssessment | None = None
    consistency: ConsistencyAssessment | None = None
    recommendation: RecommendationAssessment | None = None
    goalAlignment: GoalAlignmentAssessment | None = None


def _tenant_id(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def _goal_signals(tenant_id: str, payload: dict) -> list[str]:
    signals: list[str] = []
    for fact in list_tenant_memory_facts(tenant_id):
        if any(marker in normalize_decision_text(fact.text) for marker in _GOAL_MARKERS):
            signals.append(fact.text)
    for record in list_decision_records(tenant_id):
        if any(marker in normalize_decision_text(record.decisionText) for marker in _GOAL_MARKERS):
            signals.append(record.decisionText)
    user_id = str(payload.get("userId") or "").strip()
    session_id = str(payload.get("sessionId") or "").strip()
    if user_id and session_id:
        for turn in load_session_memory(tenant_id, user_id, session_id).turns[-8:]:
            if any(marker in normalize_decision_text(turn.text) for marker in _GOAL_MARKERS):
                signals.append(turn.text)
    return signals


def assess_decision_impact(tenant_id: str, query_text: str, payload: dict) -> StrategyAssessment:
    normalized = normalize_decision_text(query_text)
    related = search_decision_records(tenant_id, normalized) if normalized else []
    if not related:
        related = list_decision_records(tenant_id)[:5]

    graph = load_memory_graph(tenant_id, reconcile=False)
    decision_texts = [record.decisionText for record in related]
    process_ids: list[str] = []
    for record in related[:3]:
        process_ids.extend(processes_linked_to_decision(graph, record.decisionId))

    schema_record = build_schema_process_memory_record(tenant_id, payload)
    if schema_record and schema_record.definition:
        process_ids.append(schema_record.definition.processId)

    lines = ["Оценка влияния (Strategy Capability):"]
    if decision_texts:
        lines.append("Связанные решения:")
        for text in decision_texts[:5]:
            lines.append(f"• {text}")
    else:
        lines.append("Активных решений для оценки пока нет.")
    if process_ids:
        lines.append("Возможное влияние на процессы (schema):")
        for pid in dict.fromkeys(process_ids):
            lines.append(f"• {pid}")
    lines.append("ЯСИИ только описывает последствия — без действий и изменений данных.")

    impact = ImpactAssessment(
        summary="\n".join(lines),
        affectedAreas=["Decision Memory", "Memory Graph", "Process Memory Schema"],
        relatedDecisions=decision_texts,
    )
    return StrategyAssessment(assessmentType=ASSESSMENT_IMPACT, impact=impact)


def assess_consistency(tenant_id: str, query_text: str) -> StrategyAssessment:
    conflict = detect_decision_conflict(tenant_id, query_text)
    consistency = ConsistencyAssessment(
        conflictDetected=conflict is not None,
        summary=conflict or "Явных противоречий с активными решениями не обнаружено.",
        conflictingDecisions=[r.decisionText for r in list_decision_records(tenant_id)[:5]],
    )
    return StrategyAssessment(assessmentType=ASSESSMENT_CONSISTENCY, consistency=consistency)


def assess_recommendations(tenant_id: str, payload: dict) -> StrategyAssessment:
    decisions = list_decision_records(tenant_id)
    tenant_facts = list_tenant_memory_facts(tenant_id)
    items: list[str] = []
    parts: list[str] = []

    if decisions:
        items.append(f"Учитывать решение: «{decisions[0].decisionText}».")
        parts.append("Decision Memory")
    else:
        items.append("Зафиксировать ключевое решение в Decision Memory.")

    surface = str(payload.get("hostSurface") or "").strip()
    if surface:
        items.append(f"Продолжить в контексте «{surface}» и сверить с Memory Graph.")
        parts.append("HostContext")

    if tenant_facts:
        items.append(f"Сверить с фактом организации: «{tenant_facts[0].text[:100]}».")
        parts.append("Tenant Memory")

    user_id = str(payload.get("userId") or "").strip()
    session_id = str(payload.get("sessionId") or "").strip()
    if user_id and session_id and load_session_memory(tenant_id, user_id, session_id).turns:
        items.append("Подвести итог сессии и обновить Decision Memory при новых договорённостях.")
        parts.append("Session Memory")

    recommendation = RecommendationAssessment(
        recommendations=items[:5],
        rationale="Основание: " + (", ".join(parts) or "текущий контекст"),
    )
    return StrategyAssessment(assessmentType=ASSESSMENT_RECOMMENDATION, recommendation=recommendation)


def assess_goal_alignment(tenant_id: str, query_text: str, payload: dict) -> StrategyAssessment:
    signals = _goal_signals(tenant_id, payload)
    normalized = normalize_decision_text(query_text)
    if not signals:
        goal = GoalAlignmentAssessment(
            aligned=None,
            summary=(
                "Явных целей в Tenant/Session/Decision Memory нет. "
                "Добавьте цель («Запомни для компании: наша цель …») для проверки."
            ),
            supportingFacts=[],
        )
        return StrategyAssessment(assessmentType=ASSESSMENT_GOAL_ALIGNMENT, goalAlignment=goal)

    haystack = normalize_decision_text(" ".join(signals))
    if any(marker in normalized for marker in _GOAL_MARKERS):
        aligned = True
        summary = "Вопрос относится к целям; в памяти есть зафиксированные ориентиры для сверки."
    else:
        query_tokens = {token for token in normalized.split() if len(token) >= 4}
        signal_tokens = {token for token in haystack.split() if len(token) >= 4}
        aligned = bool(query_tokens & signal_tokens)
        summary = (
            "Предложение согласуется с зафиксированными целями."
            if aligned
            else "Прямого совпадения с зафиксированными целями не видно."
        )
    goal = GoalAlignmentAssessment(aligned=aligned, summary=summary, supportingFacts=signals[:5])
    return StrategyAssessment(assessmentType=ASSESSMENT_GOAL_ALIGNMENT, goalAlignment=goal)


def format_strategy_message(assessment: StrategyAssessment) -> str:
    if assessment.impact:
        return assessment.impact.summary
    if assessment.consistency:
        prefix = "Проверка согласованности (Strategy Capability):\n"
        return prefix + assessment.consistency.summary
    if assessment.recommendation:
        lines = ["Рекомендации ЯСИИ (без автоматических действий):"]
        lines.extend(f"• {item}" for item in assessment.recommendation.recommendations)
        if assessment.recommendation.rationale:
            lines.append(f"\nОснование: {assessment.recommendation.rationale}")
        return "\n".join(lines)
    if assessment.goalAlignment:
        lines = ["Проверка соответствия целям (Strategy Capability):", assessment.goalAlignment.summary]
        if assessment.goalAlignment.supportingFacts:
            lines.append("Опорные сигналы:")
            lines.extend(f"• {fact}" for fact in assessment.goalAlignment.supportingFacts)
        return "\n".join(lines)
    return "Strategy Capability Engine не сформировал оценку."
