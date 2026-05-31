from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.ai_context.handoff import clear_handoff_registry
from app.modules.ai_context.router import router as ai_context_router
from app.modules.yasii.router import router as yasii_router

app = FastAPI()
app.include_router(ai_context_router)
app.include_router(yasii_router)
client = TestClient(app)


def _host_payload(*, dashboard_id: str = "platform_dev") -> dict:
    return {
        "hostSurface": "dashboard",
        "tenantId": "tenant-1",
        "userId": "user-1",
        "sessionId": "session-1",
        "timestamp": "2026-05-31T12:00:00Z",
        "dashboardId": dashboard_id,
        "selectedScope": "yasii-phase-7",
        "widgetId": "embedded-ai-track",
    }


def setup_function():
    clear_handoff_registry()


def test_ai_context_handoff_endpoint_returns_handoff():
    response = client.post("/ai-context/handoff", json=_host_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["handoffId"].startswith("handoff-")
    assert body["snapshotId"].startswith("snapshot-")
    assert body["boundaryId"].startswith("boundary-")
    assert body["roleIds"] == ["yasii-developer"]
    assert body["warnings"] == []


def test_ai_context_handoff_rejects_missing_mandatory_fields():
    payload = _host_payload()
    payload["tenantId"] = ""

    response = client.post("/ai-context/handoff", json=payload)

    assert response.status_code == 400


def test_embedded_query_requires_handoff_id():
    response = client.post(
        "/yasii/embedded/query",
        json={"handoffId": "", "queryText": "Что происходит?"},
    )

    assert response.status_code == 400


def test_embedded_query_rejects_unknown_handoff():
    response = client.post(
        "/yasii/embedded/query",
        json={"handoffId": "missing-handoff", "queryText": "Что происходит?"},
    )

    assert response.status_code == 403


def test_embedded_query_runs_after_handoff():
    handoff_response = client.post("/ai-context/handoff", json=_host_payload())
    handoff_id = handoff_response.json()["handoffId"]

    response = client.post(
        "/yasii/embedded/query",
        json={"handoffId": handoff_id, "queryText": "Что происходит?"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["requestId"] == f"embedded-{handoff_id}"
    assert body["payload"]["embedded"] is True
    assert body["payload"]["handoffId"] == handoff_id
    assert "audit_recorded" in body["payload"]["trace"]


def test_host_context_to_embedded_query_integration_chain():
    handoff_response = client.post("/ai-context/handoff", json=_host_payload(dashboard_id="owner"))
    assert handoff_response.status_code == 200
    handoff_body = handoff_response.json()
    assert handoff_body["roleIds"] == ["yasii-owner-assistant"]

    query_response = client.post(
        "/yasii/embedded/query",
        json={
            "handoffId": handoff_body["handoffId"],
            "queryText": "Какой статус Phase 7?",
        },
    )

    assert query_response.status_code == 200
    query_body = query_response.json()
    assert query_body["payload"]["roleIds"] == ["yasii-owner-assistant"]
    assert query_body["payload"]["snapshotId"] == handoff_body["snapshotId"]
    assert query_body["payload"]["boundaryId"] == handoff_body["boundaryId"]
