"""Improvement Query Standalone — runtime handling (P9-W06)."""

from __future__ import annotations

from dataclasses import dataclass

from app.modules.yasii.improvement_query import (
    ImprovementCategory,
    build_improvement_assessment,
    format_improvement_message,
    is_improvement_query,
    select_improvement_focus_category,
)

__all__ = (
    "ImprovementQueryResult",
    "is_improvement_command",
    "resolve_improvement_command",
)


@dataclass(frozen=True)
class ImprovementQueryResult:
    message: str
    query_executed: bool = False
    candidate_found: bool = False
    assessment_created: bool = False
    recommendation_generated: bool = False
    focus_category: str = ""


def _tenant(payload: dict) -> str:
    return str(payload.get("tenantId") or "").strip() or "default-tenant"


def is_improvement_command(query_text: str) -> bool:
    return is_improvement_query(query_text)


def resolve_improvement_command(query_text: str, payload: dict) -> ImprovementQueryResult | None:
    if not is_improvement_command(query_text):
        return None

    tenant_id = _tenant(payload)
    assessment = build_improvement_assessment(tenant_id, query_text, payload)
    message = format_improvement_message(assessment)
    focus = select_improvement_focus_category(query_text)
    has_candidates = bool(assessment.candidates)
    primary = assessment.candidates[0] if has_candidates else None

    return ImprovementQueryResult(
        message=message,
        query_executed=True,
        candidate_found=has_candidates,
        assessment_created=True,
        recommendation_generated=bool(primary and primary.recommendedAction),
        focus_category=(focus or (primary.category if primary else ImprovementCategory.ARCHITECTURE)).value,
    )
