import app.modules.yasii.platform_health_snapshot  # noqa: F401

from app.modules.yasii.platform_health_snapshot import (
    MVP_HEALTH_SCORE,
    PlatformHealthSnapshot,
    PlatformStatus,
    format_platform_health_snapshot_message,
    get_platform_health_snapshot,
    resolve_platform_health_snapshot_message,
)


def test_get_platform_health_snapshot_mvp_values():
    snapshot = get_platform_health_snapshot()

    assert isinstance(snapshot, PlatformHealthSnapshot)
    assert snapshot.overallStatus == PlatformStatus.STABLE
    assert snapshot.healthScore == MVP_HEALTH_SCORE
    assert snapshot.healthScore == 55
    assert len(snapshot.strengths) == 5
    assert len(snapshot.attentionAreas) == 4
    assert "стабильном состоянии" in snapshot.recommendation
    assert snapshot.metadata.get("phase") == "P6-W02"


def test_format_platform_health_snapshot_message_structure():
    message = format_platform_health_snapshot_message()

    assert message.startswith("Platform Health Snapshot")
    assert "Стабильное" in message
    assert "55%" in message
    assert "Сильные стороны" in message
    assert "Требует внимания" in message
    assert "Рекомендация" in message
    assert "работает интерфейс ЯСИИ" in message
    assert "отсутствует анализ реального кода" in message


def test_resolve_platform_health_snapshot_message_state():
    message = resolve_platform_health_snapshot_message("Каково состояние платформы?")

    assert message is not None
    assert "Platform Health Snapshot" in message


def test_resolve_platform_health_snapshot_message_health_ok():
    message = resolve_platform_health_snapshot_message("Платформа здорова?")

    assert message is not None
    assert "55%" in message


def test_resolve_platform_health_snapshot_message_progress():
    message = resolve_platform_health_snapshot_message("Можно ли двигаться дальше?")

    assert message is not None
    assert "готова к следующему этапу" in message


def test_resolve_platform_health_snapshot_message_unknown():
    assert resolve_platform_health_snapshot_message("Привет") is None
