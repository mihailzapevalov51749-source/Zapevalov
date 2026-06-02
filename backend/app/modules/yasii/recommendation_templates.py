"""Strategy Recommendation Templates — structured guidance over Strategy Layer (P9-W04)."""

from __future__ import annotations

import re
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field

from app.modules.yasii.blocker_detection import (
    BlockerType,
    build_blocker_assessment,
)
from app.modules.yasii.decision_memory_store import list_decision_records
from app.modules.yasii.memory_graph import load_memory_graph, processes_linked_to_decision
from app.modules.yasii.process_memory import build_schema_process_memory_record
from app.modules.yasii.strategy_engine import (
    assess_goal_alignment,
    assess_recommendations,
)
from app.modules.yasii.unlock_score import (
    ASSESSMENT_TOP,
    build_unlock_assessment,
)

RECOMMENDATION_TEMPLATES_SCHEMA_VERSION = "0.1.0"
TEMPLATE_HEADER = "Strategy Recommendation (P9-W04):"


class RecommendationType(str, Enum):
    NEXT_STEP = "NEXT_STEP"
    PRIORITY = "PRIORITY"
    BLOCKER_RESOLUTION = "BLOCKER_RESOLUTION"
    DECISION = "DECISION"
    GOAL_ALIGNMENT = "GOAL_ALIGNMENT"
    PROCESS = "PROCESS"


class RecommendationTemplate(BaseModel):
    recommendationId: str = Field(default_factory=lambda: f"rec-{uuid4().hex[:12]}")
    title: str = ""
    recommendationType: RecommendationType = RecommendationType.NEXT_STEP
    goal: str = ""
    reasoning: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    nextStep: str = ""
    expectedEffect: str = ""


class RecommendationAssessment(BaseModel):
    schemaVersion: str = Field(default=RECOMMENDATION_TEMPLATES_SCHEMA_VERSION)
    assessmentId: str = Field(default_factory=lambda: f"rec-assess-{uuid4().hex[:12]}")
    template: RecommendationTemplate
    sources: list[str] = Field(default_factory=list)


BLOCKER_RESOLUTION_KEYWORDS = (
    "как устранить блокер",
    "устранить блокер",
    "снять блокер",
    "разблокировать",
)

GOAL_ALIGNMENT_KEYWORDS = (
    "что поможет достичь цели",
    "как достичь цели",
    "достичь цели",
    "приблизиться к цели",
    "соответствует целям",
)

PRIORITY_KEYWORDS = (
    "что сейчас лучше сделать",
    "что лучше сделать сейчас",
    "что важнее сейчас",
    "на что сосредоточиться",
)

NEXT_STEP_KEYWORDS = (
    "что делать дальше",
    "какой следующий шаг",
    "следующий шаг",
    "что делать сейчас",
)

DECISION_KEYWORDS = (
    "что ты рекомендуешь",
    "что рекомендуешь",
    "какое решение",
)

PROCESS_KEYWORDS = (
    "что будет лучшей стратегией",
    "лучшая стратегия",
    "стратегия развития",
    "стратегический план",
)

