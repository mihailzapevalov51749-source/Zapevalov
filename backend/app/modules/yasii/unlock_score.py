"""Unlock Score Ranking — deterministic priority over memory + strategy (P9-W02)."""

from __future__ import annotations

import re
from uuid import uuid4

from pydantic import BaseModel, Field

from app.modules.yasii.decision_memory_store import (
    detect_decision_conflict,
    list_decision_records,
    normalize_decision_text,
)
from app.modules.yasii.memory_graph import load_memory_graph, processes_linked_to_decision
from app.modules.yasii.session_memory_store import load_session_memory
from app.modules.yasii.strategy_engine import (
    _goal_signals,
    assess_decision_impact,
    assess_goal_alignment,
)
from app.modules.yasii.tenant_memory_store import list_tenant_memory_facts

UNLOCK_SCORE_SCHEMA_VERSION = "0.1.0"
ASSESSMENT_RANKING = "ranking"
ASSESSMENT_TOP = "top_recommendation"
ASSESSMENT_BLOCKER = "blocker"

_TASK_MARKERS = ("баг", "этап", "функц", "документ", "задач", "wi-", "p8-", "p9-", "решени", "memory")


class UnlockCandidate(BaseModel):
    candidateId: str = Field(default_factory=lambda: f"unlock-cand-{uuid4().hex[:10]}")
    title: str = ""
    score: int = 0
    reasoning: str = ""
    signals: list[str] = Field(default_factory=list)


class UnlockScore(BaseModel):
    """Weighted score breakdown for one candidate."""

    schemaVersion: str = Field(default=UNLOCK_SCORE_SCHEMA_VERSION)
    score: int = 0
    signals: list[str] = Field(default_factory=list)
    weights: dict[str, int] = Field(default_factory=dict)


class UnlockAssessment(BaseModel):
    schemaVersion: str = Field(default=UNLOCK_SCORE_SCHEMA_VERSION)
    assessmentId: str = Field(default_factory=lambda: f"unlock-{uuid4().hex[:12]}")
    assessmentType: str = ASSESSMENT_RANKING
    candidates: list[UnlockCandidate] = Field(default_factory=list)
    topCandidate: UnlockCandidate | None = None
    summary: str = ""


