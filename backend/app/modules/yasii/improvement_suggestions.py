"""YASII Improvement Suggestions (P6-W06) — recommendations from P6-W02…P6-W05."""

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4

from app.modules.yasii.deviation_registry import (
    DeviationRecord,
    DeviationRegistry,
    Severity as DeviationSeverity,
    get_deviation_registry,
)
from app.modules.yasii.owner_report import OwnerReport, get_owner_report
from app.modules.yasii.platform_health_snapshot import (
    PlatformHealthSnapshot,
    get_platform_health_snapshot,
)
from app.modules.yasii.reality_check import RealityCheck, get_reality_check

IMPROVEMENT_SUGGESTIONS_SCHEMA_VERSION = "0.1.0"

_PRIMARY_RECOMMENDATION = "Подключить данные проекта."

_SUGGESTION_KEYWORDS = (
    "что улучшать дальше",
    "что сейчас самое важное",
    "какие следующие шаги",
    "следующие шаги",
    "что даст максимальный эффект",
    "максимальный эффект",
    "что делать дальше",
    "какие рекомендации",
    "покажи предложения по улучшению",
    "предложения по улучшению",
    "рекомендации по улучшению",
)


class SuggestionPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


_PRIORITY_LABELS: dict[SuggestionPriority, str] = {
    SuggestionPriority.LOW: "Низкий",
    SuggestionPriority.MEDIUM: "Средний",
    SuggestionPriority.HIGH: "Высокий",
}

_DEVIATION_SUGGESTION_SPECS: dict[str, dict[str, str]] = {
    "Нет подключения к данным проекта": {
        "title": "Подключить данные проекта",
        "reason": "Главное критическое отклонение проекта.",
        "expectedImpact": "ЯСИИ сможет работать с реальным состоянием проекта.",
        "recommendedAction": "Подключить источники данных проекта к ЯСИИ.",
    },
    "Нет статуса задач проекта": {
        "title": "Добавить статус задач проекта",
        "reason": "Отсутствует контроль выполнения задач.",
        "expectedImpact": "ЯСИИ сможет показывать прогресс проекта.",
        "recommendedAction": "Подключить данные по задачам.",
    },
    "Нет контроля рисков проекта": {
        "title": "Добавить контроль рисков",
        "reason": "Риски проекта пока не анализируются.",
        "expectedImpact": "ЯСИИ сможет предупреждать владельца о проблемах.",
        "recommendedAction": "Подключить данные о рисках.",
    },
}

_PRIORITY_ORDER = {
    SuggestionPriority.HIGH: 0,
    SuggestionPriority.MEDIUM: 1,
    SuggestionPriority.LOW: 2,
}


@dataclass
class ImprovementSuggestion:
    suggestionId: str
    title: str
    priority: SuggestionPriority
    reason: str
    expectedImpact: str
    recommendedAction: str


@dataclass
class ImprovementSuggestions:
    schemaVersion: str = IMPROVEMENT_SUGGESTIONS_SCHEMA_VERSION
    suggestionsId: str = field(default_factory=lambda: f"improvement-suggestions-{uuid4()}")
    suggestions: list[ImprovementSuggestion] = field(default_factory=list)
    totalCount: int = 0
    highPriorityCount: int = 0
    metadata: dict[str, str] = field(default_factory=dict)


def _severity_to_priority(severity: DeviationSeverity) -> SuggestionPriority:
    if severity == DeviationSeverity.HIGH:
        return SuggestionPriority.HIGH
    if severity == DeviationSeverity.LOW:
        return SuggestionPriority.LOW
    return SuggestionPriority.MEDIUM


def _suggestion_from_deviation(deviation: DeviationRecord) -> ImprovementSuggestion | None:
    spec = _DEVIATION_SUGGESTION_SPECS.get(deviation.title)
    if spec is None:
        return None

    return ImprovementSuggestion(
        suggestionId=f"suggestion-{uuid4()}",
        title=spec["title"],
        priority=_severity_to_priority(deviation.severity),
        reason=spec["reason"],
        expectedImpact=spec["expectedImpact"],
        recommendedAction=spec["recommendedAction"],
    )


def _build_suggestions(registry: DeviationRegistry) -> list[ImprovementSuggestion]:
    items = [
        suggestion
        for deviation in registry.deviations
        if (suggestion := _suggestion_from_deviation(deviation)) is not None
    ]
    return sorted(items, key=lambda item: _PRIORITY_ORDER[item.priority])


def _primary_recommendation(report: OwnerReport) -> str:
    action = report.nextAction.strip().rstrip(".")
    if "данным" in action.lower() or "данные" in action.lower():
        return _PRIMARY_RECOMMENDATION
    return f"{action}."


def get_improvement_suggestions() -> ImprovementSuggestions:
    health = get_platform_health_snapshot()
    reality = get_reality_check()
    registry = get_deviation_registry()
    report = get_owner_report()
    suggestions = _build_suggestions(registry)
    high_count = sum(1 for item in suggestions if item.priority == SuggestionPriority.HIGH)

    return ImprovementSuggestions(
        suggestions=suggestions,
        totalCount=len(suggestions),
        highPriorityCount=high_count,
        metadata={
            "phase": "P6-W06",
            "sources": "P6-W02,P6-W03,P6-W04,P6-W05",
            "healthSnapshotId": health.snapshotId,
            "realityCheckId": reality.checkId,
            "deviationRegistryId": registry.registryId,
            "ownerReportId": report.reportId,
            "ownerNextAction": report.nextAction,
            "primaryRecommendation": _primary_recommendation(report),
            "healthScore": str(health.healthScore),
            "realityGapLevel": reality.gapLevel.value,
        },
    )


def _priority_label(priority: SuggestionPriority) -> str:
    return _PRIORITY_LABELS[priority]


def format_improvement_suggestions_message(
    bundle: ImprovementSuggestions | None = None,
) -> str:
    current = bundle or get_improvement_suggestions()
    primary = current.metadata.get("primaryRecommendation", _PRIMARY_RECOMMENDATION)

    lines = [
        "Improvement Suggestions",
        "",
        "Всего рекомендаций",
        "",
        str(current.totalCount),
        "",
        "Высокий приоритет",
        "",
        str(current.highPriorityCount),
        "",
        "Рекомендации",
        "",
    ]

    for index, suggestion in enumerate(current.suggestions, start=1):
        lines.append(f"{index}. {suggestion.title}")
        lines.append(f"Приоритет: {_priority_label(suggestion.priority)}")
        if suggestion.priority == SuggestionPriority.HIGH:
            lines.append("")
            lines.append("Эффект:")
            lines.append(suggestion.expectedImpact)
        lines.append("")

    lines.extend(
        [
            "Главная рекомендация",
            "",
            primary,
        ],
    )
    return "\n".join(lines)


def _contains_keyword(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def resolve_improvement_suggestions_message(text: str) -> str | None:
    """Keyword-based improvement suggestions; aggregates owner modules P6-W02…W05."""
    from app.modules.yasii.improvement_answers import is_improvement_command
    from app.modules.yasii.recommendation_answers import is_recommendation_command

    if is_improvement_command(text) or is_recommendation_command(text):
        return None

    normalized_text = str(text or "").strip().lower()
    if not normalized_text or not _contains_keyword(normalized_text, _SUGGESTION_KEYWORDS):
        return None

    return format_improvement_suggestions_message(get_improvement_suggestions())
