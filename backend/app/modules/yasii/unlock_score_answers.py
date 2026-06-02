"""Unlock Score Ranking query handling (P9-W02)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.yasii.unlock_score import (
    ASSESSMENT_RANKING,
    ASSESSMENT_TOP,
    UnlockAssessment,
    build_unlock_assessment,
    format_unlock_message,
)

PRIORITY_KEYWORDS = (
    "что сейчас наиболее важно",
    "покажи приоритеты",
    "покажи топ задач",
    "на чём стоит сосредоточиться",
    "на чем стоит сосредоточиться",
    "какая задача даст максимальный эффект",
)

NEXT_STEP_KEYWORDS = (
    "что лучше сделать следующим",
)

@dataclass(frozen=True)
class UnlockScoreCommandResult:
    message: str
    score_generated: bool = False
    ranking_created: bool = False
    candidate_scored: bool = False


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _tenant(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def is_unlock_command(query_text: str) -> bool:
    from app.modules.yasii.architect_answers import is_architect_command
    from app.modules.yasii.blocker_answers import is_blocker_command
    from app.modules.yasii.improvement_answers import is_improvement_command
    from app.modules.yasii.recommendation_answers import is_recommendation_command

    if (
        is_improvement_command(query_text)
        or is_architect_command(query_text)
        or is_blocker_command(query_text)
        or is_recommendation_command(query_text)
    ):
        return False

    normalized = _normalize(query_text)
    if not normalized:
        return False
    groups = (PRIORITY_KEYWORDS, NEXT_STEP_KEYWORDS)
    return any(keyword in normalized for group in groups for keyword in group)


def _assessment_type(query_text: str) -> str:
    normalized = _normalize(query_text)
    if any(keyword in normalized for keyword in NEXT_STEP_KEYWORDS):
        return ASSESSMENT_TOP
    return ASSESSMENT_RANKING


def resolve_unlock_command(query_text: str, payload: dict) -> UnlockScoreCommandResult | None:
    if not is_unlock_command(query_text):
        return None

    tenant_id = _tenant(payload)
    assessment: UnlockAssessment = build_unlock_assessment(
        tenant_id,
        payload,
        assessment_type=_assessment_type(query_text),
    )
    message = format_unlock_message(assessment)
    return UnlockScoreCommandResult(
        message=message,
        score_generated=True,
        ranking_created=assessment.assessmentType in {ASSESSMENT_RANKING, ASSESSMENT_TOP},
        candidate_scored=bool(assessment.candidates),
    )
