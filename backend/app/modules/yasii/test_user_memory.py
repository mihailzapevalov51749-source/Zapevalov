import tempfile
from pathlib import Path

import pytest

from app.modules.ai_context.handoff import clear_handoff_registry
from app.modules.ai_context.handoff_service import build_handoff_from_host_context
from app.modules.ai_context.host_context import HostContext
from app.modules.yasii.contracts import YASIIEmbeddedQueryRequest
from app.modules.yasii.memory import MemoryContext, load_memory, save_memory
from app.modules.yasii.memory import MemoryEntry
from app.modules.yasii.user_memory_store import (
    USER_MEMORY_ENTRY_TYPE,
    clear_user_memory_store,
    delete_user_memory_facts,
    list_user_memory_facts,
    save_user_memory_fact,
    set_user_memory_data_dir,
)
from app.modules.yasii.runtime_orchestrator import orchestrate_embedded_request
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.contracts import YASIIRequest
from app.modules.yasii.user_memory_answers import (
    MEMORY_DELETED_MESSAGE,
    MEMORY_SAVED_MESSAGE,
    resolve_user_memory_message,
)


@pytest.fixture(autouse=True)
def isolated_user_memory_store(tmp_path: Path):
    set_user_memory_data_dir(tmp_path)
    clear_user_memory_store()
    clear_handoff_registry()
    yield
    clear_user_memory_store()
    set_user_memory_data_dir(None)


def test_save_list_delete_user_memory_roundtrip():
    save_user_memory_fact("tenant-1", "user-1", "меня зовут Михаил")

    facts = list_user_memory_facts("tenant-1", "user-1")
    assert len(facts) == 1
    assert "Михаил" in facts[0].text

    removed = delete_user_memory_facts("tenant-1", "user-1", "меня зовут Михаил")
    assert len(removed) == 1
    assert list_user_memory_facts("tenant-1", "user-1") == []


def test_user_memory_persists_to_disk(tmp_path: Path):
    save_user_memory_fact("tenant-1", "user-42", "предпочитаю тёмную тему")

    files = list(tmp_path.glob("*.json"))
    assert len(files) == 1

    set_user_memory_data_dir(tmp_path)
    reloaded = list_user_memory_facts("tenant-1", "user-42")
    assert len(reloaded) == 1
    assert "тёмную тему" in reloaded[0].text


def test_memory_layer_save_and_load():
    context = MemoryContext(tenantId="tenant-1", userId="user-1")
    assert save_memory(
        context,
        MemoryEntry(
            entryId="entry-1",
            entryType=USER_MEMORY_ENTRY_TYPE,
            text="меня зовут Михаил",
        ),
    )

    snapshot = load_memory(context)
    assert len(snapshot.entries) == 1
    assert snapshot.entries[0].text == "меня зовут Михаил"


def test_resolve_user_memory_commands():
    payload = {"tenantId": "tenant-1", "userId": "user-1"}

    save_message = resolve_user_memory_message("Запомни, что меня зовут Михаил.", payload)
    assert save_message == MEMORY_SAVED_MESSAGE

    list_message = resolve_user_memory_message("Что ты обо мне помнишь?", payload)
    assert "Михаил" in list_message

    delete_message = resolve_user_memory_message("Забудь, что меня зовут Михаил.", payload)
    assert delete_message == MEMORY_DELETED_MESSAGE

    empty_list = resolve_user_memory_message("Что ты обо мне помнишь?", payload)
    assert "не сохранил" in empty_list


def test_run_demo_pipeline_user_memory_commands():
    response = run_demo_pipeline(
        YASIIRequest(
            requestId="memory-demo-001",
            payload={
                "text": "Запомни, что меня зовут Михаил.",
                "tenantId": "tenant-1",
                "userId": "user-1",
            },
        ),
    )

    assert response.payload["message"] == MEMORY_SAVED_MESSAGE
    assert "memory_loaded" in response.payload["trace"]
    assert "memory_saved" in response.payload["trace"]

    recall = run_demo_pipeline(
        YASIIRequest(
            requestId="memory-demo-002",
            payload={
                "text": "Что ты обо мне помнишь?",
                "tenantId": "tenant-1",
                "userId": "user-1",
            },
        ),
    )
    assert "Михаил" in recall.payload["message"]


def test_embedded_runtime_user_memory_commands():
    handoff = build_handoff_from_host_context(
        HostContext(
            hostSurface="dashboard",
            tenantId="tenant-1",
            userId="user-embedded",
            sessionId="session-embedded",
            timestamp="2026-06-01T12:00:00Z",
            dashboardId="platform-dashboard",
        ),
    )

    save_response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Запомни, что меня зовут Михаил.",
        ),
    )
    assert save_response.payload["message"] == MEMORY_SAVED_MESSAGE

    recall_response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Что ты обо мне помнишь?",
        ),
    )
    assert "Михаил" in recall_response.payload["message"]

    delete_response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Забудь, что меня зовут Михаил.",
        ),
    )
    assert delete_response.payload["message"] == MEMORY_DELETED_MESSAGE
