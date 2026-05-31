import app.modules.yasii.developer_readiness  # noqa: F401

from app.modules.yasii.developer_readiness import (
    IMPLEMENTED_CAPABILITIES,
    MISSING_CAPABILITIES,
    ReadinessLevel,
    get_developer_readiness,
    resolve_developer_readiness_message,
)


def test_get_developer_readiness_returns_mvp_assessment():
    readiness = get_developer_readiness()

    assert readiness.level == ReadinessLevel.MVP
    assert readiness.score == 40
    assert readiness.implementedCapabilities == IMPLEMENTED_CAPABILITIES
    assert readiness.missingCapabilities == MISSING_CAPABILITIES
    assert "архитектурный" in readiness.summary


def test_resolve_developer_readiness_message():
    message = resolve_developer_readiness_message(
        "Насколько ты готов помогать разработчику?"
    )

    assert message is not None
    assert "Developer Readiness" in message
    assert "MVP" in message
    assert "40%" in message
    assert "Developer Profile" in message
    assert "Repository Scan" in message
    assert "реальный код" in message


def test_resolve_developer_readiness_message_maturity_question():
    message = resolve_developer_readiness_message("Какой уровень зрелости у ЯСИИ?")

    assert message is not None
    assert "Готовность:" in message


def test_resolve_developer_readiness_message_non_readiness_returns_none():
    assert resolve_developer_readiness_message("Что делает Rule Engine?") is None


def test_readiness_wins_over_profile_for_developer_capabilities_question():
    assert resolve_developer_readiness_message("Что ты умеешь для разработчика?") is not None
