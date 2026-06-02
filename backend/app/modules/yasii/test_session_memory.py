import pytest

from app.modules.ai_context.handoff import clear_handoff_registry
from app.modules.ai_context.handoff_service import build_handoff_from_host_context
from app.modules.ai_context.host_context import HostContext
from app.modules.yasii.contracts import YASIIEmbeddedQueryRequest, YASIIRequest
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.runtime_orchestrator import orchestrate_embedded_request
from app.modules.yasii.session_memory_answers import (
    SESSION_MEMORY_CLEARED_MESSAGE,
    resolve_session_memory_message,
)
from app.modules.yasii.session_memory_store import (
    clear_session_memory_store,
    get_session_memory,
    record_session_exchange,
)
from app.modules.yasii.tenant_memory_store import (
    clear_tenant_memory_store,
    list_tenant_memory_facts,
    save_tenant_memory_fact,
    set_tenant_memory_data_dir,
)
from app.modules.yasii.user_memory_store import (
    clear_user_memory_store,
    list_user_memory_facts,
    save_user_memory_fact,
    set_user_memory_data_dir,
)


@pytest.fixture(autouse=True)
def isolated_memory_stores(tmp_path):
    tenant_dir = tmp_path / "tenant"
    user_dir = tmp_path / "user"
    tenant_dir.mkdir()
    user_dir.mkdir()
    set_tenant_memory_data_dir(tenant_dir)
    set_user_memory_data_dir(user_dir)
    clear_session_memory_store()
    clear_tenant_memory_store()
    clear_user_memory_store()
    clear_handoff_registry()
    yield
    clear_session_memory_store()
    clear_tenant_memory_store()
    clear_user_memory_store()
    set_tenant_memory_data_dir(None)
    set_user_memory_data_dir(None)


def _session_payload(**extra):
    return {
        "tenantId": "tenant-1",
        "userId": "user-1",
        "sessionId": "session-1",
        "hostSurface": "dashboard",
        **extra,
    }


def test_session_context_recall_after_multiple_turns():
    payload = _session_payload()

    run_demo_pipeline(
        YASIIRequest(
            requestId="session-001",
            payload={**payload, "text": "Расскажи про Dashboard ЯСИИ."},
        ),
    )
    run_demo_pipeline(
        YASIIRequest(
            requestId="session-002",
            payload={**payload, "text": "Мы решили продолжить Phase 8 Memory Foundation."},
        ),
    )

    recall = resolve_session_memory_message("О чём мы говорили ранее?", payload)
    assert "Dashboard" in recall
    assert "Phase 8" in recall or "решили" in recall.lower() or "Решение" in recall


def test_session_decisions_recall():
    payload = _session_payload()
    record_session_exchange(
        "tenant-1",
        "user-1",
        "session-1",
        user_text="Сегодня мы решили закрыть P8-W01 User Memory.",
        assistant_text="Принято.",
        host_surface="dashboard",
    )

    message = resolve_session_memory_message("Что мы решили сегодня?", payload)
    assert "P8-W01" in message or "решили" in message.lower()


def test_session_summary():
    payload = _session_payload()
    record_session_exchange(
        "tenant-1",
        "user-1",
        "session-1",
        user_text="Обсудили P8-W04 Session Memory.",
        assistant_text="Контекст зафиксирован.",
        host_surface="dashboard",
    )

    message = resolve_session_memory_message("Подведи итог текущей сессии.", payload)
    assert "итог" in message.lower() or "Краткий" in message
    assert "P8-W04" in message or "Session Memory" in message


def test_session_clear():
    payload = _session_payload()
    record_session_exchange(
        "tenant-1",
        "user-1",
        "session-1",
        user_text="Временный контекст.",
        assistant_text="Ок.",
    )

    clear_message = resolve_session_memory_message("Очистить память сессии.", payload)
    assert clear_message == SESSION_MEMORY_CLEARED_MESSAGE
    assert get_session_memory("tenant-1", "user-1", "session-1") is None

    empty_recall = resolve_session_memory_message("О чём мы говорили?", payload)
    assert "нет сохранённого контекста" in empty_recall


def test_session_isolation_by_session_id():
    record_session_exchange(
        "tenant-1",
        "user-1",
        "session-a",
        user_text="Тема сессии A.",
        assistant_text="Ответ A.",
    )
    record_session_exchange(
        "tenant-1",
        "user-1",
        "session-b",
        user_text="Тема сессии B.",
        assistant_text="Ответ B.",
    )

    recall_a = resolve_session_memory_message(
        "Напомни текущий контекст.",
        _session_payload(sessionId="session-a"),
    )
    recall_b = resolve_session_memory_message(
        "Напомни текущий контекст.",
        _session_payload(sessionId="session-b"),
    )

    assert "сессии A" in recall_a or "Тема сессии A" in recall_a
    assert "сессии B" in recall_b or "Тема сессии B" in recall_b
    assert "сессии A" not in recall_b


def test_runtime_wiring_records_turns_and_trace():
    payload = _session_payload()
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="session-runtime-001",
            payload={**payload, "text": "Сейчас работаем над Session Memory."},
        ),
    )

    assert "session_memory_loaded" in response.payload["trace"]
    assert "session_memory_updated" in response.payload["trace"]

    recall = run_demo_pipeline(
        YASIIRequest(
            requestId="session-runtime-002",
            payload={**payload, "text": "Что обсуждали ранее?"},
        ),
    )
    assert "Session Memory" in recall.payload["message"]


def test_session_memory_does_not_use_user_or_tenant_stores():
    save_user_memory_fact("tenant-1", "user-1", "меня зовут Михаил")
    save_tenant_memory_fact("tenant-1", "СДС означает Служба дирекции строительства.")

    payload = _session_payload()
    record_session_exchange(
        "tenant-1",
        "user-1",
        "session-1",
        user_text="Сегодня обсуждаем только session memory.",
        assistant_text="Понял.",
    )

    recall = resolve_session_memory_message("О чём мы сейчас говорим?", payload)
    assert "session memory" in recall.lower()
    assert "Михаил" not in recall
    assert "СДС" not in recall
    assert list_user_memory_facts("tenant-1", "user-1")
    assert list_tenant_memory_facts("tenant-1")


def test_embedded_runtime_passes_session_id():
    handoff = build_handoff_from_host_context(
        HostContext(
            hostSurface="dashboard",
            tenantId="tenant-embedded",
            userId="user-embedded",
            sessionId="session-embedded",
            timestamp="2026-06-01T12:00:00Z",
            dashboardId="platform-dashboard",
        ),
    )

    save_response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Сейчас тестируем embedded session memory.",
        ),
    )
    assert "session_memory_updated" in save_response.payload["trace"]

    recall_response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Что происходит в этой сессии?",
        ),
    )
    assert "session memory" in recall_response.payload["message"].lower()
