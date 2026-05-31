"""YASII Impact Analysis (P5-W03) — MVP component impact map, no repo scan."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

IMPACT_ANALYSIS_SCHEMA_VERSION = "0.1.0"

IMPACT_DEPENDENCY_MAP: dict[str, list[str]] = {
    "Intent Resolver": ["Knowledge Resolver"],
    "Knowledge Resolver": ["Graph Resolver"],
    "Graph Resolver": ["Evidence Resolver"],
    "Evidence Resolver": ["Rule Engine"],
    "Rule Engine": ["Verdict Engine"],
    "Verdict Engine": ["Answer Builder"],
    "Answer Builder": ["Runtime Orchestrator"],
    "Runtime Orchestrator": [],
}

KNOWN_COMPONENTS = tuple(IMPACT_DEPENDENCY_MAP.keys())

_IMPACT_KEYWORDS = (
    "на что повлияет",
    "что зависит от",
    "impact",
    "влияние",
)


@dataclass
class ImpactAnalysis:
    schemaVersion: str = IMPACT_ANALYSIS_SCHEMA_VERSION
    analysisId: str = field(default_factory=lambda: f"impact-analysis-{uuid4()}")
    targetComponent: str = ""
    affectedComponents: list[str] = field(default_factory=list)
    riskLevel: str = "UNKNOWN"
    summary: str = ""
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class ImpactAnalysisSnapshot:
    snapshotId: str
    analysis: ImpactAnalysis
    createdAt: str


def _compute_risk_level(affected_count: int) -> str:
    if affected_count <= 0:
        return "LOW"
    if affected_count <= 2:
        return "MEDIUM"
    return "HIGH"


def _resolve_component_name(component_name: str) -> str | None:
    normalized = str(component_name or "").strip().lower()
    if not normalized:
        return None

    for component in sorted(KNOWN_COMPONENTS, key=len, reverse=True):
        if component.lower() == normalized:
            return component

    return None


def find_component_in_text(text: str) -> str | None:
    normalized_text = str(text or "").strip().lower()
    if not normalized_text:
        return None

    for component in sorted(KNOWN_COMPONENTS, key=len, reverse=True):
        if component.lower() in normalized_text:
            return component

    return None


def find_primary_component_in_text(text: str) -> str | None:
    """Pick the component mentioned earliest — avoids longer names winning in multi-subject questions."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text:
        return None

    best: str | None = None
    best_pos = len(normalized_text) + 1
    for component in KNOWN_COMPONENTS:
        pos = normalized_text.find(component.lower())
        if pos != -1 and pos < best_pos:
            best_pos = pos
            best = component

    return best


def analyze_impact(component_name: str) -> ImpactAnalysis:
    canonical = _resolve_component_name(component_name)
    if canonical is None:
        detected = find_component_in_text(component_name)
        canonical = detected

    if canonical is None:
        return ImpactAnalysis(
            targetComponent=str(component_name or "").strip() or "Unknown",
            affectedComponents=[],
            riskLevel="UNKNOWN",
            summary="Component not found in MVP impact map.",
        )

    affected = list(IMPACT_DEPENDENCY_MAP.get(canonical, []))
    risk_level = _compute_risk_level(len(affected))

    return ImpactAnalysis(
        targetComponent=canonical,
        affectedComponents=affected,
        riskLevel=risk_level,
        summary=(
            f"MVP impact map lists {len(affected)} direct downstream component(s) "
            f"for {canonical}."
        ),
    )


def get_impact_snapshot(component_name: str) -> ImpactAnalysisSnapshot:
    return ImpactAnalysisSnapshot(
        snapshotId=f"impact-snapshot-{uuid4()}",
        analysis=analyze_impact(component_name),
        createdAt=datetime.now(timezone.utc).isoformat(),
    )


def format_impact_analysis_message(analysis: ImpactAnalysis) -> str:
    if analysis.affectedComponents:
        affected_block = "\n".join(f"• {item}" for item in analysis.affectedComponents)
    else:
        affected_block = "• (нет прямых зависимостей в MVP-карте)"

    return (
        "Impact Analysis\n\n"
        f"Компонент:\n{analysis.targetComponent}\n\n"
        f"Затрагивает:\n{affected_block}\n\n"
        f"Уровень риска:\n{analysis.riskLevel}"
    )


def _contains_impact_keyword(normalized_text: str) -> bool:
    return any(keyword in normalized_text for keyword in _IMPACT_KEYWORDS)


def resolve_impact_analysis_message(text: str) -> str | None:
    """Keyword-based impact analysis; no AST or repository scanning."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text or not _contains_impact_keyword(normalized_text):
        return None

    component = find_component_in_text(text)
    analysis = analyze_impact(component or "")
    return format_impact_analysis_message(analysis)
