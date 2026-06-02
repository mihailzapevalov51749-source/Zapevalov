"""Improvement Query Standalone — discovery layer over Strategy, Architect, Memory (P9-W06)."""

from __future__ import annotations

import re
from enum import Enum
from uuid import uuid4

from pydantic import BaseModel, Field

from app.modules.yasii.blocker_detection import BlockerType, build_blocker_assessment
from app.modules.yasii.decision_memory_store import list_decision_records
from app.modules.yasii.deviation_registry import get_deviation_registry
from app.modules.yasii.memory_graph import load_memory_graph
from app.modules.yasii.strategy_engine import assess_recommendations
from app.modules.yasii.unlock_score import build_unlock_assessment

IMPROVEMENT_QUERY_SCHEMA_VERSION = "0.1.0"
ASSESSMENT_HEADER = "Improvement Assessment"

_IMPACT_ORDER = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}


class ImprovementCategory(str, Enum):
    ARCHITECTURE = "ARCHITECTURE"
    TECHNICAL_DEBT = "TECHNICAL_DEBT"
    READINESS = "READINESS"
    PROCESS = "PROCESS"
    KNOWLEDGE = "KNOWLEDGE"
    MEMORY = "MEMORY"
    DOCUMENTATION = "DOCUMENTATION"


class ImprovementCandidate(BaseModel):
    improvementId: str = Field(default_factory=lambda: f"improve-{uuid4().hex[:12]}")
    title: str = ""
    category: ImprovementCategory = ImprovementCategory.ARCHITECTURE
    impact: str = "MEDIUM"
    reasoning: list[str] = Field(default_factory=list)
    affectedAreas: list[str] = Field(default_factory=list)
    recommendedAction: str = ""


class ImprovementAssessment(BaseModel):
    schemaVersion: str = Field(default=IMPROVEMENT_QUERY_SCHEMA_VERSION)
    assessmentId: str = Field(default_factory=lambda: f"improve-assess-{uuid4().hex[:12]}")
    focusCategory: ImprovementCategory | None = None
    candidates: list[ImprovementCandidate] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


GENERAL_KEYWORDS = (
    "что можно улучшить",
    "какие есть улучшения",
    "что стоит оптимизировать",
    "что можно сделать лучше",
    "точки улучшения",
    "потенциальные улучшения",
)

ARCHITECTURE_KEYWORDS = (
    "архитектурные улучшения",
    "слабые места архитектуры",
    "слабое место архитектуры",
    "архитектурный долг",
)

TECHNICAL_DEBT_KEYWORDS = (
    "технический долг",
    "technical debt",
    "техдолг",
)

PROCESS_KEYWORDS = (
    "улучшить в процессах",
    "улучшения в процессах",
    "где есть узкие места",
    "узкие места в процесс",
)

READINESS_KEYWORDS = (
    "повысить готовность",
    "готовность платформы",
    "выйти на следующий уровень",
    "следующий уровень зрелости",
    "что мешает повысить готовность",
)

KNOWLEDGE_KEYWORDS = (
    "улучшения нужны ясии",
    "улучшения нужны yasii",
    "что ещё не реализовано",
    "что еще не реализовано",
    "knowledge layer",
    "слой знаний",
)

MEMORY_KEYWORDS = (
    "улучшения памяти",
    "memory layer",
    "memory graph",
    "decision memory",
)

