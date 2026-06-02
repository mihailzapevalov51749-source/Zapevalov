"""Development Intelligence — runtime resolver (P12-W01)."""

from __future__ import annotations

from dataclasses import dataclass

from app.db.session import SessionLocal
from app.modules.yasii.development_intelligence import (
    build_development_intelligence_assessment,
    format_development_intelligence_message,
    is_development_intelligence_query,
)


@dataclass(frozen=True)
class DevelopmentIntelligenceResult:
    message: str
    state_loaded: bool = False
    quality_analyzed: bool = False
    debt_analyzed: bool = False
    risk_detected: bool = False
    intelligence_created: bool = False
    query_kind: str = ""


def resolve_development_intelligence_command(
    query_text: str,
    payload: dict,
) -> DevelopmentIntelligenceResult | None:
    if not is_development_intelligence_query(query_text):
        return None

    db = SessionLocal()
    try:
        assessment = build_development_intelligence_assessment(query_text, db, payload)
    finally:
        db.close()

    message = format_development_intelligence_message(assessment, query_text)
    return DevelopmentIntelligenceResult(
        message=message,
        state_loaded=True,
        quality_analyzed=True,
        debt_analyzed=bool(assessment.debt.summary),
        risk_detected=bool(assessment.risks.topRisks),
        intelligence_created=True,
        query_kind=assessment.queryKind.value,
    )
