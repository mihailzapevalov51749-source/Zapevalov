import app.modules.yasii.deviation_registry  # noqa: F401

from app.modules.yasii.deviation_registry import (
    DeviationRegistry,
    Severity,
    format_deviation_registry_message,
    get_deviation_registry,
    resolve_deviation_registry_message,
)


def test_get_deviation_registry_mvp_counts():
    registry = get_deviation_registry()

    assert isinstance(registry, DeviationRegistry)
    assert registry.totalCount == 3
    assert registry.criticalCount == 1
    assert len(registry.deviations) == 3
    assert registry.metadata.get("phase") == "P6-W04"
    assert registry.metadata.get("sources") == "P6-W02,P6-W03"
    assert registry.metadata.get("healthSnapshotId")
    assert registry.metadata.get("realityCheckId")


def test_get_deviation_registry_uses_health_and_reality_sources():
    registry = get_deviation_registry()

    titles = [item.title for item in registry.deviations]
    assert "Нет подключения к данным проекта" in titles
    assert "Нет контроля рисков проекта" in titles
    assert "Нет статуса задач проекта" in titles

    high = [item for item in registry.deviations if item.severity == Severity.HIGH]
    assert len(high) == 1
    assert high[0].title == "Нет подключения к данным проекта"


def test_format_deviation_registry_message_structure():
    message = format_deviation_registry_message()

    assert message.startswith("Deviation Registry")
    assert "Всего отклонений" in message
    assert "Критических" in message
    assert "1" in message.split("Критических")[1][:20]
    assert "Нет подключения к данным проекта" in message
    assert "Критичность: Высокая" in message
    assert "Главное внимание" in message
    assert "Подключение ЯСИИ к данным проекта" in message


def test_resolve_deviation_registry_message_keywords():
    message = resolve_deviation_registry_message("Покажи реестр отклонений")

    assert message is not None
    assert "Deviation Registry" in message


def test_resolve_deviation_registry_message_attention():
    message = resolve_deviation_registry_message("Что требует внимания?")

    assert message is not None
    assert registry_deviation_count(message) == 3


def test_resolve_deviation_registry_message_unknown():
    assert resolve_deviation_registry_message("Привет") is None


def registry_deviation_count(message: str) -> int:
    block = message.split("Всего отклонений", 1)[1]
    return int(block.strip().split("\n", 1)[0].strip())
