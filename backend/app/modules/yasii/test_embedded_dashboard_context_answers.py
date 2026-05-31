"""Tests for dashboard embedded context answers (P7-W08 follow-up)."""

from app.modules.ai_context.handoff import clear_handoff_registry
from app.modules.yasii.dashboard_context_answers import resolve_dashboard_context_message
from app.modules.yasii.runtime_orchestrator import orchestrate_embedded_request
from app.modules.yasii.contracts import YASIIEmbeddedQueryRequest
from app.modules.ai_context.handoff_service import build_handoff_from_host_context
from app.modules.ai_context.host_context import HostContext

GENERIC_EMBEDDED_FALLBACK = "YASII runtime pipeline is available"


def setup_function():
    clear_handoff_registry()


def _dashboard_host(**metadata: str) -> HostContext:
    return HostContext(
        hostSurface="dashboard",
        tenantId="tenant-1",
        userId="user-1",
        sessionId="session-1",
        timestamp="2026-05-31T12:00:00Z",
        dashboardId="platform_dev",
        selectedScope="ai-native-layer",
        widgetId="implementation",
        metadata=metadata,
    )


def test_dashboard_context_resolver_returns_current_work_item():
    payload = {
        "embedded": True,
        "surfaceId": "dashboard",
        "selectedScope": "ai-native-layer",
        "dashboardMetadata": {
            "activePhase": "Phase 7",
            "currentWorkItem": "P7-W08 Embedded Entry Points",
            "completedWorkItems": "P7-W01 Host Contract Implementation|P7-W04 Dashboard Integration",
            "nextWorkItems": "P10-W03 E2E MVP Scenario Tests",
            "readiness": "64%",
        },
    }

    answer = resolve_dashboard_context_message("Какой этап идет?", payload)

    assert answer is not None
    assert "P7-W08 Embedded Entry Points" in answer
    assert "P7-W01 Host Contract Implementation" in answer
    assert "P10-W03 E2E MVP Scenario Tests" in answer
    assert GENERIC_EMBEDDED_FALLBACK not in answer


def test_dashboard_context_resolver_next_work_items():
    payload = {
        "embedded": True,
        "surfaceId": "dashboard",
        "dashboardMetadata": {
            "nextWorkItems": "P10-W03 E2E MVP Scenario Tests|P10-W06 Release Readiness",
        },
    }

    answer = resolve_dashboard_context_message("Что дальше?", payload)

    assert answer is not None
    assert "P10-W03 E2E MVP Scenario Tests" in answer
    assert "P10-W06 Release Readiness" in answer


def test_dashboard_context_honest_fallback_without_metadata():
    payload = {
        "embedded": True,
        "surfaceId": "dashboard",
        "selectedScope": "ai-native-layer",
        "dashboardMetadata": {},
    }

    answer = resolve_dashboard_context_message("Какой этап идет?", payload)

    assert answer is not None
    assert "Platform Dashboard" in answer
    assert "не передаются в HostContext" in answer


def test_embedded_query_uses_dashboard_context_answer():
    handoff = build_handoff_from_host_context(
        _dashboard_host(
            activePhase="Phase 7",
            currentWorkItem="P7-W08 Embedded Entry Points",
            completedWorkItems="P7-W01 Host Contract Implementation",
            nextWorkItems="P10-W03 E2E MVP Scenario Tests",
            readiness="64%",
        ),
    )

    response = orchestrate_embedded_request(
        YASIIEmbeddedQueryRequest(
            handoffId=handoff.handoffId,
            queryText="Какой этап идет?",
        ),
    )

    message = response.payload["message"]
    assert "P7-W08 Embedded Entry Points" in message
    assert message != GENERIC_EMBEDDED_FALLBACK
    assert response.payload["demo"] is False
    assert "audit_recorded" in response.payload["trace"]
