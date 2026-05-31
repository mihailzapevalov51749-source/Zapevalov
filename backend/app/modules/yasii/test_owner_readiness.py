import app.modules.yasii.owner_readiness  # noqa: F401

from app.modules.yasii.owner_readiness import (
    OwnerReadiness,
    OwnerReadinessLevel,
    format_owner_readiness_message,
    get_owner_readiness,
    resolve_owner_readiness_message,
)


def test_get_owner_readiness_mvp_values():
    readiness = get_owner_readiness()

    assert isinstance(readiness, OwnerReadiness)
    assert readiness.readinessLevel == OwnerReadinessLevel.PARTIALLY_READY
    assert readiness.readinessScore == 60
    assert len(readiness.availableCapabilities) == 5
    assert len(readiness.unavailableCapabilities) == 5
    assert "навигации" in readiness.summary
    assert readiness.metadata.get("phase") == "P6-W07"
    assert readiness.metadata.get("sources") == "P6-W02,P6-W03,P6-W04,P6-W05,P6-W06"
    assert readiness.metadata.get("healthSnapshotId")
    assert readiness.metadata.get("realityCheckId")
    assert readiness.metadata.get("deviationRegistryId")
    assert readiness.metadata.get("ownerReportId")
    assert readiness.metadata.get("improvementSuggestionsId")


def test_format_owner_readiness_message_structure():
    message = format_owner_readiness_message()

    assert message.startswith("Owner Readiness")
    assert "Частичная" in message
    assert "60%" in message
    assert "отчёты" in message
    assert "данные проекта" in message
    assert "навигатор проекта" in message


def test_resolve_owner_readiness_message_ready_query():
    message = resolve_owner_readiness_message("Насколько ЯСИИ готов?")

    assert message is not None
    assert "Owner Readiness" in message


def test_resolve_owner_readiness_message_skips_developer_query():
    assert resolve_owner_readiness_message("Насколько ты готов помогать разработчику?") is None


def test_resolve_owner_readiness_message_capabilities():
    message = resolve_owner_readiness_message("Что уже можно делать?")

    assert message is not None
    assert "Уже доступно" in message


def test_resolve_owner_readiness_message_unknown():
    assert resolve_owner_readiness_message("Привет") is None