RECOMMENDATION_COMMAND_KEYWORDS = (
    *BLOCKER_RESOLUTION_KEYWORDS,
    *GOAL_ALIGNMENT_KEYWORDS,
    *PRIORITY_KEYWORDS,
    *NEXT_STEP_KEYWORDS,
    *DECISION_KEYWORDS,
    *PROCESS_KEYWORDS,
    "что лучше сделать дальше",
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _tenant_id(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def select_recommendation_type(query_text: str) -> RecommendationType:
    normalized = _normalize(query_text)
    if any(keyword in normalized for keyword in BLOCKER_RESOLUTION_KEYWORDS):
        return RecommendationType.BLOCKER_RESOLUTION
    if any(keyword in normalized for keyword in GOAL_ALIGNMENT_KEYWORDS):
        return RecommendationType.GOAL_ALIGNMENT
    if any(keyword in normalized for keyword in PRIORITY_KEYWORDS):
        return RecommendationType.PRIORITY
    if any(keyword in normalized for keyword in NEXT_STEP_KEYWORDS):
        return RecommendationType.NEXT_STEP
    if any(keyword in normalized for keyword in DECISION_KEYWORDS):
        return RecommendationType.DECISION
    if any(keyword in normalized for keyword in PROCESS_KEYWORDS):
        return RecommendationType.PROCESS
    return RecommendationType.NEXT_STEP


def is_recommendation_query(query_text: str) -> bool:
    normalized = _normalize(query_text)
    if not normalized:
        return False
    return any(keyword in normalized for keyword in RECOMMENDATION_COMMAND_KEYWORDS)


def _work_item_hint(payload: dict) -> str:
    for bucket in (
        payload.get("dashboardMetadata"),
        payload.get("snapshotMetadata"),
        payload.get("surfaceMetadata"),
    ):
        if isinstance(bucket, dict):
            for key in ("currentWorkItems", "currentWorkItem", "nextWorkItems"):
                raw = bucket.get(key)
                if raw:
                    return str(raw).strip()[:160]
    return "P9-W04 Strategy Recommendation Templates"


def _build_next_step_template(tenant_id: str, payload: dict) -> RecommendationTemplate:
    unlock = build_unlock_assessment(tenant_id, payload, assessment_type=ASSESSMENT_TOP)
    top = unlock.topCandidate
    work_item = _work_item_hint(payload)
    title = top.title if top else work_item
    reasoning = [
        "является приоритетным шагом по Unlock Score",
        "согласовано с Decision Memory и Memory Graph",
        "соответствует текущему этапу Strategy Layer",
    ]
    if top and top.signals:
        reasoning.extend(top.signals[:2])
    blockers = [
        item.title
        for item in build_blocker_assessment(tenant_id, "", payload).blockers[:3]
    ]
    return RecommendationTemplate(
        title=title,
        recommendationType=RecommendationType.NEXT_STEP,
        goal="Продолжить развитие Strategy Layer без автоматических действий.",
        reasoning=reasoning[:5],
        blockers=blockers,
        nextStep=top.title if top else f"Реализовать {work_item}.",
        expectedEffect="Повышение зрелости Strategy Layer и согласованности следующих WI.",
    )


def _build_priority_template(tenant_id: str, payload: dict) -> RecommendationTemplate:
    unlock = build_unlock_assessment(tenant_id, payload)
    ranked = unlock.candidates[:3]
    title = ranked[0].title if ranked else "Сверить приоритеты с Unlock Ranking"
    reasoning = [
        "ранжирование построено Unlock Score Ranking",
        "учтены Decision Memory, Session Memory и Tenant Memory",
    ]
    if ranked:
        reasoning.append(
            f"топ-кандидат: {ranked[0].title} (score {ranked[0].score}/100)",
        )
    return RecommendationTemplate(
        title=title,
        recommendationType=RecommendationType.PRIORITY,
        goal="Выбрать действие с максимальным эффектом сейчас.",
        reasoning=reasoning,
        blockers=[],
        nextStep=ranked[0].title if ranked else "Зафиксировать приоритет в Decision Memory.",
        expectedEffect="Фокус на задаче с наибольшим Unlock Score.",
    )


def _build_blocker_resolution_template(tenant_id: str, payload: dict) -> RecommendationTemplate:
    assessment = build_blocker_assessment(tenant_id, "", payload)
    primary = assessment.blockers[0] if assessment.blockers else None
    if primary and primary.blockerType == BlockerType.DECISION_CONFLICT:
        title = "Устранить конфликт решений"
        next_step = primary.recommendedAction or "Актуализировать Decision Memory."
        reasoning = ["обнаружен Decision Conflict", primary.reasoning or assessment.summary]
        effect = "устранение блокера и восстановление согласованности решений"
    elif primary:
        title = primary.title or "Устранить выявленный блокер"
        next_step = primary.recommendedAction or "Закрыть зависимость или добавить контекст."
        reasoning = [primary.reasoning or assessment.summary]
        if primary.signals:
            reasoning.extend(primary.signals[:2])
        effect = "снятие препятствия для следующего WI"
    else:
        title = "Явных блокеров не обнаружено"
        next_step = "Продолжить по Unlock Ranking."
        reasoning = [assessment.summary or "Blocker Detection не нашёл препятствий."]
        effect = "сохранение темпа без блокирующих факторов"

    return RecommendationTemplate(
        title=title,
        recommendationType=RecommendationType.BLOCKER_RESOLUTION,
        goal="Снять препятствия перед следующим шагом.",
        reasoning=[item for item in reasoning if item],
        blockers=[item.title for item in assessment.blockers[:5]],
        nextStep=next_step,
        expectedEffect=effect,
    )


def _build_goal_alignment_template(tenant_id: str, query_text: str, payload: dict) -> RecommendationTemplate:
    alignment = assess_goal_alignment(tenant_id, query_text, payload)
    goal_view = alignment.goalAlignment
    decisions = list_decision_records(tenant_id)
    if goal_view and goal_view.aligned:
        title = "Продолжить развитие одного ЯСИИ"
        reasoning = ["соответствует зафиксированным решениям и целям"]
        if goal_view.supportingFacts:
            reasoning.append(f"опора: {goal_view.supportingFacts[0][:100]}")
        next_step = (
            f"Учитывать решение: «{decisions[0].decisionText[:90]}»."
            if decisions
            else "Зафиксировать цель в Tenant Memory."
        )
        effect = "сохранение целостности архитектуры"
    else:
        title = "Уточнить и зафиксировать цели"
        reasoning = [goal_view.summary if goal_view else "цели в памяти не найдены"]
        next_step = "Добавить цель («Запомни для компании: наша цель …»)."
        effect = "появится база для проверки Goal Alignment"

    return RecommendationTemplate(
        title=title,
        recommendationType=RecommendationType.GOAL_ALIGNMENT,
        goal="Достичь согласованных целей организации.",
        reasoning=reasoning,
        blockers=[],
        nextStep=next_step,
        expectedEffect=effect,
    )


def _build_decision_template(tenant_id: str, payload: dict) -> RecommendationTemplate:
    strategy = assess_recommendations(tenant_id, payload)
    items = strategy.recommendation.recommendations if strategy.recommendation else []
    title = items[0] if items else "Зафиксировать ключевое решение"
    return RecommendationTemplate(
        title=title[:120],
        recommendationType=RecommendationType.DECISION,
        goal="Согласовать следующие действия с Decision Memory.",
        reasoning=[
            strategy.recommendation.rationale if strategy.recommendation else "Strategy Engine",
            *items[1:3],
        ],
        blockers=[],
        nextStep=items[0] if items else "Сохранить решение в Decision Memory.",
        expectedEffect="решения станут опорой для Unlock Score и Blocker Detection",
    )


def _build_process_template(tenant_id: str, payload: dict) -> RecommendationTemplate:
    schema = build_schema_process_memory_record(tenant_id, payload)
    graph = load_memory_graph(tenant_id, reconcile=False)
    process_ids: list[str] = []
    if schema and schema.definition:
        process_ids.append(schema.definition.processId)
    for record in list_decision_records(tenant_id)[:3]:
        process_ids.extend(processes_linked_to_decision(graph, record.decisionId))
    unique_ids = list(dict.fromkeys(process_ids))
    title = "Согласовать процесс и решения в Memory Graph"
    if unique_ids:
        title = f"Развивать процесс {unique_ids[0]}"

    return RecommendationTemplate(
        title=title,
        recommendationType=RecommendationType.PROCESS,
        goal="Выстроить согласованную стратегию процесса и памяти.",
        reasoning=[
            "Process Memory Schema и Memory Graph дают контекст шагов",
            "Strategy Engine оценивает влияние без автоматических действий",
        ],
        blockers=[],
        nextStep="Сверить активные решения с шагами процесса в Memory Graph.",
        expectedEffect="целостная стратегия процесса без изменения данных ЯСИИ",
    )


def build_recommendation_assessment(
    tenant_id: str,
    query_text: str,
    payload: dict,
) -> RecommendationAssessment:
    rec_type = select_recommendation_type(query_text)
    sources = ["Strategy Engine"]

    if rec_type == RecommendationType.BLOCKER_RESOLUTION:
        template = _build_blocker_resolution_template(tenant_id, payload)
        sources.extend(["Blocker Detection", "Decision Memory"])
    elif rec_type == RecommendationType.PRIORITY:
        template = _build_priority_template(tenant_id, payload)
        sources.extend(["Unlock Score", "Tenant Memory", "Session Memory"])
    elif rec_type == RecommendationType.GOAL_ALIGNMENT:
        template = _build_goal_alignment_template(tenant_id, query_text, payload)
        sources.extend(["Strategy Engine", "Tenant Memory", "Decision Memory"])
    elif rec_type == RecommendationType.DECISION:
        template = _build_decision_template(tenant_id, payload)
        sources.append("Decision Memory")
    elif rec_type == RecommendationType.PROCESS:
        template = _build_process_template(tenant_id, payload)
        sources.extend(["Process Memory Schema", "Memory Graph", "Decision Memory"])
    else:
        template = _build_next_step_template(tenant_id, payload)
        sources.extend(["Unlock Score", "Blocker Detection", "Memory Graph"])

    return RecommendationAssessment(
        template=template,
        sources=list(dict.fromkeys(sources)),
    )


def format_recommendation_message(assessment: RecommendationAssessment) -> str:
    template = assessment.template
    lines = [
        TEMPLATE_HEADER,
        f"RecommendationTemplate: {template.recommendationType.value}",
        "",
        "Рекомендация:",
        template.title,
        "",
        "Почему:",
    ]
    if template.reasoning:
        lines.extend(f"- {item}" for item in template.reasoning)
    else:
        lines.append("- контекст памяти и Strategy Layer согласован")
    if template.blockers:
        lines.extend(["", "Блокеры:"])
        lines.extend(f"- {item}" for item in template.blockers)
    if template.goal:
        lines.extend(["", "Цель:", template.goal])
    lines.extend(["", "Следующий шаг:", template.nextStep or "—"])
    lines.extend(["", "Ожидаемый эффект:", template.expectedEffect or "—"])
    if assessment.sources:
        lines.extend(["", "Источники:", ", ".join(assessment.sources)])
    lines.append("")
    lines.append("ЯСИИ не выполняет действия и не изменяет данные — только структурированная рекомендация.")
    return "\n".join(lines)
