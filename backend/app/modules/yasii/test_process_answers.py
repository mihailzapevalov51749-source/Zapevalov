from app.modules.yasii.process_context_answers import (
    resolve_process_context_message,
    resolve_process_surface_fallback,
)


def _process_payload(**overrides):
    payload = {
        "embedded": True,
        "hostSurface": "process",
        "surfaceId": "process",
        "processId": "wf-42",
        "processName": "Согласование документации",
        "processStatus": "in_progress",
        "activeStepId": "step-review",
        "activeStepName": "Проверка документации",
        "processMetadata": {
            "processName": "Согласование документации",
            "activeStepName": "Проверка документации",
            "processStatus": "in_progress",
        },
    }
    payload.update(overrides)
    return payload


def test_process_open_question():
    message = resolve_process_context_message(
        "Что сейчас открыто?",
        _process_payload(),
    )
    assert message is not None
    assert "Сейчас открыт процесс" in message
    assert "Согласование документации" in message


def test_process_step_question():
    message = resolve_process_context_message(
        "На каком этапе я нахожусь?",
        _process_payload(),
    )
    assert message is not None
    assert "Текущий этап" in message
    assert "Проверка документации" in message


def test_process_active_step_question():
    message = resolve_process_context_message(
        "Что сейчас выполняется?",
        _process_payload(),
    )
    assert message is not None
    assert "Активный шаг" in message


def test_process_integration_ready_without_instance():
    message = resolve_process_context_message(
        "Что сейчас открыто?",
        _process_payload(
            processId="",
            processName="",
            processMetadata={"integrationReady": "true"},
        ),
    )
    assert message is not None
    assert "интеграция" in message.lower()


def test_process_surface_fallback():
    message = resolve_process_surface_fallback(_process_payload())
    assert message is not None
    assert "YASII runtime pipeline is available" not in message
