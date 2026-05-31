"""YASII Deviation Registry (P6-W04) — aggregates P6-W02 health + P6-W03 reality gaps."""

from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4

from app.modules.yasii.platform_health_snapshot import (
    PlatformHealthSnapshot,
    get_platform_health_snapshot,
)
from app.modules.yasii.reality_check import RealityCheck, get_reality_check

DEVIATION_REGISTRY_SCHEMA_VERSION = "0.1.0"

_PRIMARY_ATTENTION = "Подключение ЯСИИ к данным проекта."


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


_SEVERITY_LABELS: dict[Severity, str] = {
    Severity.LOW: "Низкая",
    Severity.MEDIUM: "Средняя",
    Severity.HIGH: "Высокая",
}

_REGISTRY_KEYWORDS = (
    "какие отклонения есть",
    "какие отклонения",
    "покажи реестр отклонений",
    "реестр отклонений",
    "deviation registry",
    "что мешает достижению цели",
    "мешает достижению цели",
    "какие проблемы сейчас самые важные",
    "какие проблемы наиболее критичны",
    "самые важные проблемы",
    "что требует внимания",
)


@dataclass
class DeviationRecord:
    deviationId: str
    title: str
    expectedState: str
    currentState: str
    severity: Severity
    recommendation: str


@dataclass
class DeviationRegistry:
    schemaVersion: str = DEVIATION_REGISTRY_SCHEMA_VERSION
    registryId: str = field(default_factory=lambda: f"deviation-registry-{uuid4()}")
    deviations: list[DeviationRecord] = field(default_factory=list)
    totalCount: int = 0
    criticalCount: int = 0
    metadata: dict[str, str] = field(default_factory=dict)


def _health_has_attention(health: PlatformHealthSnapshot, *needles: str) -> bool:
    joined = " ".join(health.attentionAreas).lower()
    return any(needle.lower() in joined for needle in needles)


def _reality_expects(reality: RealityCheck, expected_label: str) -> bool:
    return expected_label in reality.expectedState


def _reality_finding_mentions(reality: RealityCheck, *needles: str) -> bool:
    joined = " ".join(reality.findings).lower()
    return any(needle.lower() in joined for needle in needles)


def _build_deviation_records(
    health: PlatformHealthSnapshot,
    reality: RealityCheck,
) -> list[DeviationRecord]:
    """Derive owner deviations from health attention areas and reality gap analysis."""
    records: list[DeviationRecord] = []
    data_recommendation = (
        "Подключить ЯСИИ к реальным данным проекта — см. Reality Check и Health Snapshot."
    )

    if _reality_expects(reality, "Работа с реальными данными проекта") and (
        _health_has_attention(health, "репозитор", "код")
        or _reality_finding_mentions(reality, "данн")
    ):
        records.append(
            DeviationRecord(
                deviationId=f"deviation-{uuid4()}",
                title="Нет подключения к данным проекта",
                expectedState="ЯСИИ работает с данными проекта",
                currentState="ЯСИИ работает в демонстрационном режиме",
                severity=Severity.HIGH,
                recommendation=data_recommendation,
            ),
        )

    if _reality_expects(reality, "Контроль рисков") and _health_has_attention(
        health,
        "риск",
    ):
        records.append(
            DeviationRecord(
                deviationId=f"deviation-{uuid4()}",
                title="Нет контроля рисков проекта",
                expectedState="ЯСИИ показывает риски проекта",
                currentState="Риски не анализируются",
                severity=Severity.MEDIUM,
                recommendation=(
                    "Включить контроль рисков после подключения данных проекта "
                    f"(health: {health.snapshotId})."
                ),
            ),
        )

    if _reality_expects(reality, "Статус проекта") and _health_has_attention(
        health,
        "статус",
        "задач",
    ):
        records.append(
            DeviationRecord(
                deviationId=f"deviation-{uuid4()}",
                title="Нет статуса задач проекта",
                expectedState="ЯСИИ знает статус задач",
                currentState="Статусы не подключены",
                severity=Severity.MEDIUM,
                recommendation=(
                    "Подключить статусы задач из платформы "
                    f"(reality gap: {reality.gapLevel.value})."
                ),
            ),
        )

    return records


def get_deviation_registry() -> DeviationRegistry:
    health = get_platform_health_snapshot()
    reality = get_reality_check()
    deviations = _build_deviation_records(health, reality)
    critical_count = sum(1 for item in deviations if item.severity == Severity.HIGH)

    return DeviationRegistry(
        deviations=deviations,
        totalCount=len(deviations),
        criticalCount=critical_count,
        metadata={
            "phase": "P6-W04",
            "healthSnapshotId": health.snapshotId,
            "realityCheckId": reality.checkId,
            "healthOverallStatus": health.overallStatus.value,
            "realityGapLevel": reality.gapLevel.value,
            "sources": "P6-W02,P6-W03",
            "primaryAttention": _PRIMARY_ATTENTION,
        },
    )


def _severity_label(severity: Severity) -> str:
    return _SEVERITY_LABELS[severity]


def format_deviation_registry_message(registry: DeviationRegistry | None = None) -> str:
    current = registry or get_deviation_registry()
    lines = [
        "Deviation Registry",
        "",
        "Всего отклонений",
        "",
        str(current.totalCount),
        "",
        "Критических",
        "",
        str(current.criticalCount),
        "",
        "Основные отклонения",
        "",
    ]

    for index, deviation in enumerate(current.deviations, start=1):
        lines.append(f"{index}. {deviation.title}")
        lines.append(f"Критичность: {_severity_label(deviation.severity)}")
        lines.append("")

    lines.extend(
        [
            "Главное внимание",
            "",
            current.metadata.get("primaryAttention", _PRIMARY_ATTENTION),
        ],
    )
    return "\n".join(lines)


def _contains_keyword(normalized_text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in normalized_text for keyword in keywords)


def resolve_deviation_registry_message(text: str) -> str | None:
    """Keyword-based deviation registry; aggregates health snapshot + reality check."""
    normalized_text = str(text or "").strip().lower()
    if not normalized_text or not _contains_keyword(normalized_text, _REGISTRY_KEYWORDS):
        return None

    return format_deviation_registry_message(get_deviation_registry())
