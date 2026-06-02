"""Strategy Capability query handling (P9-W01)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.yasii.strategy_engine import (
    ASSESSMENT_CONSISTENCY,
    ASSESSMENT_GOAL_ALIGNMENT,
    ASSESSMENT_IMPACT,
    StrategyAssessment,
    assess_consistency,
    assess_decision_impact,
    assess_goal_alignment,
    format_strategy_message,
)

IMPACT_KEYWORDS = (
    "на что повлияет",
    "какие последствия",
    "что изменится",
    "что изменится если",
    "влияние",
)

CONSISTENCY_KEYWORDS = (
    "противоречит ли",
    "конфликт с ранее",
    "конфликт с решени",
    "есть ли конфликт",
)

GOAL_KEYWORDS = (
    "соответствует ли это нашим целям",
    "приближает ли это нас к цели",
    "соответствует ли нашим целям",
)


@dataclass(frozen=True)
class StrategyCommandResult:
    message: str
    assessment_created: bool = False
    recommendation_generated: bool = False
    conflict_detected: bool = False
    goal_alignment_checked: bool = False


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _tenant(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def is_strategy_command(query_text: str, payload: dict | None = None) -> bool:
    from app.modules.yasii.architect_answers import is_architect_command
    from app.modules.yasii.blocker_answers import is_blocker_command
    from app.modules.yasii.improvement_answers import is_improvement_command
    from app.modules.yasii.recommendation_answers import is_recommendation_command
    from app.modules.yasii.unlock_score_answers import is_unlock_command

    if (
        is_improvement_command(query_text)
        or is_architect_command(query_text)
        or is_blocker_command(query_text)
        or is_unlock_command(query_text)
        or is_recommendation_command(query_text)
    ):
        return False

    normalized = _normalize(query_text)
    if not normalized:
        return False
    groups = (IMPACT_KEYWORDS, CONSISTENCY_KEYWORDS, GOAL_KEYWORDS)
    if any(keyword in normalized for group in groups for keyword in group):
        return True
    if payload is not None:
        return detect_proposal_conflict(_tenant(payload), query_text)
    return False


def resolve_strategy_command(query_text: str, payload: dict) -> StrategyCommandResult | None:
    normalized = _normalize(query_text)
    if not normalized:
        return None

    tenant_id = _tenant(payload)
    assessment: StrategyAssessment | None = None
    flags = StrategyCommandResult(message="")

    if any(keyword in normalized for keyword in IMPACT_KEYWORDS):
        assessment = assess_decision_impact(tenant_id, query_text, payload)
    elif any(keyword in normalized for keyword in CONSISTENCY_KEYWORDS):
        assessment = assess_consistency(tenant_id, query_text)
    elif any(keyword in normalized for keyword in GOAL_KEYWORDS):
        assessment = assess_goal_alignment(tenant_id, query_text, payload)
    elif detect_proposal_conflict(tenant_id, query_text):
        assessment = assess_consistency(tenant_id, query_text)

    if assessment is None:
        return None

    message = format_strategy_message(assessment)
    return StrategyCommandResult(
        message=message,
        assessment_created=True,
        recommendation_generated=False,
        conflict_detected=bool(
            assessment.consistency and assessment.consistency.conflictDetected,
        ),
        goal_alignment_checked=assessment.assessmentType == ASSESSMENT_GOAL_ALIGNMENT,
    )


def detect_proposal_conflict(tenant_id: str, query_text: str) -> bool:
    """Route proposal-style questions (e.g. separate Dashboard) to consistency."""
    from app.modules.yasii.decision_memory_store import detect_decision_conflict

    normalized = _normalize(query_text)
    proposal_markers = ("создадим", "сделаем", "отдельный dashboard", "отдельный ясии")
    if not any(marker in normalized for marker in proposal_markers):
        return False
    return detect_decision_conflict(tenant_id, query_text) is not None
