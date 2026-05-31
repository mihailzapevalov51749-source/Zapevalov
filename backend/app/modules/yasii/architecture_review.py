"""YASII Architecture Review (P5-W02) — static architecture knowledge base, no repo scan."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

ARCHITECTURE_REVIEW_SCHEMA_VERSION = "0.1.0"
ARCHITECTURE_REVIEW_ID = "yasii-architecture-review-mvp"

_CURRENT_PHASE = "Phase 5 — Developer MVP"

_COMPLETED_PHASES = [
    "Phase 1 — Core Foundation",
    "Phase 2 — Knowledge Foundation",
    "Phase 3 — Graph Foundation",
    "Phase 4 — Runtime Foundation",
]

_MAJOR_COMPONENTS = [
    "Intent Resolver",
    "Knowledge Resolver",
    "Graph Resolver",
    "Evidence Resolver",
    "Rule Engine",
    "Verdict Engine",
    "Answer Builder",
    "Runtime Orchestrator",
]

_ARCHITECTURE_SUMMARY = (
    "YASII currently operates as a developer-focused MVP runtime with a complete "
    "technical pipeline and architecture foundation."
)

_CURRENT_PHASE_KEYWORDS = (
    "на каком этапе",
    "текущая фаза",
)

_PHASES_KEYWORDS = (
    "какие фазы",
    "фазы проекта",
    "этапы проекта",
)

_COMPONENTS_KEYWORDS = (
    "компоненты",
    "из чего состоит",
    "структура ясии",
)

_ARCHITECTURE_KEYWORDS = (
    "архитектура",
    "architecture",
)


@dataclass
class ArchitectureReview:
    schemaVersion: str = ARCHITECTURE_REVIEW_SCHEMA_VERSION
    reviewId: str = ARCHITECTURE_REVIEW_ID
    currentPhase: str = _CURRENT_PHASE
    completedPhases: list[str] = field(default_factory=lambda: list(_COMPLETED_PHASES))
    majorComponents: list[str] = field(default_factory=lambda: list(_MAJOR_COMPONENTS))
    summary: str = _ARCHITECTURE_SUMMARY
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class ArchitectureReviewSnapshot:
    snapshotId: str
    review: ArchitectureReview
    createdAt: str


def get_architecture_review() -> ArchitectureReview:
    return ArchitectureReview()


def get_architecture_summary() -> str:
    return get_architecture_review().summary


def get_major_components() -> list[str]:
    return list(get_architecture_review().majorComponents)


def get_review_snapshot() -> ArchitectureReviewSnapshot:
    return ArchitectureReviewSnapshot(
        snapshotId=f"architecture-review-{uuid4()}",
        review=get_architecture_review(),
        createdAt=datetime.now(timezone.utc).isoformat(),
    )


def _format_bullet_list(items: list[str]) -> str:
    return "\n".join(f"• {item}" for item in items)


def format_architecture_overview_message(review: ArchitectureReview | None = None) -> str:
    current = review or get_architecture_review()
    return (
        "Архитектурный обзор ЯСИИ\n\n"
        f"Текущая фаза:\n{current.currentPhase}\n\n"
        f"Завершённые фазы:\n{_format_bullet_list(current.completedPhases)}\n\n"
        f"Основные компоненты:\n{_format_bullet_list(current.majorComponents)}"
    )


def format_completed_phases_message() -> str:
    review = get_architecture_review()
    return (
        "Фазы реализации ЯСИИ:\n\n"
        f"Текущая фаза:\n{review.currentPhase}\n\n"
        f"Завершённые фазы:\n{_format_bullet_list(review.completedPhases)}"
    )


def format_major_components_message() -> str:
    return f"Основные компоненты ЯСИИ:\n{_format_bullet_list(get_major_components())}"


def format_current_phase_message() -> str:
    return f"Текущая фаза проекта:\n{get_architecture_review().currentPhase}"


def _contains_keyword(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def resolve_architecture_review_message(text: str) -> str | None:
    """Keyword-based architecture review responses; no LLM or repository scan."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text:
        return None

    if _contains_keyword(normalized_text, _CURRENT_PHASE_KEYWORDS):
        return format_current_phase_message()

    if _contains_keyword(normalized_text, _PHASES_KEYWORDS):
        return format_completed_phases_message()

    if _contains_keyword(normalized_text, _COMPONENTS_KEYWORDS):
        return format_major_components_message()

    if _contains_keyword(normalized_text, _ARCHITECTURE_KEYWORDS):
        return format_architecture_overview_message()

    return None
