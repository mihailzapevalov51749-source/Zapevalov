import app.modules.yasii.reality_check  # noqa: F401

from app.modules.yasii.reality_check import (
    GapLevel,
    RealityCheck,
    format_reality_check_message,
    get_reality_check,
    resolve_reality_check_message,
)


def test_get_reality_check_mvp_values():
    check = get_reality_check()

    assert isinstance(check, RealityCheck)
    assert check.gapLevel == GapLevel.MEDIUM
    assert len(check.currentState) == 4
    assert len(check.expectedState) == 4
    assert len(check.findings) == 3
    assert "подключение ЯСИИ" in check.recommendation
    assert check.metadata.get("phase") == "P6-W03"


def test_format_reality_check_message_structure():
    message = format_reality_check_message()

    assert message.startswith("Reality Check")
    assert "Текущее состояние" in message
    assert "Ожидаемое состояние" in message
    assert "Средний" in message
    assert "Основные наблюдения" in message
    assert "Рекомендация" in message
    assert "работает интерфейс ЯСИИ" in message
    assert "работа с данными проекта" in message


def test_resolve_reality_check_message_reality_keyword():
    message = resolve_reality_check_message("Reality check")

    assert message is not None
    assert "Reality Check" in message


def test_resolve_reality_check_message_gap():
    message = resolve_reality_check_message("Есть ли разрыв?")

    assert message is not None
    assert "Средний" in message


def test_resolve_reality_check_message_gap_focus():
    message = resolve_reality_check_message("Где главный пробел?")

    assert message is not None
    assert "к данным проекта" in message
    assert len(message.split("Основные наблюдения")[1].split("•")) <= 4


def test_resolve_reality_check_message_unknown():
    assert resolve_reality_check_message("Привет") is None
