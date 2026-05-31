"""YASII Dependency Analysis (P5-W04) — full downstream chains from MVP map."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

from app.modules.yasii.impact_analysis import (
    IMPACT_DEPENDENCY_MAP,
    find_component_in_text,
)

DEPENDENCY_ANALYSIS_SCHEMA_VERSION = "0.1.0"

_DEPENDENCY_KEYWORDS = (
    "цепочка зависимостей",
    "dependency chain",
    "dependencies",
    "покажи зависимости",
    "анализ зависимостей",
)


@dataclass
class DependencyAnalysis:
    schemaVersion: str = DEPENDENCY_ANALYSIS_SCHEMA_VERSION
    analysisId: str = field(default_factory=lambda: f"dependency-analysis-{uuid4()}")
    startComponent: str = ""
    dependencyChain: list[str] = field(default_factory=list)
    chainLength: int = 0
    summary: str = ""
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class DependencyAnalysisSnapshot:
    snapshotId: str
    analysis: DependencyAnalysis
    createdAt: str


def _resolve_component_name(component_name: str) -> str | None:
    normalized = str(component_name or "").strip().lower()
    if not normalized:
        return None

    for component in sorted(IMPACT_DEPENDENCY_MAP.keys(), key=len, reverse=True):
        if component.lower() == normalized:
            return component

    return None


def build_dependency_chain(start_component: str) -> list[str]:
    """Build full downstream chain using the shared MVP dependency map."""
    chain = [start_component]
    current = start_component

    while True:
        downstream = IMPACT_DEPENDENCY_MAP.get(current, [])
        if not downstream:
            break

        next_component = downstream[0]
        if next_component in chain:
            break

        chain.append(next_component)
        current = next_component

    return chain


def analyze_dependencies(component_name: str) -> DependencyAnalysis:
    canonical = _resolve_component_name(component_name)
    if canonical is None:
        canonical = find_component_in_text(component_name)

    if canonical is None:
        return DependencyAnalysis(
            startComponent=str(component_name or "").strip() or "Unknown",
            dependencyChain=[],
            chainLength=0,
            summary="Component not found in MVP dependency map.",
        )

    chain = build_dependency_chain(canonical)

    return DependencyAnalysis(
        startComponent=canonical,
        dependencyChain=chain,
        chainLength=len(chain),
        summary=(
            f"MVP dependency map defines a downstream chain of {len(chain)} "
            f"component(s) starting from {canonical}."
        ),
    )


def get_dependency_snapshot(component_name: str) -> DependencyAnalysisSnapshot:
    return DependencyAnalysisSnapshot(
        snapshotId=f"dependency-snapshot-{uuid4()}",
        analysis=analyze_dependencies(component_name),
        createdAt=datetime.now(timezone.utc).isoformat(),
    )


def format_dependency_chain_block(chain: list[str]) -> str:
    if not chain:
        return "(цепочка не найдена)"
    return "\n↓\n".join(chain)


def format_dependency_analysis_message(analysis: DependencyAnalysis) -> str:
    return (
        "Dependency Analysis\n\n"
        f"Компонент:\n{analysis.startComponent}\n\n"
        "Цепочка:\n\n"
        f"{format_dependency_chain_block(analysis.dependencyChain)}\n\n"
        f"Длина цепочки:\n{analysis.chainLength}"
    )


def _contains_dependency_keyword(normalized_text: str) -> bool:
    return any(keyword in normalized_text for keyword in _DEPENDENCY_KEYWORDS)


def resolve_dependency_analysis_message(text: str) -> str | None:
    """Keyword-based full dependency chain; no repository scan or graph DB."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text or not _contains_dependency_keyword(normalized_text):
        return None

    component = find_component_in_text(text)
    analysis = analyze_dependencies(component or "")
    return format_dependency_analysis_message(analysis)
