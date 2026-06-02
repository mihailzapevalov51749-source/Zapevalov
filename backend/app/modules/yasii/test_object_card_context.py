from app.modules.ai_context.handoff import clear_handoff_registry
from app.modules.ai_context.handoff_service import build_handoff_from_host_context
from app.modules.ai_context.host_context import HostContext
from app.modules.yasii.contracts import YASIIEmbeddedQueryRequest
from app.modules.yasii.runtime_orchestrator import orchestrate_embedded_request


def setup_function():
    clear_handoff_registry()


def _object_card_host_context() -> HostContext:
    return HostContext(
        hostSurface="object_card",
        tenantId="tenant-1",
        userId="user-1",
        sessionId="session-1",
        timestamp="2026-05-31T12:00:00Z",
        objectTypeId="contacts",
        objectTypeName="Контрагент",
        objectId="obj-42",
        objectTitle="ООО Ромашка",
        activeTab="Документы",
        selectedScope="object-card:contacts:obj-42:documents",
        widgetId="object-card-documents",
        metadata={
            "objectStatus": "active",
            "objectOwner": "Иван Петров",
            "objectCreatedAt": "2026-05-31T10:00:00Z",
        },
    )


def test_object_card_handoff_keeps_object_context():
    handoff = build_handoff_from_host_context(_object_card_host_context())

    assert handoff.hostSurface == "object_card"
    assert handoff.objectTypeId == "contacts"
    assert handoff.objectTypeName == "Контрагент"
    assert handoff.objectId == "obj-42"
    assert handoff.objectTitle == "ООО Ромашка"
    assert handoff.activeTab == "Документы"
    assert handoff.metadata.get("objectStatus") == "active"


def test_object_card_embedded_query_returns_object_aware_answer():
    handoff = build_handoff_from_host_context(_object_card_host_context())

    response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Какая карточка сейчас открыта?",
        ),
    )

    assert response.status == "ok"
    assert response.payload["demo"] is False
    assert "ООО Ромашка" in response.payload["message"]
    assert "Контрагент" in response.payload["message"]
    assert "Документы" in response.payload["message"]
    assert "audit_recorded" in response.payload["trace"]


def test_object_card_embedded_query_unknown_question_uses_object_fallback():
    handoff = build_handoff_from_host_context(_object_card_host_context())

    response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Какая погода сегодня?",
        ),
    )

    assert response.status == "ok"
    assert response.payload["demo"] is False
    assert "не понял вопрос" in response.payload["message"]
    assert "что это за объект" in response.payload["message"]
    assert "Контрагент" in response.payload["message"]
