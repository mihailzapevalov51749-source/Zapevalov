import tempfile
from pathlib import Path

import pytest

from app.modules.ai_context.handoff import clear_handoff_registry
from app.modules.ai_context.handoff_service import build_handoff_from_host_context
from app.modules.ai_context.host_context import HostContext
from app.modules.yasii.contracts import YASIIEmbeddedQueryRequest, YASIIRequest
from app.modules.yasii.memory import MemoryContext, load_tenant_memory, save_tenant_memory
from app.modules.yasii.memory import MemoryEntry
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.runtime_orchestrator import orchestrate_embedded_request
from app.modules.yasii.tenant_memory_store import (
    TENANT_MEMORY_ENTRY_TYPE,
    clear_tenant_memory_store,
    delete_tenant_memory_facts,
    list_tenant_memory_facts,
    save_tenant_memory_fact,
    set_tenant_memory_data_dir,
)
from app.modules.yasii.tenant_memory_answers import (
    TENANT_MEMORY_DELETED_MESSAGE,
    TENANT_MEMORY_SAVED_MESSAGE,
    resolve_tenant_memory_message,
)
from app.modules.yasii.user_memory_store import (
    clear_user_memory_store,
    list_user_memory_facts,
    set_user_memory_data_dir,
)
from app.modules.yasii.user_memory_answers import resolve_user_memory_message


@pytest.fixture(autouse=True)
def isolated_memory_stores(tmp_path: Path):
    tenant_dir = tmp_path / "tenant"
    user_dir = tmp_path / "user"
    tenant_dir.mkdir()
    user_dir.mkdir()
    set_tenant_memory_data_dir(tenant_dir)
    set_user_memory_data_dir(user_dir)
    clear_tenant_memory_store()
    clear_user_memory_store()
    clear_handoff_registry()
    yield
    clear_tenant_memory_store()
    clear_user_memory_store()
    set_tenant_memory_data_dir(None)
    set_user_memory_data_dir(None)


def test_save_list_delete_tenant_memory_roundtrip():
    save_tenant_memory_fact(
        "tenant-a",
        "СДС означает Служба дирекции строительства.",
    )

    facts = list_tenant_memory_facts("tenant-a")
    assert len(facts) == 1
    assert "СДС" in facts[0].text

    removed = delete_tenant_memory_facts(
        "tenant-a",
        "СДС означает Служба дирекции строительства.",
    )
    assert len(removed) == 1
    assert list_tenant_memory_facts("tenant-a") == []


def test_tenant_memory_isolation_between_tenants():
    save_tenant_memory_fact("tenant-a", "СДС означает Служба дирекции строительства.")
    save_tenant_memory_fact("tenant-b", "СДС означает Другая служба.")

    facts_a = list_tenant_memory_facts("tenant-a")
    facts_b = list_tenant_memory_facts("tenant-b")

    assert len(facts_a) == 1
    assert len(facts_b) == 1
    assert "дирекции строительства" in facts_a[0].text
    assert "Другая служба" in facts_b[0].text


def test_tenant_memory_persists_to_disk(tmp_path: Path):
    tenant_dir = tmp_path / "tenant-persist"
    tenant_dir.mkdir()
    set_tenant_memory_data_dir(tenant_dir)
    save_tenant_memory_fact("tenant-1", "Миссия: строить цифровые порталы.")

    files = list(tenant_dir.glob("*.json"))
    assert len(files) == 1

    set_tenant_memory_data_dir(tenant_dir)
    reloaded = list_tenant_memory_facts("tenant-1")
    assert len(reloaded) == 1
    assert "Миссия" in reloaded[0].text


def test_memory_layer_tenant_save_and_load():
    context = MemoryContext(tenantId="tenant-1")
    assert save_tenant_memory(
        context,
        MemoryEntry(
            entryId="entry-tenant",
            entryType=TENANT_MEMORY_ENTRY_TYPE,
            text="СДС означает Служба дирекции строительства.",
        ),
    )

    snapshot = load_tenant_memory(context)
    assert len(snapshot.entries) == 1
    assert "СДС" in snapshot.entries[0].text


