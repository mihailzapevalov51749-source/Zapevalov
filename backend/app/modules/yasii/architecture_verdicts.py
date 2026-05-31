"""YASII Architecture Verdicts (P5-W05) — static architectural rationale, no LLM."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

from app.modules.yasii.impact_analysis import find_component_in_text, find_primary_component_in_text

ARCHITECTURE_VERDICTS_SCHEMA_VERSION = "0.1.0"

ARCHITECTURE_VERDICTS: dict[str, str] = {
    "Intent Resolver": (
        "Intent Resolver является первым этапом runtime pipeline, потому что без "
        "понимания намерения невозможно корректно подобрать знания и маршрут обработки."
    ),
    "Knowledge Resolver": (
        "Knowledge Resolver следует после Intent Resolver, потому что сначала необходимо "
        "понять намерение пользователя, а затем подобрать релевантные знания."
    ),
    "Graph Resolver": (
        "Graph Resolver используется после Knowledge Resolver, потому что после выбора "
        "знаний требуется определить связанные сущности и зависимости."
    ),
    "Evidence Resolver": (
        "Evidence Resolver расположен после Graph Resolver, потому что доказательства "
        "собираются после определения связанных сущностей в графе знаний."
    ),
    "Rule Engine": (
        "Rule Engine расположен после Evidence Resolver, потому что правила должны "
        "применяться только к уже собранным доказательствам."
    ),
    "Verdict Engine": (
        "Verdict Engine расположен после Rule Engine, потому что итоговое решение "
        "формируется на основе результатов проверки правил."
    ),
    "Answer Builder": (
        "Answer Builder расположен после Verdict Engine, потому что ответ может быть "
        "сформирован только после получения итогового решения."
    ),
    "Runtime Orchestrator": (
        "Runtime Orchestrator является точкой координации, которая управляет "
        "последовательным прохождением запроса через весь pipeline."
    ),
}

_VERDICT_KEYWORDS = (
    "почему",
    "зачем",
    "для чего",
    "объясни",
    "architecture verdict",
)


@dataclass
class ArchitectureVerdict:
    schemaVersion: str = ARCHITECTURE_VERDICTS_SCHEMA_VERSION
    verdictId: str = field(default_factory=lambda: f"architecture-verdict-{uuid4()}")
    subject: str = ""
    explanation: str = ""
    reasoning: str = ""
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class ArchitectureVerdictSnapshot:
    snapshotId: str
    verdicts: list[ArchitectureVerdict]
    createdAt: str


def list_available_verdicts() -> list[str]:
    return list(ARCHITECTURE_VERDICTS.keys())


def get_architecture_verdict(subject: str) -> ArchitectureVerdict:
    canonical = _resolve_verdict_subject(subject)

    if canonical is None:
        return ArchitectureVerdict(
            subject=str(subject or "").strip() or "Unknown",
            explanation="Архитектурное объяснение для этого компонента не найдено в MVP-базе.",
            reasoning="subject_not_found",
        )

    explanation = ARCHITECTURE_VERDICTS[canonical]
    return ArchitectureVerdict(
        subject=canonical,
        explanation=explanation,
        reasoning="architecture_verdict_catalog",
    )


def get_verdict_snapshot() -> ArchitectureVerdictSnapshot:
    verdicts = [get_architecture_verdict(subject) for subject in list_available_verdicts()]
    return ArchitectureVerdictSnapshot(
        snapshotId=f"architecture-verdict-snapshot-{uuid4()}",
        verdicts=verdicts,
        createdAt=datetime.now(timezone.utc).isoformat(),
    )


def _resolve_verdict_subject(subject: str) -> str | None:
    normalized = str(subject or "").strip().lower()
    if not normalized:
        return None

    for component in sorted(ARCHITECTURE_VERDICTS.keys(), key=len, reverse=True):
        if component.lower() == normalized:
            return component

    return find_component_in_text(subject)


def format_architecture_verdict_message(verdict: ArchitectureVerdict) -> str:
    return (
        "Architecture Verdict\n\n"
        f"Компонент:\n{verdict.subject}\n\n"
        f"Объяснение:\n\n{verdict.explanation}"
    )


def _contains_verdict_keyword(normalized_text: str) -> bool:
    return any(keyword in normalized_text for keyword in _VERDICT_KEYWORDS)


def resolve_architecture_verdict_message(text: str) -> str | None:
    """Keyword-based architecture verdicts; no reasoning engine or repo scan."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text or not _contains_verdict_keyword(normalized_text):
        return None

    component = find_primary_component_in_text(text)
    if component is None:
        return None

    verdict = get_architecture_verdict(component)
    if verdict.reasoning == "subject_not_found":
        return None

    return format_architecture_verdict_message(verdict)
