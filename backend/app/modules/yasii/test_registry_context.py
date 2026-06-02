from app.modules.ai_context.handoff import clear_handoff_registry
from app.modules.ai_context.handoff_service import build_handoff_from_host_context
from app.modules.ai_context.host_context import HostContext
from app.modules.yasii.contracts import YASIIEmbeddedQueryRequest
from app.modules.yasii.runtime_orchestrator import orchestrate_embedded_request


def setup_function():
    clear_handoff_registry()


def _registry_host_context() -> HostContext:
    return HostContext(
        hostSurface="registry",
        tenantId="tenant-1",
        userId="user-1",
        sessionId="session-1",
        timestamp="2026-06-01T12:00:00Z",
        registryId="projects",
        registryName="Проекты",
        viewId="default_table",
        viewName="Таблица",
        selectedCount="0",
        activeFilters="Статус равно В работе",
        activeSorts="Дата создания DESC",
        searchQuery="",
        selectedScope="registry:projects:default_table",
        widgetId="registry-projects-default_table",
        metadata={
            "recordCount": "245",
            "visibleColumns": "Название|Статус|Дата создания",
        },
    )


def test_registry_handoff_keeps_registry_context():
    handoff = build_handoff_from_host_context(_registry_host_context())

    assert handoff.hostSurface == "registry"
    assert handoff.registryId == "projects"
    assert handoff.registryName == "Проекты"
    assert handoff.viewName == "Таблица"
    assert handoff.activeFilters == "Статус равно В работе"
    assert handoff.metadata.get("recordCount") == "245"


def test_registry_embedded_query_returns_what_is_answer():
    handoff = build_handoff_from_host_context(_registry_host_context())

    response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Что это?",
        ),
    )

    assert response.status == "ok"
    assert response.payload["demo"] is False
    assert "реестр объекта" in response.payload["message"]
    assert "табличном представлении" in response.payload["message"]


def test_registry_embedded_query_returns_registry_aware_answer():
    handoff = build_handoff_from_host_context(_registry_host_context())

    response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Что сейчас открыто?",
        ),
    )

    assert response.status == "ok"
    assert response.payload["demo"] is False
    assert "Проекты" in response.payload["message"]
    assert "245" in response.payload["message"]
    assert "Статус" in response.payload["message"]


def test_registry_embedded_query_reports_active_filters():
    handoff = build_handoff_from_host_context(_registry_host_context())

    response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Какие фильтры активны?",
        ),
    )

    assert response.status == "ok"
    assert "В работе" in response.payload["message"]