def test_resolve_tenant_memory_commands():
    payload = {"tenantId": "tenant-1", "userId": "user-1"}

    save_message = resolve_tenant_memory_message(
        "Запомни для компании: СДС означает Служба дирекции строительства.",
        payload,
    )
    assert save_message == TENANT_MEMORY_SAVED_MESSAGE

    list_message = resolve_tenant_memory_message("Что ты знаешь о компании?", payload)
    assert "СДС" in list_message

    lookup_message = resolve_tenant_memory_message("Что означает СДС?", payload)
    assert "Служба дирекции строительства" in lookup_message

    delete_message = resolve_tenant_memory_message(
        "Забудь для компании: СДС означает Служба дирекции строительства.",
        payload,
    )
    assert delete_message == TENANT_MEMORY_DELETED_MESSAGE


def test_user_memory_ignores_tenant_commands():
    payload = {"tenantId": "tenant-1", "userId": "user-1"}

    assert (
        resolve_user_memory_message(
            "Запомни для компании: СДС означает Служба дирекции строительства.",
            payload,
        )
        is None
    )


def test_run_demo_pipeline_tenant_before_user_priority():
    tenant_payload = {
        "text": "Запомни для компании: СДС означает Служба дирекции строительства.",
        "tenantId": "tenant-1",
        "userId": "user-1",
    }
    save_response = run_demo_pipeline(
        YASIIRequest(requestId="tenant-demo-001", payload=tenant_payload),
    )
    assert save_response.payload["message"] == TENANT_MEMORY_SAVED_MESSAGE
    assert "tenant_memory_saved" in save_response.payload["trace"]

    user_payload = {
        "text": "Запомни, что меня зовут Михаил.",
        "tenantId": "tenant-1",
        "userId": "user-1",
    }
    user_save = run_demo_pipeline(
        YASIIRequest(requestId="tenant-demo-002", payload=user_payload),
    )
    assert "сохранена в памяти." in user_save.payload["message"]
    assert "компании" not in user_save.payload["message"]

    recall = run_demo_pipeline(
        YASIIRequest(
            requestId="tenant-demo-003",
            payload={
                "text": "Что ты знаешь о компании?",
                "tenantId": "tenant-1",
                "userId": "user-1",
            },
        ),
    )
    assert "СДС" in recall.payload["message"]

    user_recall = run_demo_pipeline(
        YASIIRequest(
            requestId="tenant-demo-004",
            payload={
                "text": "Что ты обо мне помнишь?",
                "tenantId": "tenant-1",
                "userId": "user-1",
            },
        ),
    )
    assert "Михаил" in user_recall.payload["message"]
    assert list_user_memory_facts("tenant-1", "user-1")
    assert list_tenant_memory_facts("tenant-1")


def test_embedded_runtime_tenant_memory_shared_across_users():
    handoff_user_a = build_handoff_from_host_context(
        HostContext(
            hostSurface="dashboard",
            tenantId="tenant-shared",
            userId="user-a",
            sessionId="session-a",
            timestamp="2026-06-01T12:00:00Z",
            dashboardId="platform-dashboard",
        ),
    )
    save_response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff_user_a.handoffId,
            queryText="Запомни для компании: СДС означает Служба дирекции строительства.",
        ),
    )
    assert save_response.payload["message"] == TENANT_MEMORY_SAVED_MESSAGE

    handoff_user_b = build_handoff_from_host_context(
        HostContext(
            hostSurface="dashboard",
            tenantId="tenant-shared",
            userId="user-b",
            sessionId="session-b",
            timestamp="2026-06-01T12:05:00Z",
            dashboardId="platform-dashboard",
        ),
    )
    lookup_response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff_user_b.handoffId,
            queryText="Что означает СДС?",
        ),
    )
    assert "Служба дирекции строительства" in lookup_response.payload["message"]