IMPROVEMENT_QUERY_KEYWORDS = (
    *GENERAL_KEYWORDS,
    *ARCHITECTURE_KEYWORDS,
    *TECHNICAL_DEBT_KEYWORDS,
    *PROCESS_KEYWORDS,
    *READINESS_KEYWORDS,
    *KNOWLEDGE_KEYWORDS,
    *MEMORY_KEYWORDS,
    "слабое место",
    "слабые места",
    "что выглядит слабым",
    "где технический долг",
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _tenant_id(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def is_improvement_query(query_text: str) -> bool:
    from app.modules.yasii.recommendation_answers import is_recommendation_command

    if is_recommendation_command(query_text):
        return False

    normalized = _normalize(query_text)
    if not normalized:
        return False
    return any(keyword in normalized for keyword in IMPROVEMENT_QUERY_KEYWORDS)


def select_improvement_focus_category(query_text: str) -> ImprovementCategory | None:
    normalized = _normalize(query_text)
    if any(keyword in normalized for keyword in TECHNICAL_DEBT_KEYWORDS):
        return ImprovementCategory.TECHNICAL_DEBT
    if any(keyword in normalized for keyword in READINESS_KEYWORDS):
        return ImprovementCategory.READINESS
    if any(keyword in normalized for keyword in PROCESS_KEYWORDS):
        return ImprovementCategory.PROCESS
    if any(keyword in normalized for keyword in ARCHITECTURE_KEYWORDS):
        return ImprovementCategory.ARCHITECTURE
    if any(keyword in normalized for keyword in KNOWLEDGE_KEYWORDS):
        return ImprovementCategory.KNOWLEDGE
    if any(keyword in normalized for keyword in MEMORY_KEYWORDS):
        return ImprovementCategory.MEMORY
    return None


def _add_candidate(
    items: list[ImprovementCandidate],
    seen: set[str],
    *,
    title: str,
    category: ImprovementCategory,
    impact: str,
    reasoning: list[str],
    affected_areas: list[str],
    action: str,
) -> None:
    key = _normalize(title)
    if not key or key in seen:
        return
    seen.add(key)
    items.append(
        ImprovementCandidate(
            title=title,
            category=category,
            impact=impact,
            reasoning=reasoning,
            affectedAreas=affected_areas,
            recommendedAction=action,
        ),
    )


def _static_platform_improvements(seen: set[str]) -> list[ImprovementCandidate]:
    items: list[ImprovementCandidate] = []
    _add_candidate(
        items,
        seen,
        title="Завершить Relation / Event / Permission Engine",
        category=ImprovementCategory.ARCHITECTURE,
        impact="HIGH",
        reasoning=[
            "YASNOPRO_ARCHITECTURE_STATUS: движки не реализованы",
            "Architect Profile: платформа Level 1 — Hybrid Architecture",
        ],
        affected_areas=["Platform Core", "Object-centric contour"],
        action="Спланировать этап внедрения недостающих engines по Roadmap.",
    )
    _add_candidate(
        items,
        seen,
        title="Снизить legacy dual SoT в табличном контуре",
        category=ImprovementCategory.TECHNICAL_DEBT,
        impact="HIGH",
        reasoning=[
            "ADR-001 и Architecture Status: legacy UT existing-only",
            "Рост dual SoT остановлен, но контур требует миграции",
        ],
        affected_areas=["Runtime Entity", "Universal Table legacy"],
        action="Продолжить изоляцию legacy blocks и перевод primary path на Runtime Entity.",
    )
    _add_candidate(
        items,
        seen,
        title="Развернуть Knowledge Layer поверх Memory Foundation",
        category=ImprovementCategory.KNOWLEDGE,
        impact="HIGH",
        reasoning=[
            "YASII_IMPLEMENTATION_ROADMAP: Knowledge Foundation после Memory",
            "Завершены Memory Graph и Architect Profile",
        ],
        affected_areas=["Knowledge Layer", "YASII Core", "Memory Layer"],
        action="Перейти к следующему WI этапа Knowledge & Strategy Foundation.",
    )
    _add_candidate(
        items,
        seen,
        title="Повысить зрелость платформы до Level 2 Partial Platform Core",
        category=ImprovementCategory.READINESS,
        impact="MEDIUM",
        reasoning=[
            "Architecture Status: текущий уровень Level 1 Hybrid",
            "Runtime и Designer частично разделены",
        ],
        affected_areas=["Platform readiness", "Designer", "Runtime"],
        action="Закрыть критические debt-items и стабилизировать object-centric контур.",
    )
    return items


def collect_improvement_candidates(tenant_id: str, payload: dict, query_text: str) -> list[ImprovementCandidate]:
    seen: set[str] = set()
    candidates: list[ImprovementCandidate] = []
    sources: list[str] = []

    candidates.extend(_static_platform_improvements(seen))
    sources.append("YASNOPRO_ARCHITECTURE_STATUS.md")
    sources.append("YASII_IMPLEMENTATION_ROADMAP.md")

    registry = get_deviation_registry()
    for deviation in registry.deviations:
        category = (
            ImprovementCategory.TECHNICAL_DEBT
            if "данн" in deviation.title.casefold() or "риск" in deviation.title.casefold()
            else ImprovementCategory.READINESS
        )
        _add_candidate(
            candidates,
            seen,
            title=deviation.title,
            category=category,
            impact="HIGH" if deviation.severity.value == "HIGH" else "MEDIUM",
            reasoning=[deviation.currentState, deviation.expectedState],
            affected_areas=["Owner MVP", "Project data"],
            action=deviation.recommendation,
        )
    sources.append("Deviation Registry")

    blocker_assessment = build_blocker_assessment(tenant_id, query_text, payload)
    for blocker in blocker_assessment.blockers[:5]:
        category = ImprovementCategory.PROCESS
        if blocker.blockerType == BlockerType.DECISION_CONFLICT:
            category = ImprovementCategory.MEMORY
        elif blocker.blockerType in {BlockerType.MISSING_DEPENDENCY, BlockerType.MISSING_DECISION}:
            category = ImprovementCategory.READINESS
        _add_candidate(
            candidates,
            seen,
            title=blocker.title or "Устранить блокер прогресса",
            category=category,
            impact="HIGH" if blocker.severity == "HIGH" else "MEDIUM",
            reasoning=[blocker.reasoning, *blocker.signals[:2]],
            affected_areas=["Strategy Layer", "Blocker Detection"],
            action=blocker.recommendedAction or "Снять блокер по Blocker Detection.",
        )
    sources.append("Blocker Detection")

    unlock = build_unlock_assessment(tenant_id, payload)
    if unlock.topCandidate and unlock.topCandidate.score >= 50:
        _add_candidate(
            candidates,
            seen,
            title=f"Приоритет: {unlock.topCandidate.title}",
            category=ImprovementCategory.PROCESS,
            impact="MEDIUM",
            reasoning=unlock.topCandidate.signals or [unlock.topCandidate.reasoning],
            affected_areas=["Unlock Score", "Strategy Layer"],
            action="Зафиксировать приоритет в Decision Memory и выполнить вручную.",
        )
    sources.append("Unlock Score")

    strategy = assess_recommendations(tenant_id, payload)
    if strategy.recommendation:
        for item in strategy.recommendation.recommendations[:3]:
            _add_candidate(
                candidates,
                seen,
                title=item[:120],
                category=ImprovementCategory.MEMORY,
                impact="MEDIUM",
                reasoning=[strategy.recommendation.rationale],
                affected_areas=["Decision Memory", "Strategy Engine"],
                action=item,
            )
    sources.append("Strategy Engine")

    decisions = list_decision_records(tenant_id)
    if not decisions:
        _add_candidate(
            candidates,
            seen,
            title="Зафиксировать ключевые решения в Decision Memory",
            category=ImprovementCategory.MEMORY,
            impact="HIGH",
            reasoning=["нет активных решений для согласования улучшений"],
            affected_areas=["Decision Memory", "Memory Graph"],
            action="Сохранить решение tenant в Decision Memory.",
        )

    graph = load_memory_graph(tenant_id, reconcile=False)
    if decisions and not graph.links:
        _add_candidate(
            candidates,
            seen,
            title="Связать Decision Memory с Memory Graph",
            category=ImprovementCategory.MEMORY,
            impact="MEDIUM",
            reasoning=["решения есть, но связи в графе отсутствуют"],
            affected_areas=["Memory Graph", "Decision Memory"],
            action="Создать links decision → process/session в Memory Graph.",
        )
    sources.append("Memory Graph")

    _add_candidate(
        candidates,
        seen,
        title="Актуализировать архитектурную документацию по завершённым WI",
        category=ImprovementCategory.DOCUMENTATION,
        impact="LOW",
        reasoning=[
            "Architect Profile опирается на System Map и Host Contract",
            "после P9-W05/P9-W06 стоит синхронизировать Roadmap evidence",
        ],
        affected_areas=["Documentation", "Dashboard"],
        action="Обновить YASII_DASHBOARD_WORK_ITEMS и Architecture Status.",
    )
    sources.append("Architect Profile")

    ranked = sorted(candidates, key=lambda item: _IMPACT_ORDER.get(item.impact, 9))
    return ranked


def build_improvement_assessment(
    tenant_id: str,
    query_text: str,
    payload: dict,
) -> ImprovementAssessment:
    focus = select_improvement_focus_category(query_text)
    candidates = collect_improvement_candidates(tenant_id, payload, query_text)

    if focus is not None:
        focused = [item for item in candidates if item.category == focus]
        if focused:
            candidates = focused + [item for item in candidates if item.category != focus]

    sources = [
        "Architect Profile",
        "Strategy Engine",
        "Unlock Score",
        "Blocker Detection",
        "Memory Graph",
        "YASNOPRO_ARCHITECTURE_STATUS.md",
        "YASII_IMPLEMENTATION_ROADMAP.md",
    ]
    return ImprovementAssessment(
        focusCategory=focus,
        candidates=candidates[:8],
        sources=sources,
    )


def format_improvement_message(assessment: ImprovementAssessment) -> str:
    if not assessment.candidates:
        return (
            f"{ASSESSMENT_HEADER}\n\n"
            "Явных улучшений по текущему контексту не обнаружено.\n"
            "Проверьте Decision Memory и dashboard metadata."
        )

    primary = assessment.candidates[0]
    lines = [
        ASSESSMENT_HEADER,
        "",
        "Улучшение:",
        primary.title,
        "",
        "Категория:",
        primary.category.value,
        "",
        "Почему:",
    ]
    if primary.reasoning:
        lines.extend(f"- {item}" for item in primary.reasoning)
    else:
        lines.append("- сигналы Strategy Layer и Architecture Status")
    if primary.affectedAreas:
        lines.extend(["", "Затронутые области:"])
        lines.extend(f"- {area}" for area in primary.affectedAreas)
    lines.extend(["", "Рекомендуемое действие:", primary.recommendedAction or "—"])

    if len(assessment.candidates) > 1:
        lines.extend(["", f"Дополнительные улучшения ({len(assessment.candidates) - 1}):"])
        for index, item in enumerate(assessment.candidates[1:5], start=1):
            lines.append(f"{index}. [{item.category.value}] {item.title} ({item.impact})")

    if assessment.sources:
        lines.extend(["", "Источники анализа:", ", ".join(assessment.sources)])

    lines.append("")
    lines.append(
        "Improvement Query Standalone — обнаружение и приоритизация без автоматических изменений.",
    )
    return "\n".join(lines)