def _tenant_id(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def _token_set(text: str) -> set[str]:
    return {token for token in normalize_decision_text(text).split() if len(token) >= 4}


def _text_overlap(left: str, right: str) -> bool:
    left_tokens = _token_set(left)
    right_tokens = _token_set(right)
    if not left_tokens or not right_tokens:
        return False
    return bool(left_tokens & right_tokens)


def _split_work_items(raw: object) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    text = str(raw).strip()
    if not text:
        return []
    for separator in ("|", ";", "\n"):
        if separator in text:
            return [part.strip() for part in text.split(separator) if part.strip()]
    return [text]


def _metadata_work_items(payload: dict) -> list[str]:
    items: list[str] = []
    for key in ("currentWorkItems", "currentWorkItem", "nextWorkItems", "nextWorkItem"):
        for bucket in (
            payload.get("dashboardMetadata"),
            payload.get("snapshotMetadata"),
            payload.get("surfaceMetadata"),
        ):
            if isinstance(bucket, dict):
                items.extend(_split_work_items(bucket.get(key)))
    return items


def _session_task_titles(tenant_id: str, payload: dict) -> list[str]:
    user_id = str(payload.get("userId") or "").strip()
    session_id = str(payload.get("sessionId") or "").strip()
    if not user_id or not session_id:
        return []
    session = load_session_memory(tenant_id, user_id, session_id)
    titles: list[str] = []
    for turn in session.turns[-8:]:
        if turn.role != "user":
            continue
        text = str(turn.text or "").strip()
        if len(text) < 12:
            continue
        titles.append(text[:120])
    titles.extend(session.topics[:5])
    return titles


def _default_candidates() -> list[str]:
    return [
        "Зафиксировать ключевое решение в Decision Memory",
        "Сверить текущий шаг с Memory Graph и активными решениями",
        "Подвести итог сессии и обновить Decision Memory",
    ]


def collect_unlock_candidates(tenant_id: str, payload: dict) -> list[UnlockCandidate]:
    seen: set[str] = set()
    candidates: list[UnlockCandidate] = []

    def add_title(title: str) -> None:
        cleaned = re.sub(r"\s+", " ", str(title or "").strip())
        if not cleaned:
            return
        key = normalize_decision_text(cleaned)
        if key in seen:
            return
        seen.add(key)
        candidates.append(UnlockCandidate(title=cleaned))

    for item in _metadata_work_items(payload):
        add_title(item)
    for record in list_decision_records(tenant_id):
        add_title(f"Продолжить: {record.decisionText[:100]}")
    for title in _session_task_titles(tenant_id, payload):
        add_title(title)
    for fact in list_tenant_memory_facts(tenant_id)[:5]:
        if any(marker in normalize_decision_text(fact.text) for marker in _TASK_MARKERS + ("цель", "приоритет")):
            add_title(fact.text[:120])

    if not candidates:
        for title in _default_candidates():
            add_title(title)

    return candidates


def score_unlock_candidate(
    candidate: UnlockCandidate,
    tenant_id: str,
    payload: dict,
) -> UnlockScore:
    weights: dict[str, int] = {}
    signals: list[str] = []
    score = 30

    decisions = list_decision_records(tenant_id)
    goals = _goal_signals(tenant_id, payload)
    user_id = str(payload.get("userId") or "").strip()
    session_id = str(payload.get("sessionId") or "").strip()
    session_texts: list[str] = []
    if user_id and session_id:
        session = load_session_memory(tenant_id, user_id, session_id)
        session_texts = [turn.text for turn in session.turns[-8:] if turn.role == "user"]

    for record in decisions:
        if _text_overlap(candidate.title, record.decisionText):
            weights["decision_memory"] = 25
            signals.append("связано с активными решениями")
            break

    for goal in goals:
        if _text_overlap(candidate.title, goal):
            weights["tenant_goals"] = 20
            signals.append("согласуется с целями организации")
            break

    for text in session_texts:
        if _text_overlap(candidate.title, text):
            weights["session_memory"] = 15
            signals.append("обсуждалось в текущей сессии")
            break

    graph = load_memory_graph(tenant_id, reconcile=False)
    for record in decisions[:5]:
        if processes_linked_to_decision(graph, record.decisionId) and _text_overlap(
            candidate.title,
            record.decisionText,
        ):
            weights["memory_graph"] = 10
            signals.append("связано в Memory Graph")
            break

    impact = assess_decision_impact(tenant_id, candidate.title, payload)
    if impact.impact and impact.impact.relatedDecisions:
        weights["strategy_impact"] = 12
        signals.append("высокий стратегический эффект (Strategy Engine)")

    alignment = assess_goal_alignment(tenant_id, candidate.title, payload)
    if alignment.goalAlignment and alignment.goalAlignment.aligned:
        weights["strategy_goals"] = 8
        signals.append("подтверждено проверкой целей (Strategy Engine)")

    surface = str(payload.get("hostSurface") or "").strip()
    if surface and surface.casefold() in normalize_decision_text(candidate.title):
        weights["host_surface"] = 8
        signals.append("соответствует текущей поверхности HostContext")

    score += sum(weights.values())
    score = min(score, 100)

    reasoning_parts = [f"Unlock Score {score}/100."]
    if signals:
        reasoning_parts.append("Причины: " + "; ".join(signals))
    candidate.score = score
    candidate.signals = signals
    candidate.reasoning = " ".join(reasoning_parts)
    return UnlockScore(score=score, signals=signals, weights=weights)


def _blocker_candidates(tenant_id: str, payload: dict) -> list[UnlockCandidate]:
    blockers: list[UnlockCandidate] = []
    decisions = list_decision_records(tenant_id)
    if not decisions:
        blockers.append(
            UnlockCandidate(
                title="Нет зафиксированных решений в Decision Memory",
                score=92,
                reasoning="Без решений сложно согласовать приоритеты и стратегию.",
                signals=["блокирует согласованность приоритетов"],
            ),
        )

    conflict = detect_decision_conflict(
        tenant_id,
        "Создадим отдельный Dashboard YASII.",
    )
    if conflict:
        blockers.append(
            UnlockCandidate(
                title="Конфликт: отдельный Dashboard YASII vs единый ЯСИИ",
                score=88,
                reasoning=conflict,
                signals=["противоречит активному решению", "Strategy Consistency"],
            ),
        )

    graph = load_memory_graph(tenant_id, reconcile=False)
    if decisions and not graph.links:
        blockers.append(
            UnlockCandidate(
                title="Memory Graph не связан с решениями",
                score=75,
                reasoning="Связи решений в графе помогают оценивать эффект следующих шагов.",
                signals=["слабая трассировка в Memory Graph"],
            ),
        )

    if not blockers:
        blockers.append(
            UnlockCandidate(
                title="Явных узких мест не обнаружено",
                score=40,
                reasoning="Продолжайте по топу Unlock Ranking.",
                signals=["контекст согласован"],
            ),
        )
    return blockers


def build_unlock_assessment(
    tenant_id: str,
    payload: dict,
    *,
    assessment_type: str = ASSESSMENT_RANKING,
) -> UnlockAssessment:
    if assessment_type == ASSESSMENT_BLOCKER:
        ranked = sorted(_blocker_candidates(tenant_id, payload), key=lambda c: c.score, reverse=True)
        top = ranked[0] if ranked else None
        summary = "Узкие места (Unlock Score — blocker view):"
        return UnlockAssessment(
            assessmentType=ASSESSMENT_BLOCKER,
            candidates=ranked,
            topCandidate=top,
            summary=summary,
        )

    raw_candidates = collect_unlock_candidates(tenant_id, payload)
    scored: list[UnlockCandidate] = []
    for candidate in raw_candidates:
        score_unlock_candidate(candidate, tenant_id, payload)
        scored.append(candidate)

    ranked = sorted(scored, key=lambda item: item.score, reverse=True)
    top = ranked[0] if ranked else None
    assessment_type = ASSESSMENT_TOP if assessment_type == ASSESSMENT_TOP else ASSESSMENT_RANKING
    return UnlockAssessment(
        assessmentType=assessment_type,
        candidates=ranked,
        topCandidate=top,
        summary="Unlock Ranking — что даст наибольший прогресс сейчас:",
    )


def format_unlock_message(assessment: UnlockAssessment) -> str:
    lines = [assessment.summary, ""]
    if assessment.assessmentType == ASSESSMENT_BLOCKER:
        for index, candidate in enumerate(assessment.candidates[:5], start=1):
            lines.append(f"{index}. {candidate.title} — приоритет блокера {candidate.score}/100")
            if candidate.signals:
                lines.append("   • " + "; ".join(candidate.signals))
            if candidate.reasoning:
                lines.append(f"   {candidate.reasoning}")
        return "\n".join(lines)

    for index, candidate in enumerate(assessment.candidates[:5], start=1):
        lines.append(f"{index}. {candidate.title} — {candidate.score}/100")
        if candidate.signals:
            lines.append("   Причины:")
            for signal in candidate.signals:
                lines.append(f"   • {signal}")

    if assessment.topCandidate:
        lines.extend(
            [
                "",
                f"Рекомендуется сейчас: {assessment.topCandidate.title}",
                assessment.topCandidate.reasoning,
            ],
        )
    lines.append("")
    lines.append("ЯСИИ ранжирует приоритеты детерминированно — без ML и автоматических действий.")
    return "\n".join(lines)
