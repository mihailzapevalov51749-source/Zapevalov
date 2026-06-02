"""Quality Intelligence Foundation (P13-W02) — integration points only, no classifier."""

from __future__ import annotations

from pydantic import BaseModel, Field


class QualityIntelligenceClassificationTarget(BaseModel):
    """Fields YASII will infer later; user may leave category=other."""

    subsystem: str = ""
    component: str = ""
    issueType: str = ""
    affectedArea: str = ""
    likelyRootCause: str = ""


class QualityIntelligenceIntegrationPoint(BaseModel):
    hook: str
    module: str
    description: str


QUALITY_INTELLIGENCE_INTEGRATION_POINTS: tuple[QualityIntelligenceIntegrationPoint, ...] = (
    QualityIntelligenceIntegrationPoint(
        hook="quality_issues.create",
        module="quality_issues/router.py",
        description="После создания issue — передать текст в очередь классификации (future).",
    ),
    QualityIntelligenceIntegrationPoint(
        hook="unified_project_state.build",
        module="yasii/unified_project_state.py",
        description="Агрегировать open issues по area для Development Workspace.",
    ),
    QualityIntelligenceIntegrationPoint(
        hook="development_intelligence.load_quality_issues_summary",
        module="yasii/development_intelligence.py",
        description="Read-only quality slice для рисков и фокуса владельца.",
    ),
    QualityIntelligenceIntegrationPoint(
        hook="platform_dashboard.serialize_component",
        module="platform_dashboard/service.py",
        description="Связь issue ↔ component через COMPONENT_ISSUE_AREAS (heuristic).",
    ),
    QualityIntelligenceIntegrationPoint(
        hook="yasii.governance_answers.quality",
        module="yasii/governance_answers.py",
        description="Ответы «открытые проблемы качества» из Unified Project State.",
    ),
)
