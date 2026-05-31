"""YASII Reality Check (P6-W03) — expectations vs current state for product owners."""

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4

REALITY_CHECK_SCHEMA_VERSION = "0.1.0"

_CURRENT_STATE = [
    "Есть интерфейс ЯСИИ",
    "Есть runtime pipeline",
    "Есть Owner Assistant",
    "Есть архитектурные знания",
]

_EXPECTED_STATE = [
    "Работа с реальными данными проекта",
    "Контроль рисков",
    "Статус проекта",
    "Анализ изменений",
]

_FINDINGS = [
    "ЯСИИ умеет объяснять состояние платформы",
    "ЯСИИ ещё не подключён к реальным данным проекта",
    "ЯСИИ пока не контролирует статус проекта",
]

_DEFAULT_RECOMMENDATION = (
    "Главный следующий шаг — подключение ЯСИИ к данным проекта.\n\n"
    "Без этого ЯСИИ остаётся демонстрационным помощником."
)

_SHORT_RECOMMENDATION = (
    "Подключить ЯСИИ\n"
    "к данным проекта."
)

_REALITY_KEYWORDS = (
    "какова реальная ситуация",
    "реальная ситуация",
    "reality check",
    "reality-check",
)

_GOAL_GAP_KEYWORDS = (
    "насколько мы близки к цели",
    "близки к цели",
    "есть ли разрыв",
    "разрыв между планом",
    "разрыв между планом и реальностью",
)

_MISMATCH_KEYWORDS = (
    "что сейчас не соответствует ожиданиям",
    "не соответствует ожиданиям",
    "соответствует целям",
    "соответствует цели",
    "план и реальность",
    "план vs реальность",
)

_GAP_FOCUS_KEYWORDS = (
    "где главный пробел",
    "главный пробел",
    "главный разрыв",
)


class GapLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


_GAP_LABELS: dict[GapLevel, str] = {
    GapLevel.LOW: "Низкий",
    GapLevel.MEDIUM: "Средний",
    GapLevel.HIGH: "Высокий",
}


@dataclass
class RealityCheck:
    schemaVersion: str = REALITY_CHECK_SCHEMA_VERSION
    checkId: str = field(default_factory=lambda: f"reality-check-{uuid4()}")
    currentState: list[str] = field(default_factory=lambda: list(_CURRENT_STATE))
    expectedState: list[str] = field(default_factory=lambda: list(_EXPECTED_STATE))
    gapLevel: GapLevel = GapLevel.MEDIUM
    findings: list[str] = field(default_factory=lambda: list(_FINDINGS))
    recommendation: str = _DEFAULT_RECOMMENDATION
    metadata: dict[str, str] = field(default_factory=dict)


def get_reality_check() -> RealityCheck:
    return RealityCheck(
        metadata={
            "phase": "P6-W03",
            "gapLevelReason": (
                "mvp: owner-facing capabilities exist; project data, risks, "
                "and task status not connected"
            ),
            "evaluationScope": "expectations_vs_current_state",
        },
    )


def _current_display(item: str) -> str:
    mapping = {
        "Есть интерфейс ЯСИИ": "работает интерфейс ЯСИИ",
        "Есть runtime pipeline": "работает runtime pipeline",
        "Есть Owner Assistant": "работает Owner Assistant",
        "Есть архитектурные знания": "есть архитектурные знания",
    }
    return mapping.get(item, item[0].lower() + item[1:] if item else item)


def _expected_display(item: str) -> str:
    mapping = {
        "Работа с реальными данными проекта": "работа с данными проекта",
        "Контроль рисков": "контроль рисков",
        "Статус проекта": "статус проекта",
        "Анализ изменений": "анализ изменений",
    }
    return mapping.get(item, item[0].lower() + item[1:] if item else item)


def _finding_display(item: str) -> str:
    mapping = {
        "ЯСИИ ещё не подключён к реальным данным проекта": (
            "пока не работает с реальными данными"
        ),
    }
    return mapping.get(item, item[0].lower() + item[1:] if item else item)


def _format_bullets(items: list[str], *, display_fn) -> str:
    return "\n".join(f"• {display_fn(item)}" for item in items)


def format_reality_check_message(
    check: RealityCheck | None = None,
    *,
    recommendation: str | None = None,
    findings_limit: int | None = None,
) -> str:
    current = check or get_reality_check()
    gap_label = _GAP_LABELS[current.gapLevel]
    rec = recommendation or current.recommendation
    findings = current.findings
    if findings_limit is not None:
        findings = findings[:findings_limit]

    return (
        "Reality Check\n\n"
        "Текущее состояние\n\n"
        f"{_format_bullets(current.currentState, display_fn=_current_display)}\n\n"
        "Ожидаемое состояние\n\n"
        f"{_format_bullets(current.expectedState[:3], display_fn=_expected_display)}\n\n"
        "Разрыв\n\n"
        f"{gap_label}\n\n"
        "Основные наблюдения\n\n"
        f"{_format_bullets(findings, display_fn=_finding_display)}\n\n"
        "Рекомендация\n\n"
        f"{rec}"
    )


def _contains_keyword(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def resolve_reality_check_message(text: str) -> str | None:
    """Keyword-based reality check; no repo scan, monitoring, or LLM."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text:
        return None

    if not any(
        _contains_keyword(normalized_text, group)
        for group in (
            _REALITY_KEYWORDS,
            _GOAL_GAP_KEYWORDS,
            _MISMATCH_KEYWORDS,
            _GAP_FOCUS_KEYWORDS,
        )
    ):
        return None

    check = get_reality_check()
    recommendation = None
    findings_limit = None

    if _contains_keyword(normalized_text, _GAP_FOCUS_KEYWORDS):
        recommendation = _SHORT_RECOMMENDATION
        findings_limit = 2

    return format_reality_check_message(
        check,
        recommendation=recommendation,
        findings_limit=findings_limit,
    )
