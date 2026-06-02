import pytest

from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.decision_memory_answers import (
    DECISION_EMPTY_MESSAGE,
    DECISION_SAVED_MESSAGE,
    resolve_decision_memory_command,
    resolve_decision_memory_message,
)
from app.modules.yasii.decision_memory_store import (
    DECISION_STATUS_CANCELLED,
    clear_decision_memory_store,
    detect_decision_conflict,
    list_decision_records,
    save_decision_record,
    search_decision_records,
    set_decision_memory_data_dir,
)
from app.modules.yasii.memory import MemoryContext, load_decision_memory
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.session_memory_store import clear_session_memory_store
from app.modules.yasii.tenant_memory_store import (
    clear_tenant_memory_store,
    set_tenant_memory_data_dir,
)
from app.modules.yasii.user_memory_store import (
    clear_user_memory_store,
    set_user_memory_data_dir,
)


@pytest.fixture(autouse=True)
def isolated_decision_store(tmp_path):
    decision_dir = tmp_path / "decision"
    tenant_dir = tmp_path / "tenant"
    user_dir = tmp_path / "user"
    decision_dir.mkdir()
    tenant_dir.mkdir()
    user_dir.mkdir()
    set_decision_memory_data_dir(decision_dir)
    set_tenant_memory_data_dir(tenant_dir)
    set_user_memory_data_dir(user_dir)
    clear_decision_memory_store()
    clear_tenant_memory_store()
    clear_user_memory_store()
    clear_session_memory_store()
    yield
    clear_decision_memory_store()
    clear_tenant_memory_store()
    clear_user_memory_store()
    clear_session_memory_store()
    set_decision_memory_data_dir(None)
    set_tenant_memory_data_dir(None)
    set_user_memory_data_dir(None)


def _payload(**extra):
    return {
        "tenantId": "tenant-1",
        "userId": "user-1",
        "sessionId": "session-1",
        **extra,
    }


def test_save_and_list_decisions():
    payload = _payload()
    save_message = resolve_decision_memory_message(
        "Запомни решение: Мы решили использовать один ЯСИИ на всю платформу.",
        payload,
    )
    assert save_message == DECISION_SAVED_MESSAGE

    list_message = resolve_decision_memory_message("Какие решения мы приняли?", payload)
    assert "один ЯСИИ" in list_message or "один ясии" in list_message.lower()


def test_search_decision_by_topic():
    save_decision_record(
        "tenant-1",
        "Мы решили использовать HostContext для embedded ЯСИИ.",
    )

    message = resolve_decision_memory_message("Есть ли решение по HostContext?", _payload())
    assert "HostContext" in message


def test_deactivate_decision_changes_status():
    save_decision_record(
        "tenant-1",
        "Мы решили реализовать Workspace Mode.",
    )

    result = resolve_decision_memory_command(
        "Отмени решение: Workspace Mode.",
        _payload(),
    )
    assert result is not None
    assert result.decision_updated is True
    assert resolve_decision_memory_message("Какие решения мы приняли?", _payload()) == DECISION_EMPTY_MESSAGE

    records = list_decision_records("tenant-1", active_only=False)
    assert len(records) == 1
    assert records[0].status == DECISION_STATUS_CANCELLED


def test_conflict_detection():
    save_decision_record(
        "tenant-1",
        "Мы решили использовать один ЯСИИ на всю платформу.",
    )

    conflict = detect_decision_conflict(
        "tenant-1",
        "Создадим отдельный Dashboard YASII.",
    )
    assert conflict is not None
    assert "противоречит" in conflict


def test_runtime_wiring_priority_and_trace():
    payload = _payload()
    run_demo_pipeline(
        YASIIRequest(
            requestId="decision-save",
            payload={
                **payload,
                "text": "Запомни решение: Мы решили использовать один ЯСИИ на всю платформу.",
            },
        ),
    )

    response = run_demo_pipeline(
        YASIIRequest(
            requestId="decision-conflict",
            payload={**payload, "text": "Создадим Dashboard YASII."},
        ),
    )

    trace = response.payload.get("trace", [])
    assert "strategy_conflict_detected" in trace
    assert "противоречит" in response.payload.get("message", "").lower()


def test_decision_memory_snapshot_in_memory_layer():
    save_decision_record("tenant-1", "Мы решили использовать ACE handoff.")

    snapshot = load_decision_memory(
        MemoryContext(tenantId="tenant-1", userId="user-1", sessionId="session-1"),
    )
    assert snapshot.entries
    assert "ACE" in snapshot.entries[0].text


def test_decision_priority_over_tenant_memory_commands():
    from app.modules.yasii.tenant_memory_answers import resolve_tenant_memory_message

    payload = _payload()
    resolve_decision_memory_message(
        "Запомни решение: Мы решили использовать единый runtime pipeline.",
        payload,
    )

    tenant_message = resolve_tenant_memory_message(
        "Запомни решение: Мы решили использовать единый runtime pipeline.",
        payload,
    )
    assert tenant_message is None


def test_search_returns_matches():
    save_decision_record("tenant-1", "Мы решили использовать один ЯСИИ на всю платформу.")
    save_decision_record("tenant-1", "Мы решили использовать HostContext.")

    host_matches = search_decision_records("tenant-1", "hostcontext")
    assert len(host_matches) == 1
    assert "HostContext" in host_matches[0].decisionText

    yasii_matches = search_decision_records("tenant-1", "ясии")
    assert len(yasii_matches) >= 1
