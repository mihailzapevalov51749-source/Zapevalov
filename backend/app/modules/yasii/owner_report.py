"""YASII Owner Report (P6-W05) — aggregates P6-W01…P6-W04 into an owner summary."""

from dataclasses import dataclass, field
from uuid import uuid4

from app.modules.yasii.deviation_registry import DeviationRegistry, get_deviation_registry
from app.modules.yasii.owner_assistant_profile import (
    OwnerAssistantProfile,
    get_owner_assistant_profile,
)
from app.modules.yasii.platform_health_snapshot import (
    PlatformHealthSnapshot,
    PlatformStatus,
    get_platform_health_snapshot,
)
from app.modules.yasii.reality_check import GapLevel, RealityCheck, get_reality_check

OWNER_REPORT_SCHEMA_VERSION = "0.1.0"

_DEFAULT_NEXT_ACTION = "Подключить ЯСИИ к данным проекта."

_PLATFORM_STATUS_LABELS: dict[PlatformStatus, str] = {
    PlatformStatus.HEALTHY: "Здоровое",
    PlatformStatus.STABLE: "Стабильное",
    PlatformStatus.ATTENTION_REQUIRED: "Требует внимания",
    PlatformStatus.CRITICAL: "Критическое",
}

_PLATFORM_STATUS_INSTRUMENTAL: dict[PlatformStatus, str] = {
    PlatformStatus.HEALTHY: "здоровом",
    PlatformStatus.STABLE: "стабильном",
    PlatformStatus.ATTENTION_REQUIRED: "нестабильном",
    PlatformStatus.CRITICAL: "критическом",
}

_GAP_LABELS: dict[GapLevel, str] = {
    GapLevel.LOW: "Низкий",
    GapLevel.MEDIUM: "Средний",
    GapLevel.HIGH: "Высокий",
}

_REPORT_KEYWORDS = (
    "дай отчёт владельца",
    "дай отчет владельца",
    "отчёт владельца",
    "отчет владельца",
    "покажи отчёт",
    "покажи отчет",
    "какова общая картина",
    "общая картина",
    "что происходит с проектом",
    "сделай сводку",
    "краткий отчёт",
    "краткий отчет",
    "owner report",
)


@dataclass
class OwnerReport:
    schemaVersion: str = OWNER_REPORT_SCHEMA_VERSION
    reportId: str = field(default_factory=lambda: f"owner-report-{uuid4()}")
    overallStatus: str = PlatformStatus.STABLE.value
    healthScore: int = 0
    gapLevel: str = GapLevel.MEDIUM.value
    totalDeviations: int = 0
    criticalDeviations: int = 0
    summary: str = ""
    nextAction: str = _DEFAULT_NEXT_ACTION
    metadata: dict[str, str] = field(default_factory=dict)


def _platform_status_label(status: PlatformStatus) -> str:
    return _PLATFORM_STATUS_LABELS.get(status, status.value)


def _gap_label(gap: GapLevel) -> str:
    return _GAP_LABELS.get(gap, gap.value)


def _deviation_count_phrase(total: int, critical: int) -> str:
    if total == 1:
        total_part = "1 отклонение"
    elif 2 <= total <= 4:
        total_part = f"{total} отклонения"
    else:
        total_part = f"{total} отклонений"

    if critical == 1:
        critical_part = "1 критическое"
    elif critical > 1:
        critical_part = f"{critical} критических"
    else:
        critical_part = "0 критических"

    return f"Обнаружено {total_part}, из них {critical_part}."


def _build_summary(
    profile: OwnerAssistantProfile,
    health: PlatformHealthSnapshot,
    reality: RealityCheck,
    registry: DeviationRegistry,
) -> str:
    status_phrase = _PLATFORM_STATUS_INSTRUMENTAL.get(
        health.overallStatus,
        "стабильном",
    )
    return (
        f"Платформа находится в {status_phrase} состоянии.\n\n"
        f"ЯСИИ уже может помогать владельцу понимать состояние проекта "
        f"({profile.role.lower()}).\n\n"
        "Главный разрыв связан с отсутствием подключения к данным проекта.\n\n"
        f"{_deviation_count_phrase(registry.totalCount, registry.criticalCount)}"
    )


def _build_next_action(registry: DeviationRegistry) -> str:
    primary = registry.metadata.get("primaryAttention", _DEFAULT_NEXT_ACTION).rstrip(".")
    if primary.startswith("Подключение"):
        return _DEFAULT_NEXT_ACTION.rstrip(".")
    return primary


def get_owner_report() -> OwnerReport:
    profile = get_owner_assistant_profile()
    health = get_platform_health_snapshot()
    reality = get_reality_check()
    registry = get_deviation_registry()
    next_action = _build_next_action(registry)

    return OwnerReport(
        overallStatus=health.overallStatus.value,
        healthScore=health.healthScore,
        gapLevel=reality.gapLevel.value,
        totalDeviations=registry.totalCount,
        criticalDeviations=registry.criticalCount,
        summary=_build_summary(profile, health, reality, registry),
        nextAction=next_action,
        metadata={
            "phase": "P6-W05",
            "sources": "P6-W01,P6-W02,P6-W03,P6-W04",
            "ownerProfileId": profile.profileId,
            "healthSnapshotId": health.snapshotId,
            "realityCheckId": reality.checkId,
            "deviationRegistryId": registry.registryId,
            "platformStatusLabel": _platform_status_label(health.overallStatus),
            "gapLabel": _gap_label(reality.gapLevel),
        },
    )


def format_owner_report_message(report: OwnerReport | None = None) -> str:
    current = report or get_owner_report()
    status_label = current.metadata.get(
        "platformStatusLabel",
        _platform_status_label(PlatformStatus(current.overallStatus)),
    )
    gap_label = current.metadata.get(
        "gapLabel",
        _gap_label(GapLevel(current.gapLevel)),
    )

    return (
        "Owner Report\n\n"
        "Состояние платформы\n\n"
        f"{status_label}\n\n"
        "Оценка\n\n"
        f"{current.healthScore}%\n\n"
        "Разрыв\n\n"
        f"{gap_label}\n\n"
        "Отклонения\n\n"
        f"Всего: {current.totalDeviations}\n"
        f"Критических: {current.criticalDeviations}\n\n"
        "Краткий вывод\n\n"
        f"{current.summary}\n\n"
        "Следующее действие\n\n"
        f"{current.nextAction}."
    )


def _contains_keyword(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def resolve_owner_report_message(text: str) -> str | None:
    """Keyword-based owner report; aggregates profile, health, reality, deviations."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text or not _contains_keyword(normalized_text, _REPORT_KEYWORDS):
        return None

    return format_owner_report_message(get_owner_report())
