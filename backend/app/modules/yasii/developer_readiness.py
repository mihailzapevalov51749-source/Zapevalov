"""YASII Developer Readiness (P5-W07) — MVP maturity assessment for developer assistance."""

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4

DEVELOPER_READINESS_SCHEMA_VERSION = "0.1.0"

IMPLEMENTED_CAPABILITIES = [
    "Developer Profile",
    "Architecture Review",
    "Impact Analysis",
    "Dependency Analysis",
    "Architecture Verdicts",
    "Developer Queries",
]

MISSING_CAPABILITIES = [
    "Repository Scan",
    "AST Analysis",
    "Code Navigation",
    "Code Search",
    "Code Generation",
    "Refactoring Analysis",
    "Repository Knowledge",
]

MVP_READINESS_SCORE = 40

_READINESS_KEYWORDS = (
    "готовность",
    "readiness",
    "насколько ты готов",
    "что ты умеешь для разработчика",
    "какой уровень зрелости",
    "какие возможности уже есть",
    "чего пока не хватает",
    "уровень зрелости",
)


class ReadinessLevel(str, Enum):
    NOT_READY = "NOT_READY"
    FOUNDATION = "FOUNDATION"
    MVP = "MVP"
    ADVANCED = "ADVANCED"


@dataclass
class DeveloperReadiness:
    schemaVersion: str = DEVELOPER_READINESS_SCHEMA_VERSION
    readinessId: str = field(default_factory=lambda: f"developer-readiness-{uuid4()}")
    level: ReadinessLevel = ReadinessLevel.MVP
    score: int = MVP_READINESS_SCORE
    implementedCapabilities: list[str] = field(
        default_factory=lambda: list(IMPLEMENTED_CAPABILITIES)
    )
    missingCapabilities: list[str] = field(default_factory=lambda: list(MISSING_CAPABILITIES))
    summary: str = (
        "ЯСИИ готов выступать как архитектурный и платформенный помощник, "
        "но пока не способен анализировать реальный код проекта."
    )
    metadata: dict[str, str] = field(default_factory=dict)


def get_developer_readiness() -> DeveloperReadiness:
    return DeveloperReadiness(
        level=ReadinessLevel.MVP,
        score=MVP_READINESS_SCORE,
        implementedCapabilities=list(IMPLEMENTED_CAPABILITIES),
        missingCapabilities=list(MISSING_CAPABILITIES),
    )


def _format_bullet_list(items: list[str]) -> str:
    return "\n".join(f"• {item}" for item in items)


def format_developer_readiness_message(readiness: DeveloperReadiness | None = None) -> str:
    current = readiness or get_developer_readiness()
    implemented_block = _format_bullet_list(current.implementedCapabilities)
    missing_block = _format_bullet_list(current.missingCapabilities)

    return (
        "Developer Readiness\n\n"
        f"Уровень:\n{current.level.value}\n\n"
        f"Готовность:\n{current.score}%\n\n"
        f"Уже реализовано:\n\n{implemented_block}\n\n"
        f"Пока отсутствует:\n\n{missing_block}\n\n"
        f"Вывод:\n\n{current.summary}"
    )


def _contains_readiness_keyword(normalized_text: str) -> bool:
    return any(keyword in normalized_text for keyword in _READINESS_KEYWORDS)


def resolve_developer_readiness_message(text: str) -> str | None:
    """Keyword-based developer readiness report; no code analysis."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text or not _contains_readiness_keyword(normalized_text):
        return None

    return format_developer_readiness_message(get_developer_readiness())
