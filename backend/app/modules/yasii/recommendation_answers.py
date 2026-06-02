"""Strategy Recommendation Templates query handling (P9-W04)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.modules.yasii.recommendation_templates import (
    RecommendationType,
    build_recommendation_assessment,
    format_recommendation_message,
    is_recommendation_query,
    select_recommendation_type,
)

__all__ = (
    "RecommendationCommandResult",
    "is_recommendation_command",
    "resolve_recommendation_command",
    "select_recommendation_type",
)


@dataclass(frozen=True)
class RecommendationCommandResult:
    message: str
    recommendation_generated: bool = False
    template_selected: bool = False
    next_step_created: bool = False
    blocker_resolution_created: bool = False
    recommendation_type: str = ""


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip().casefold())


def _tenant(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def is_recommendation_command(query_text: str) -> bool:
    return is_recommendation_query(query_text)


def resolve_recommendation_command(
    query_text: str,
    payload: dict,
) -> RecommendationCommandResult | None:
    if not is_recommendation_command(query_text):
        return None

    tenant_id = _tenant(payload)
    rec_type = select_recommendation_type(query_text)
    assessment = build_recommendation_assessment(tenant_id, query_text, payload)
    message = format_recommendation_message(assessment)

    return RecommendationCommandResult(
        message=message,
        recommendation_generated=True,
        template_selected=True,
        next_step_created=rec_type == RecommendationType.NEXT_STEP,
        blocker_resolution_created=rec_type == RecommendationType.BLOCKER_RESOLUTION,
        recommendation_type=rec_type.value,
    )
