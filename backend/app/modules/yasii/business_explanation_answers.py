"""Business Explanation Layer — runtime resolver (P11-W03)."""

from __future__ import annotations

from dataclasses import dataclass

from app.db.session import SessionLocal
from app.modules.yasii.business_explanation import (
    build_business_explanation_response,
    is_business_explanation_query,
)


@dataclass(frozen=True)
class BusinessExplanationResult:
    message: str
    explanation_created: bool = False
    impact_generated: bool = False
    business_view_selected: bool = False


def resolve_business_explanation_command(query_text: str, payload: dict) -> BusinessExplanationResult | None:
    del payload
    if not is_business_explanation_query(query_text):
        return None

    db = SessionLocal()
    try:
        message = build_business_explanation_response(query_text, db)
    finally:
        db.close()

    return BusinessExplanationResult(
        message=message,
        explanation_created=True,
        impact_generated="Business Impact" in message or "Бизнес-эффект" in message,
        business_view_selected="Business View" in message or "Простыми словами" in message,
    )
