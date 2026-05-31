import app.modules.yasii.owner_language  # noqa: F401

from app.modules.yasii.owner_language import (
    apply_owner_language,
    resolve_owner_language_message,
    resolve_owner_limitations_message,
    resolve_owner_status_message,
    resolve_owner_value_message,
    wants_technical_details,
)


def test_wants_technical_details():
    assert wants_technical_details("Покажи технически") is True
    assert wants_technical_details("Нужны подробности для разработчика") is True
    assert wants_technical_details("Кто ты?") is False


def test_resolve_owner_status_message():
    message = resolve_owner_status_message("Что уже готово?")

    assert message is not None
    assert "Краткий вывод" in message
    assert "Что уже работает" in message
    assert "Что пока отсутствует" in message


def test_resolve_owner_value_message():
    message = resolve_owner_value_message("Чем ЯСИИ уже полезен?")

    assert message is not None
    assert "навигатором" in message
    assert "реальный код" in message


def test_resolve_owner_limitations_message():
    message = resolve_owner_limitations_message("Что пока не работает?")

    assert message is not None
    assert "впереди" in message.lower() or "отсутствует" in message.lower()


def test_apply_owner_language_transforms_architecture_verdict():
    technical = (
        "Architecture Verdict\n\n"
        "Компонент:\nRule Engine\n\n"
        "Объяснение:\n\n"
        "Rule Engine расположен после Evidence Resolver."
    )
    owner = apply_owner_language(technical, "Почему Rule Engine?")

    assert "Architecture Verdict" not in owner
    assert "проверяет их по правилам" in owner
    assert "Evidence Resolver" not in owner


def test_apply_owner_language_keeps_technical_when_requested():
    technical = "Impact Analysis\n\nКомпонент:\nRule Engine"
    assert apply_owner_language(technical, "Покажи технически") == technical


def test_resolve_owner_language_message_priority_over_readiness_overlap():
    status = resolve_owner_language_message("Какие возможности уже есть?")
    assert status is not None
    assert "Краткий вывод" in status
