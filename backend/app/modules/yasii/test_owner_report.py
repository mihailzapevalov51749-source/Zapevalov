import app.modules.yasii.owner_report  # noqa: F401

from app.modules.yasii.owner_report import (
    OwnerReport,
    format_owner_report_message,
    get_owner_report,
    resolve_owner_report_message,
)
from app.modules.yasii.reality_check import GapLevel
from app.modules.yasii.platform_health_snapshot import PlatformStatus


def test_get_owner_report_aggregates_owner_modules():
    report = get_owner_report()

    assert isinstance(report, OwnerReport)
    assert report.overallStatus == PlatformStatus.STABLE.value
    assert report.healthScore == 55
    assert report.gapLevel == GapLevel.MEDIUM.value
    assert report.totalDeviations == 3
    assert report.criticalDeviations == 1
    assert "стабильном состоянии" in report.summary
    assert "3 отклонения" in report.summary or "3 отклонений" in report.summary
    assert "критическ" in report.summary
    assert "Подключить ЯСИИ" in report.nextAction
    assert report.metadata.get("phase") == "P6-W05"
    assert report.metadata.get("sources") == "P6-W01,P6-W02,P6-W03,P6-W04"
    assert report.metadata.get("healthSnapshotId")
    assert report.metadata.get("realityCheckId")
    assert report.metadata.get("deviationRegistryId")
    assert report.metadata.get("ownerProfileId")


def test_format_owner_report_message_structure():
    message = format_owner_report_message()

    assert message.startswith("Owner Report")
    assert "Стабильное" in message
    assert "55%" in message
    assert "Средний" in message
    assert "Всего: 3" in message
    assert "Критических: 1" in message
    assert "Краткий вывод" in message
    assert "Следующее действие" in message


def test_resolve_owner_report_message_keywords():
    message = resolve_owner_report_message("Дай отчёт владельца")

    assert message is not None
    assert "Owner Report" in message


def test_resolve_owner_report_message_summary_query():
    message = resolve_owner_report_message("Какова общая картина?")

    assert message is not None
    assert "Краткий вывод" in message


def test_resolve_owner_report_message_unknown():
    assert resolve_owner_report_message("Привет") is None
