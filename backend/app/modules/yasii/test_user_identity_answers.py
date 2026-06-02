import pytest

from app.modules.ai_context.handoff import clear_handoff_registry, get_handoff
from app.modules.ai_context.handoff_service import build_handoff_from_host_context
from app.modules.ai_context.host_context import HostContext
from app.modules.ai_context.user_identity import UserIdentity
from app.modules.yasii.contracts import YASIIEmbeddedQueryRequest, YASIIRequest
from app.modules.yasii.runtime_demo_service import run_demo_pipeline
from app.modules.yasii.runtime_orchestrator import orchestrate_embedded_request
from app.modules.yasii.user_identity_answers import resolve_user_identity_command
from app.modules.yasii.user_memory_store import (
    clear_user_memory_store,
    list_user_memory_facts,
    set_user_memory_data_dir,
)


@pytest.fixture(autouse=True)
def isolated_user_memory(tmp_path):
    set_user_memory_data_dir(tmp_path)
    clear_user_memory_store()
    clear_handoff_registry()
    yield
    clear_user_memory_store()
    set_user_memory_data_dir(None)
    clear_handoff_registry()


def _identity_payload(**extra):
    identity = {
        "userId": "42",
        "displayName": "Михаил Запевалов",
        "firstName": "Михаил",
        "lastName": "Запевалов",
        "email": "mikhail@example.com",
        "position": "Архитектор платформы",
        "department": "Цифровая трансформация",
        "roles": ["platform_architect"],
    }
    return {
        "tenantId": "tenant-1",
        "userId": "42",
        "sessionId": "session-1",
        "userIdentity": identity,
        **extra,
    }


def test_who_am_i_answer():
    result = resolve_user_identity_command("Кто я?", _identity_payload())
    assert result is not None
    assert "Михаил" in result.message
    assert "mikhail@example.com" in result.message
    assert result.identity_answered


def test_name_position_role_email():
    payload = _identity_payload()
    assert "Михаил" in resolve_user_identity_command("Как меня зовут?", payload).message
    assert "Архитектор" in resolve_user_identity_command("Какая у меня должность?", payload).message
    assert "platform_architect" in resolve_user_identity_command("Какая у меня роль?", payload).message
    assert "mikhail@example.com" in resolve_user_identity_command("Какой у меня email?", payload).message


def test_missing_field_message():
    payload = _identity_payload()
    payload["userIdentity"] = {
        "userId": "42",
        "displayName": "Михаил Запевалов",
        "email": "mikhail@example.com",
    }
    result = resolve_user_identity_command("Какая у меня должность?", payload)
    assert "не заполнено" in result.message.lower() or "должность" in result.message.lower()


def test_blocks_other_user_profile():
    result = resolve_user_identity_command("Кто такой Иван Петров?", _identity_payload())
    assert result is not None
    assert "других" in result.message.lower() and "пользовател" in result.message.lower()


def test_identity_not_saved_to_user_memory():
    payload = _identity_payload()
    run_demo_pipeline(
        YASIIRequest(
            requestId="identity-001",
            payload={**payload, "text": "Кто я?"},
        ),
    )
    assert list_user_memory_facts("tenant-1", "42") == []


def test_runtime_trace_and_handoff_wiring():
    host = HostContext(
        hostSurface="dashboard",
        tenantId="tenant-1",
        userId="42",
        sessionId="session-1",
        timestamp="2026-06-01T12:00:00Z",
        userIdentity=UserIdentity(
            userId="42",
            displayName="Михаил Запевалов",
            email="mikhail@example.com",
            position="Архитектор",
            roles=["admin"],
        ),
    )
    handoff = build_handoff_from_host_context(host)
    assert handoff.userIdentity is not None
    assert handoff.userIdentity["email"] == "mikhail@example.com"

    response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(handoffId=handoff.handoffId, queryText="Кто я?"),
    )
    trace = response.payload.get("trace", [])
    assert "user_identity_loaded" in trace
    assert "user_identity_answered" in trace
    assert "Михаил" in response.payload.get("message", "")

    stored = get_handoff(handoff.handoffId)
    assert stored is not None
    assert stored.userIdentity is not None
