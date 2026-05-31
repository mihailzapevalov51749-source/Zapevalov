"""YASII Platform Health Snapshot (P6-W02) — MVP management health assessment."""

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4

PLATFORM_HEALTH_SNAPSHOT_SCHEMA_VERSION = "0.1.0"

# MVP healthScore: fixed baseline reflecting working runtime/owner layer vs missing data integrations.
MVP_HEALTH_SCORE = 55

_STRENGTHS = [
    "Есть рабочий интерфейс ЯСИИ",
    "Работает runtime pipeline",
    "Работает Owner Assistant",
    "Есть архитектурные знания",
    "Есть анализ влияния изменений",
]

_ATTENTION_AREAS = [
    "Нет анализа реального кода",
    "Нет работы с репозиторием",
    "Нет контроля рисков проекта",
    "Нет статуса задач проекта",
]

_DEFAULT_RECOMMENDATION = (
    "Платформа находится в стабильном состоянии.\n\n"
    "Основные механизмы ЯСИИ уже работают.\n\n"
    "Следующий шаг — подключение ЯСИИ к реальным данным проекта, "
    "чтобы перейти от демонстрационного режима к практической пользе."
)

_PROGRESS_RECOMMENDATION = (
    "Платформа готова к следующему этапу развития.\n"
    "Приоритет — подключение реальных данных проекта."
)

_HEALTH_STATE_KEYWORDS = (
    "каково состояние платформы",
    "состояние платформы",
    "каково здоровье платформы",
    "здоровье платформы",
    "текущее состояние платформы",
)

_HEALTH_OK_KEYWORDS = (
    "платформа здорова",
    "платформа в порядке",
)

_ATTENTION_KEYWORDS = (
    "что требует внимания",
    "требует внимания",
    "зоны внимания",
)

_PROGRESS_KEYWORDS = (
    "можно ли двигаться дальше",
    "двигаться дальше",
    "можно ли продолжать",
    "можно ли идти дальше",
)

_READINESS_KEYWORDS = (
    "что готово на платформе",
    "что готово по платформе",
    "что готово в платформе",
)


class PlatformStatus(str, Enum):
    HEALTHY = "HEALTHY"
    STABLE = "STABLE"
    ATTENTION_REQUIRED = "ATTENTION_REQUIRED"
    CRITICAL = "CRITICAL"


_STATUS_LABELS: dict[PlatformStatus, str] = {
    PlatformStatus.HEALTHY: "Здоровое",
    PlatformStatus.STABLE: "Стабильное",
    PlatformStatus.ATTENTION_REQUIRED: "Требует внимания",
    PlatformStatus.CRITICAL: "Критическое",
}


@dataclass
class PlatformHealthSnapshot:
    schemaVersion: str = PLATFORM_HEALTH_SNAPSHOT_SCHEMA_VERSION
    snapshotId: str = field(default_factory=lambda: f"platform-health-{uuid4()}")
    overallStatus: PlatformStatus = PlatformStatus.STABLE
    healthScore: int = MVP_HEALTH_SCORE
    strengths: list[str] = field(default_factory=lambda: list(_STRENGTHS))
    attentionAreas: list[str] = field(default_factory=lambda: list(_ATTENTION_AREAS))
    recommendation: str = _DEFAULT_RECOMMENDATION
    metadata: dict[str, str] = field(default_factory=dict)


def get_platform_health_snapshot() -> PlatformHealthSnapshot:
    return PlatformHealthSnapshot(
        metadata={
            "phase": "P6-W02",
            "healthScoreBasis": (
                "mvp_baseline: runtime + owner assistant + architecture knowledge "
                f"({len(_STRENGTHS)} strengths) vs missing repo/code/risks/tasks "
                f"({len(_ATTENTION_AREAS)} gaps)"
            ),
            "overallStatusReason": "MVP stable with demo runtime; real project data not connected",
        },
    )


def _strength_display(item: str) -> str:
    mapping = {
        "Есть рабочий интерфейс ЯСИИ": "работает интерфейс ЯСИИ",
        "Работает runtime pipeline": "работает runtime pipeline",
        "Работает Owner Assistant": "работает Owner Assistant",
        "Есть архитектурные знания": "есть архитектурные знания",
        "Есть анализ влияния изменений": "есть анализ влияния изменений",
    }
    return mapping.get(item, item[0].lower() + item[1:] if item else item)


def _attention_display(item: str) -> str:
    mapping = {
        "Нет анализа реального кода": "отсутствует анализ реального кода",
        "Нет работы с репозиторием": "отсутствует работа с репозиторием",
        "Нет контроля рисков проекта": "отсутствует контроль рисков проекта",
        "Нет статуса задач проекта": "отсутствует статус задач проекта",
    }
    return mapping.get(item, item[0].lower() + item[1:] if item else item)


def _format_bullets(items: list[str], *, display_fn) -> str:
    return "\n".join(f"• {display_fn(item)}" for item in items)


def format_platform_health_snapshot_message(
    snapshot: PlatformHealthSnapshot | None = None,
    *,
    recommendation: str | None = None,
) -> str:
    current = snapshot or get_platform_health_snapshot()
    status_label = _STATUS_LABELS[current.overallStatus]
    rec = recommendation or current.recommendation

    return (
        "Platform Health Snapshot\n\n"
        "Состояние\n\n"
        f"{status_label}\n\n"
        "Оценка\n\n"
        f"{current.healthScore}%\n\n"
        "Сильные стороны\n\n"
        f"{_format_bullets(current.strengths[:3], display_fn=_strength_display)}\n\n"
        "Требует внимания\n\n"
        f"{_format_bullets(current.attentionAreas[:3], display_fn=_attention_display)}\n\n"
        "Рекомендация\n\n"
        f"{rec}"
    )


def _contains_keyword(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def resolve_platform_health_snapshot_message(text: str) -> str | None:
    """Keyword-based platform health snapshot; no monitoring DB or repo scan."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text:
        return None

    if not any(
        _contains_keyword(normalized_text, group)
        for group in (
            _HEALTH_STATE_KEYWORDS,
            _HEALTH_OK_KEYWORDS,
            _ATTENTION_KEYWORDS,
            _PROGRESS_KEYWORDS,
            _READINESS_KEYWORDS,
        )
    ):
        return None

    snapshot = get_platform_health_snapshot()
    recommendation = None
    if _contains_keyword(normalized_text, _PROGRESS_KEYWORDS):
        recommendation = _PROGRESS_RECOMMENDATION

    return format_platform_health_snapshot_message(snapshot, recommendation=recommendation)
