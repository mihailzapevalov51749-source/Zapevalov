"""YASII Owner Readiness (P6-W07) — owner-facing readiness from P6-W02…P6-W06."""

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4

from app.modules.yasii.deviation_registry import get_deviation_registry
from app.modules.yasii.improvement_suggestions import get_improvement_suggestions
from app.modules.yasii.owner_report import get_owner_report
from app.modules.yasii.platform_health_snapshot import get_platform_health_snapshot
from app.modules.yasii.reality_check import get_reality_check

OWNER_READINESS_SCHEMA_VERSION = "0.1.0"

MVP_READINESS_SCORE = 60

_AVAILABLE_CAPABILITIES = [
    "Получение отчётов",
    "Анализ состояния платформы",
    "Выявление отклонений",
    "Получение рекомендаций",
    "Навигация по развитию ЯСИИ",
]

_UNAVAILABLE_CAPABILITIES = [
    "Работа с реальными данными проекта",
    "Контроль задач",
    "Контроль рисков",
    "Мониторинг проекта",
    "Автоматическая аналитика",
]

_DEFAULT_SUMMARY = (
    "ЯСИИ уже пригоден как инструмент навигации и анализа состояния платформы.\n\n"
    "ЯСИИ пока не подключён к данным проекта, поэтому не может выполнять функции "
    "полноценного цифрового сотрудника проекта.\n\n"
    "Следующий шаг — интеграция с данными ЯсноПро."
)

_NEXT_STEP = "подключение данных ЯсноПро"

_READINESS_KEYWORDS = (
    "насколько ясии готов",
    "насколько готов ясии",
    "насколько готов",
    "можно ли использовать ясии",
    "использовать ясии",
    "какой уровень готовности",
    "уровень готовности ясии",
    "что уже можно делать",
    "что пока нельзя делать",
    "готовность ясии",
    "готов ли ясии",
    "owner readiness",
)

_CAPABILITY_DISPLAY = {
    "Получение отчётов": "отчёты",
    "Анализ состояния платформы": "анализ состояния",
    "Выявление отклонений": "отклонения",
    "Получение рекомендаций": "рекомендации",
    "Навигация по развитию ЯСИИ": "навигация по развитию",
    "Работа с реальными данными проекта": "данные проекта",
    "Контроль задач": "задачи",
    "Контроль рисков": "риски",
    "Мониторинг проекта": "мониторинг проекта",
    "Автоматическая аналитика": "автоматическая аналитика",
}


class OwnerReadinessLevel(str, Enum):
    NOT_READY = "NOT_READY"
    PARTIALLY_READY = "PARTIALLY_READY"
    READY = "READY"


_LEVEL_LABELS: dict[OwnerReadinessLevel, str] = {
    OwnerReadinessLevel.NOT_READY: "Низкая",
    OwnerReadinessLevel.PARTIALLY_READY: "Частичная",
    OwnerReadinessLevel.READY: "Высокая",
}


@dataclass
class OwnerReadiness:
    schemaVersion: str = OWNER_READINESS_SCHEMA_VERSION
    readinessId: str = field(default_factory=lambda: f"owner-readiness-{uuid4()}")
    readinessLevel: OwnerReadinessLevel = OwnerReadinessLevel.PARTIALLY_READY
    readinessScore: int = MVP_READINESS_SCORE
    availableCapabilities: list[str] = field(
        default_factory=lambda: list(_AVAILABLE_CAPABILITIES),
    )
    unavailableCapabilities: list[str] = field(
        default_factory=lambda: list(_UNAVAILABLE_CAPABILITIES),
    )
    summary: str = _DEFAULT_SUMMARY
    metadata: dict[str, str] = field(default_factory=dict)


def _build_summary(_report_summary: str, _primary_recommendation: str) -> str:
    return _DEFAULT_SUMMARY


def get_owner_readiness() -> OwnerReadiness:
    health = get_platform_health_snapshot()
    reality = get_reality_check()
    registry = get_deviation_registry()
    report = get_owner_report()
    suggestions = get_improvement_suggestions()
    primary = suggestions.metadata.get("primaryRecommendation", report.nextAction)

    return OwnerReadiness(
        readinessLevel=OwnerReadinessLevel.PARTIALLY_READY,
        readinessScore=MVP_READINESS_SCORE,
        availableCapabilities=list(_AVAILABLE_CAPABILITIES),
        unavailableCapabilities=list(_UNAVAILABLE_CAPABILITIES),
        summary=_build_summary(report.summary, primary),
        metadata={
            "phase": "P6-W07",
            "sources": "P6-W02,P6-W03,P6-W04,P6-W05,P6-W06",
            "healthSnapshotId": health.snapshotId,
            "realityCheckId": reality.checkId,
            "deviationRegistryId": registry.registryId,
            "ownerReportId": report.reportId,
            "improvementSuggestionsId": suggestions.suggestionsId,
            "healthScore": str(health.healthScore),
            "realityGapLevel": reality.gapLevel.value,
            "totalDeviations": str(registry.totalCount),
            "highPrioritySuggestions": str(suggestions.highPriorityCount),
            "nextStep": _NEXT_STEP,
        },
    )


def _capability_display(item: str) -> str:
    return _CAPABILITY_DISPLAY.get(item, item[0].lower() + item[1:] if item else item)


def _format_bullets(items: list[str]) -> str:
    return "\n".join(f"• {_capability_display(item)}" for item in items)


def _level_label(level: OwnerReadinessLevel) -> str:
    return _LEVEL_LABELS[level]


def format_owner_readiness_message(readiness: OwnerReadiness | None = None) -> str:
    current = readiness or get_owner_readiness()
    conclusion = (
        "ЯСИИ уже полезен для владельца как навигатор проекта.\n\n"
        f"Следующий шаг — {current.metadata.get('nextStep', _NEXT_STEP)}."
    )

    return (
        "Owner Readiness\n\n"
        "Готовность\n\n"
        f"{_level_label(current.readinessLevel)}\n\n"
        "Оценка\n\n"
        f"{current.readinessScore}%\n\n"
        "Уже доступно\n\n"
        f"{_format_bullets(current.availableCapabilities)}\n\n"
        "Пока недоступно\n\n"
        f"{_format_bullets(current.unavailableCapabilities[:3])}\n\n"
        "Вывод\n\n"
        f"{conclusion}"
    )


def _contains_keyword(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def _is_owner_readiness_query(normalized_text: str) -> bool:
    if not _contains_keyword(normalized_text, _READINESS_KEYWORDS):
        return False
    if "разработчик" in normalized_text or "developer" in normalized_text:
        return False
    if "насколько ты готов" in normalized_text:
        return False
    return True


def resolve_owner_readiness_message(text: str) -> str | None:
    """Keyword-based owner readiness; aggregates P6-W02…P6-W06."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text or not _is_owner_readiness_query(normalized_text):
        return None

    return format_owner_readiness_message(get_owner_readiness())
